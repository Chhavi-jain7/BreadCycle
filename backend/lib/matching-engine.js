/**
 * BreadCycle Smart Matching Engine
 * 
 * Rules-based 5-factor scoring model:
 * - Distance suitability: 30%
 * - Pickup urgency: 25%
 * - Quantity and capacity fit: 20%
 * - Historical pickup reliability: 15%
 * - Estimated arrival-time suitability: 10%
 */

function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function scoreRecipientForDonation(candidate, donation, now = new Date()) {
  const explanations = [];
  const currentTime = now.getTime();
  const deadlineTime = new Date(donation.pickupDeadline).getTime();
  const remainingMinutes = (deadlineTime - currentTime) / (1000 * 60);

  // 1. Hard Eligibility Gates
  if (donation.safetyStatus !== 'SAFE') {
    return {
      distanceScore: 0,
      urgencyScore: 0,
      capacityScore: 0,
      reliabilityScore: 0,
      etaScore: 0,
      totalScore: 0,
      distanceKm: 0,
      etaMinutes: 0,
      eligible: false,
      ineligibilityReason: `Donation is safety-restricted (${donation.safetyStatus}).`,
      explanations: ['Safety gate: Unsafe or unapproved listing.'],
    };
  }

  if (remainingMinutes <= 0) {
    return {
      distanceScore: 0,
      urgencyScore: 0,
      capacityScore: 0,
      reliabilityScore: 0,
      etaScore: 0,
      totalScore: 0,
      distanceKm: 0,
      etaMinutes: 0,
      eligible: false,
      ineligibilityReason: 'Pickup deadline has elapsed.',
      explanations: ['Safe pickup deadline passed.'],
    };
  }

  if (donation.remainingQuantity <= 0) {
    return {
      distanceScore: 0,
      urgencyScore: 0,
      capacityScore: 0,
      reliabilityScore: 0,
      etaScore: 0,
      totalScore: 0,
      distanceKm: 0,
      etaMinutes: 0,
      eligible: false,
      ineligibilityReason: 'No portions remaining.',
      explanations: ['Fully reserved / depleted.'],
    };
  }

  if (candidate.role === 'NGO' && candidate.verificationStatus !== 'VERIFIED') {
    return {
      distanceScore: 0,
      urgencyScore: 0,
      capacityScore: 0,
      reliabilityScore: 0,
      etaScore: 0,
      totalScore: 0,
      distanceKm: 0,
      etaMinutes: 0,
      eligible: false,
      ineligibilityReason: 'NGO verification is pending administrative approval.',
      explanations: ['NGO must be verified by admin before claiming food.'],
    };
  }

  const distanceKm = calculateHaversineDistanceKm(
    candidate.latitude,
    candidate.longitude,
    donation.latitude,
    donation.longitude
  );

  const maxRadiusKm = candidate.serviceRadiusKm || (candidate.role === 'NGO' ? 20.0 : 8.0);
  if (distanceKm > maxRadiusKm) {
    return {
      distanceScore: 0,
      urgencyScore: 0,
      capacityScore: 0,
      reliabilityScore: 0,
      etaScore: 0,
      totalScore: 0,
      distanceKm,
      etaMinutes: 0,
      eligible: false,
      ineligibilityReason: `Recipient is outside service radius (${distanceKm} km > ${maxRadiusKm} km).`,
      explanations: ['Distance exceeds maximum feasible travel boundary.'],
    };
  }

  // 2. Component Scoring (0 - 100)
  // Distance suitability (30%)
  const distanceRatio = Math.min(1, distanceKm / maxRadiusKm);
  const distanceScore = Math.round(Math.max(0, 100 - distanceRatio * 100));
  if (distanceKm <= 2.5) {
    explanations.push(`Nearby: Only ${distanceKm} km away`);
  } else {
    explanations.push(`Distance: ${distanceKm} km from location`);
  }

  // Pickup urgency (25%)
  let urgencyScore = 50;
  if (remainingMinutes <= 45) {
    urgencyScore = 100;
    explanations.push(`Critical urgency: ${Math.round(remainingMinutes)} mins left before expiry`);
  } else if (remainingMinutes <= 90) {
    urgencyScore = 85;
    explanations.push(`High urgency: safe window ends in ${Math.round(remainingMinutes)} mins`);
  } else if (remainingMinutes <= 180) {
    urgencyScore = 70;
    explanations.push(`Moderate urgency (${Math.round(remainingMinutes / 60)} hrs left)`);
  } else {
    urgencyScore = 50;
  }

  // Quantity and capacity fit (20%)
  let capacityScore = 75;
  if (candidate.role === 'NGO') {
    const orgCapacity = candidate.capacityMeals || 50;
    if (orgCapacity >= donation.remainingQuantity) {
      capacityScore = 100;
      explanations.push(`Can collect full batch (${donation.remainingQuantity} ${donation.unit}) in a single run`);
    } else {
      capacityScore = Math.max(30, Math.round((orgCapacity / donation.remainingQuantity) * 100));
      explanations.push(`Partial capacity match (${orgCapacity}/${donation.remainingQuantity} portions)`);
    }
  } else {
    if (donation.remainingQuantity <= 4) {
      capacityScore = 95;
      explanations.push('Ideal individual portion batch size');
    } else if (donation.remainingQuantity <= 15) {
      capacityScore = 75;
    } else {
      capacityScore = 40;
      explanations.push('Large surplus volume: best claimed by community shelter');
    }
  }

  // Reliability (15%)
  const reliability = candidate.reliabilityScore ?? 75.0;
  const reliabilityScore = Math.min(100, Math.max(0, Math.round(reliability)));
  if (reliability >= 90) {
    explanations.push(`Exceptional pickup reliability record (${reliabilityScore}%)`);
  }

  // Arrival ETA (10%)
  const travelMinutes = Math.round((distanceKm / 20) * 60);
  const etaMinutes = travelMinutes + 10;
  let etaScore = 100;
  if (etaMinutes >= remainingMinutes) {
    etaScore = 15;
  } else if (etaMinutes >= remainingMinutes * 0.7) {
    etaScore = 50;
  } else {
    etaScore = 95;
    explanations.push(`Fast response ETA (~${etaMinutes} mins)`);
  }

  const totalScore = Math.round(
    distanceScore * 0.30 +
    urgencyScore * 0.25 +
    capacityScore * 0.20 +
    reliabilityScore * 0.15 +
    etaScore * 0.10
  );

  return {
    distanceScore,
    urgencyScore,
    capacityScore,
    reliabilityScore,
    etaScore,
    totalScore,
    distanceKm,
    etaMinutes,
    eligible: true,
    explanations,
  };
}

function rankRecipientsForDonation(candidates, donation, now = new Date()) {
  const matches = [];

  for (const candidate of candidates) {
    const breakdown = scoreRecipientForDonation(candidate, donation, now);
    if (breakdown.eligible) {
      matches.push({ recipient: candidate, breakdown });
    }
  }

  return matches.sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);
}

module.exports = {
  calculateHaversineDistanceKm,
  scoreRecipientForDonation,
  rankRecipientsForDonation,
};
