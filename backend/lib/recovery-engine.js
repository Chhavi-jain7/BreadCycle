const { prisma } = require('./prisma');
const { evaluateFssaiCompliance } = require('./fssai');
const { rankRecipientsForDonation } = require('./matching-engine');
const {
  generatePickupCode,
  pickupCodeHash,
  encryptPickupCode,
} = require('./auth-helpers');
const fs = require('fs');
const os = require('os');
const path = require('path');

function getPickupSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) return process.env.SESSION_SECRET;
  const secret = fs.readFileSync(path.join(os.homedir(), '.breadcycle-session-secret'), 'utf8').trim();
  if (secret.length < 32) throw new Error('Stored BreadCycle pickup secret is invalid.');
  return secret;
}

async function executeFailedPickupRecovery(reservationId, reason = 'MISSED_DEADLINE', operatorUserId) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      donation: {
        include: {
          restaurantUser: true,
        },
      },
      user: true,
    },
  });

  if (!reservation) {
    throw new Error(`Reservation ${reservationId} not found`);
  }

  const now = new Date();
  if (reservation.status !== 'PENDING' || reservation.expiresAt > now) {
    throw new Error('Only a pending reservation that has actually expired can be recovered.');
  }

  const donation = reservation.donation;
  const quantityToRecover = reservation.reservedQuantity;

  // FSSAI check
  const safetyCheck = evaluateFssaiCompliance(
    {
      category: donation.category,
      storageType: donation.storageType,
      prepTime: donation.prepTime,
      pickupDeadline: donation.pickupDeadline,
      expiryTime: donation.expiryTime,
      adminBlocked: donation.safetyStatus === 'BLOCKED',
    },
    now
  );

  let isSafe = safetyCheck.isSafe && donation.safetyStatus === 'SAFE';
  let safetyReason = safetyCheck.reasons.join('; ');

  // Candidate recipients
  const candidateUsers = await prisma.user.findMany({
    where: {
      id: { not: reservation.userId },
      role: { in: ['NGO', 'INDIVIDUAL'] },
    },
    include: {
      ngo: true,
    },
  });

  const candidatesFormatted = candidateUsers
    .filter((u) => u.latitude !== null && u.longitude !== null)
    .map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      latitude: u.latitude,
      longitude: u.longitude,
      reliabilityScore: u.reliabilityScore,
      capacityMeals: u.ngo?.capacityMeals,
      serviceRadiusKm: u.ngo?.serviceRadiusKm,
      verificationStatus: u.ngo?.verificationStatus,
    }));

  const rankedMatches = isSafe
    ? rankRecipientsForDonation(
        candidatesFormatted,
        {
          id: donation.id,
          title: donation.title,
          remainingQuantity: quantityToRecover,
          unit: donation.unit,
          latitude: donation.latitude,
          longitude: donation.longitude,
          pickupDeadline: donation.pickupDeadline,
          expiryTime: donation.expiryTime,
          safetyStatus: donation.safetyStatus,
          category: donation.category,
        },
        now
      )
    : [];

  const bestCandidate = rankedMatches.find(({ recipient }) =>
    recipient.role === 'NGO'
      ? recipient.verificationStatus === 'VERIFIED' && (recipient.capacityMeals || 0) >= quantityToRecover
      : quantityToRecover <= 6
  ) || null;

  // Transaction
  const txResult = await prisma.$transaction(async (tx) => {
    const processed = await tx.reservation.updateMany({
      where: { id: reservationId, status: 'PENDING', expiresAt: { lte: now } },
      data: { status: 'RECOVERED' },
    });
    if (processed.count !== 1) throw new Error('Reservation recovery was already processed.');

    if (reservation.user.reliabilityScore > 20) {
      await tx.user.update({
        where: { id: reservation.userId },
        data: {
          reliabilityScore: Math.max(10, reservation.user.reliabilityScore - 5.0),
        },
      });
    }

    if (isSafe) {
      const currentDonation = await tx.donation.findUnique({ where: { id: donation.id } });
      if (!currentDonation || currentDonation.safetyStatus !== 'SAFE') {
        throw new Error('Food is no longer eligible for recovery.');
      }
      const pickupCode = bestCandidate ? generatePickupCode() : null;
      const pickupSecret = pickupCode ? getPickupSecret() : null;
      const newReservationExpiry = bestCandidate
        ? new Date(Math.min(now.getTime() + 90 * 60 * 1000, donation.pickupDeadline.getTime(), donation.expiryTime.getTime()))
        : null;
      let allocatedReservation = null;
      if (bestCandidate && pickupCode && pickupSecret && newReservationExpiry > now) {
        allocatedReservation = await tx.reservation.create({
          data: {
            donationId: donation.id,
            userId: bestCandidate.recipient.id,
            reservedQuantity: quantityToRecover,
            pickupCode: pickupCodeHash(pickupCode, pickupSecret),
            pickupCodeEncrypted: encryptPickupCode(pickupCode, pickupSecret),
            status: 'PENDING',
            claimType: bestCandidate.recipient.role === 'NGO' ? 'NGO_BULK' : 'INDIVIDUAL',
            expiresAt: newReservationExpiry,
          },
        });
        if (bestCandidate.recipient.role === 'NGO') {
          await tx.pickupTask.create({
            data: {
              reservationId: allocatedReservation.id,
              status: 'UNASSIGNED',
              notes: `Recovery allocation of ${quantityToRecover} ${donation.unit}.`,
            },
          });
        }
      }
      const allocatedQuantity = allocatedReservation ? quantityToRecover : 0;
      const newRemainingQuantity = currentDonation.remainingQuantity + quantityToRecover - allocatedQuantity;
      const updatedDonation = await tx.donation.update({
        where: { id: donation.id },
        data: {
          remainingQuantity: { increment: quantityToRecover - allocatedQuantity },
          status: newRemainingQuantity > 0 ? 'AVAILABLE' : 'RESERVED',
          version: { increment: 1 },
        },
      });

      const recoveryEvent = await tx.recoveryEvent.create({
        data: {
          donationId: donation.id,
          originalReservationId: reservation.id,
          recoveredQuantity: quantityToRecover,
          previousRecipientId: reservation.userId,
          newRecipientId: allocatedReservation ? bestCandidate.recipient.id : null,
          reason,
          status: allocatedReservation ? 'REALLOCATED' : 'TRIGGERED',
          matchingScore: allocatedReservation ? bestCandidate.breakdown.totalScore : null,
          notes: allocatedReservation
            ? `Auto-matched to ${bestCandidate.recipient.name} with score ${bestCandidate.breakdown.totalScore}/100. Explanations: ${bestCandidate.breakdown.explanations.join(', ')}`
            : 'Recovered to the open surplus pool. No eligible verified recipient could accept the full quantity within the safe window.',
        },
      });

      await tx.notification.create({
        data: {
          userId: donation.restaurantId,
          title: '🔄 Surplus Food Recovered',
          message: `${quantityToRecover} ${donation.unit} of "${donation.title}" was recovered from a missed pickup and returned to active rescue routing.`,
          type: 'RECOVERY',
        },
      });

      if (allocatedReservation) {
        await tx.notification.create({
          data: {
            userId: bestCandidate.recipient.id,
            title: '⚡ Fast-Track Recovery Opportunity',
            message: `A priority reservation is ready: ${quantityToRecover} ${donation.unit} of "${donation.title}" is reserved for you. View My Pickups for your secure code.`,
            type: 'RECOVERY',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: operatorUserId || reservation.userId,
          action: 'RECOVERY_TRIGGERED',
          entity: 'Reservation',
          entityId: reservation.id,
          detailsJson: JSON.stringify({
            donationId: donation.id,
            recoveredQuantity: quantityToRecover,
            reason,
            safetyChecked: true,
            bestCandidateId: allocatedReservation ? bestCandidate.recipient.id : null,
          }),
        },
      });

      return { recovered: true, updatedDonation, recoveryEvent, allocatedReservation };
    } else {
      await tx.donation.update({
        where: { id: donation.id },
        data: {
          safetyStatus: 'EXPIRED',
          status: 'CANCELLED',
          safetyNotes: `Blocked by safety engine during recovery evaluation: ${safetyReason}`,
        },
      });

      await tx.recoveryEvent.create({
        data: {
          donationId: donation.id,
          originalReservationId: reservation.id,
          recoveredQuantity: quantityToRecover,
          previousRecipientId: reservation.userId,
          newRecipientId: null,
          reason,
          status: 'FAILED_SAFE_WINDOW_PASSED',
          notes: `Food safety threshold exceeded: ${safetyReason}. Surplus retired to prevent unsafe consumption.`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: operatorUserId || null,
          action: 'SAFETY_RECOVERY_REJECTED',
          entity: 'Donation',
          entityId: donation.id,
          detailsJson: JSON.stringify({
            reason: safetyReason,
            quantityDisposed: quantityToRecover,
          }),
        },
      });

      return { recovered: false };
    }
  });

  return {
    success: true,
    reservationId,
    recoveredQuantity: quantityToRecover,
    reason,
    isSafeToRedistribute: isSafe,
    safetyReason: isSafe ? undefined : safetyReason,
    reallocatedToUserId: txResult.allocatedReservation ? bestCandidate.recipient.id : undefined,
    reallocatedToUserName: txResult.allocatedReservation ? bestCandidate.recipient.name : undefined,
    nextBestCandidates: rankedMatches.slice(0, 3).map((m) => ({
      userId: m.recipient.id,
      name: m.recipient.name,
      score: m.breakdown.totalScore,
      explanation: m.breakdown.explanations.join(' • '),
    })),
    message: isSafe
      ? `Successfully recovered ${quantityToRecover} ${donation.unit} and returned it to the eligible rescue pool.`
      : `Recovery inspected: ${safetyReason}. Food retired safely.`,
  };
}

async function runAutomatedRecoveryCheck() {
  const now = new Date();
  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now },
    },
  });

  const results = [];
  for (const res of expiredReservations) {
    try {
      const result = await executeFailedPickupRecovery(res.id, 'MISSED_DEADLINE');
      results.push(result);
    } catch (err) {
      console.error(`Failed to recover reservation ${res.id}:`, err);
    }
  }

  return {
    scanned: expiredReservations.length,
    recoveredCount: results.filter((r) => r.isSafeToRedistribute).length,
    results,
  };
}

module.exports = {
  executeFailedPickupRecovery,
  runAutomatedRecoveryCheck,
};
