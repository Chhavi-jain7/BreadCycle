export const COMMON_ALLERGENS = [
  'Gluten / Wheat',
  'Dairy / Milk',
  'Peanuts & Tree Nuts',
  'Soybeans',
  'Eggs',
  'Mustard / Sesame',
  'Fish & Shellfish',
];

export const STORAGE_TYPES = {
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
