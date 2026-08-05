// Measurement units available for quotation / invoice line items.
// Shared by both builders so a quotation and its invoice use identical options.
export const UNIT_OPTIONS = [
  'None',
  'Nos',
  'PCS',
  'Each',
  'Box',
  'Sq Ft',
  'Sq M',
  'Meter',
  'Running Meter',
  'Feet',
  'Kg',
  'Gram',
  'Litre',
  'Set',
  'Pair',
  'Hour',
  'Day',
  'Month',
  'Job',
  'Lot',
  'Bundle',
  'Roll',
  'Packet',
  'Others',
] as const;

export type UnitOption = (typeof UNIT_OPTIONS)[number];

export const DEFAULT_UNIT: UnitOption = 'None';
