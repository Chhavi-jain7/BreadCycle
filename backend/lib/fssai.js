/**
 * BreadCycle handling-window heuristics. These are not official certifications or inspections.
 */

const COMMON_ALLERGENS = [
  'Gluten / Wheat',
  'Dairy / Milk',
  'Peanuts & Tree Nuts',
  'Soybeans',
  'Eggs',
  'Mustard / Sesame',
  'Fish & Shellfish',
];

const STORAGE_TYPES = {
  ROOM_TEMP: {
    label: 'Ambient / Room Temperature (20°C - 25°C)',
    maxCookedWindowHours: 3.0,
    handlingGuidance: 'Cooked food reported at ambient temperature is assigned a short handling window.',
  },
  HOT_HOLDING_60C: {
    label: 'Hot Holding (≥ 60°C)',
    maxCookedWindowHours: 6.0,
    handlingGuidance: 'Hot-held food uses a limited handling window; reported temperatures are not independently verified.',
  },
  CHILLED_4C: {
    label: 'Refrigerated / Chilled (≤ 5°C)',
    maxCookedWindowHours: 24.0,
    handlingGuidance: 'Chilled food uses a limited handling window; reported temperatures are not independently verified.',
  },
};

function evaluateFssaiCompliance(data, currentTime = new Date()) {
  const reasons = [];
  const recommendations = [];

  if (data.adminBlocked) {
    return {
      isSafe: false,
      status: 'BLOCKED',
      reasons: ['Listing has been administratively blocked due to safety concerns.'],
      maxSafeDistributionTimeHours: 0,
      remainingSafeMinutes: 0,
      recommendations: ['Requires safety inspector or administrator review before unblocking.'],
    };
  }

  const prep = new Date(data.prepTime);
  const expiry = new Date(data.expiryTime);
  const deadline = new Date(data.pickupDeadline);
  const now = currentTime.getTime();

  if (!['BAKERY', 'COOKED_MEALS', 'PACKAGED', 'PRODUCE', 'DAIRY'].includes(data.category)) {
    return {
      isSafe: false,
      status: 'FLAGGED',
      reasons: ['A recognized food category was not reported.'],
      maxSafeDistributionTimeHours: 0,
      remainingSafeMinutes: 0,
      recommendations: ['Update the food category before offering this food.'],
    };
  }

  if ([prep, expiry, deadline].some((value) => Number.isNaN(value.getTime())) || prep.getTime() > now ||
      deadline.getTime() <= prep.getTime() || expiry.getTime() < deadline.getTime()) {
    return {
      isSafe: false,
      status: 'FLAGGED',
      reasons: ['Preparation, pickup, or expiry times are missing or inconsistent.'],
      maxSafeDistributionTimeHours: 0,
      remainingSafeMinutes: 0,
      recommendations: ['Review the reported times before making this listing available.'],
    };
  }

  if (!STORAGE_TYPES[data.storageType]) {
    return {
      isSafe: false,
      status: 'FLAGGED',
      reasons: ['A recognized storage condition was not reported.'],
      maxSafeDistributionTimeHours: 0,
      remainingSafeMinutes: 0,
      recommendations: ['Update the storage condition before offering this food.'],
    };
  }

  if (data.category === 'DAIRY' && data.storageType !== 'CHILLED_4C') {
    return {
      isSafe: false,
      status: 'FLAGGED',
      reasons: ['Dairy items require a reported chilled storage condition.'],
      maxSafeDistributionTimeHours: 0,
      remainingSafeMinutes: 0,
      recommendations: ['Keep the item chilled and update its storage information before listing it.'],
    };
  }

  if (expiry.getTime() <= now) {
    return {
      isSafe: false,
      status: 'EXPIRED',
      reasons: ['Food has passed its manufacturer/kitchen consumption expiry time.'],
      maxSafeDistributionTimeHours: 0,
      remainingSafeMinutes: 0,
      recommendations: ['Must be safely composted or discarded under municipal bio-waste guidelines.'],
    };
  }

  if (deadline.getTime() <= now) {
    reasons.push('Current time is past the scheduled pickup deadline.');
  }

  let maxWindowHours = 4.0;
  if (data.category === 'COOKED_MEALS') {
    if (data.storageType === 'HOT_HOLDING_60C') {
      maxWindowHours = 6.0;
    } else if (data.storageType === 'CHILLED_4C') {
      maxWindowHours = 24.0;
    } else {
      maxWindowHours = 3.0; // Ambient
    }

    const elapsedHours = (now - prep.getTime()) / (1000 * 60 * 60);
    if (elapsedHours > maxWindowHours) {
      return {
        isSafe: false,
        status: 'EXPIRED',
        reasons: [
          `Reported handling window exceeded: ${data.storageType} food is beyond the configured ${maxWindowHours}-hour window (elapsed: ${elapsedHours.toFixed(1)} hours).`,
        ],
        maxSafeDistributionTimeHours: maxWindowHours,
        remainingSafeMinutes: 0,
        recommendations: ['Do not redistribute. Safe thermal boundary lapsed.'],
      };
    } else if (maxWindowHours - elapsedHours < 0.75) {
      recommendations.push('Critical safe window: Urgent pickup required within 45 minutes.');
    }
  } else if (data.category === 'BAKERY') {
    maxWindowHours = 24.0;
  } else if (data.category === 'PACKAGED') {
    maxWindowHours = 72.0;
  } else if (data.category === 'DAIRY') {
    maxWindowHours = 24.0;
  } else if (data.category === 'PRODUCE') {
    maxWindowHours = 8.0;
  }

  if (deadline.getTime() > prep.getTime() + maxWindowHours * 3600 * 1000) {
    reasons.push(`Pickup deadline exceeds the ${maxWindowHours}-hour handling window for the reported food and storage type.`);
  }

  const remainingSafeMs = Math.min(
    expiry.getTime() - now,
    prep.getTime() + maxWindowHours * 3600 * 1000 - now
  );
  const remainingSafeMinutes = Math.max(0, Math.floor(remainingSafeMs / (1000 * 60)));

  if (remainingSafeMinutes <= 0) {
    return {
      isSafe: false,
      status: 'EXPIRED',
      reasons: ['Safe consumption window has elapsed.'],
      maxSafeDistributionTimeHours: maxWindowHours,
      remainingSafeMinutes: 0,
      recommendations: ['Discard surplus food safely.'],
    };
  }

  return {
    isSafe: reasons.length === 0,
    status: reasons.length === 0 ? 'SAFE' : 'FLAGGED',
    reasons,
    maxSafeDistributionTimeHours: maxWindowHours,
    remainingSafeMinutes,
    recommendations,
  };
}

function assessSafetySignals(data, currentTime = new Date()) {
  const compliance = evaluateFssaiCompliance(data, currentTime);
  const reasons = [];
  if (data.reportedSafetyDeclaration !== true) {
    reasons.push('The restaurant did not confirm its safety-handling declaration.');
  }
  if (data.allergensReviewed !== true) {
    reasons.push('Allergen information has not been confirmed by the restaurant.');
  }
  if (data.category === 'COOKED_MEALS' && data.storageType === 'ROOM_TEMP') {
    reasons.push('Cooked food reported at room temperature has a short safe handling window.');
  }
  if (!compliance.isSafe) reasons.push(...compliance.reasons);

  const riskLevel = !compliance.isSafe
    ? 'HIGH'
    : reasons.length > 0
      ? 'CAUTION'
      : 'LOW';
  return {
    ...compliance,
    riskLevel,
    riskReasons: [...new Set(reasons)],
    requiresReview: riskLevel !== 'LOW',
  };
}

module.exports = {
  COMMON_ALLERGENS,
  STORAGE_TYPES,
  evaluateFssaiCompliance,
  assessSafetySignals,
};
