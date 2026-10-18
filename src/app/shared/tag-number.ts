/** Digits in the first section of a tag number */
export const TAG_PREFIX_DIGITS = 2;
/** Digits of a whole tag number: a 2 digit and a 6 digit section */
export const TAG_DIGITS = 8;

/** Shows the digits of a tag number, complete or not, with a space between its sections: "12 345678" */
export function formatTagNumber(digits: string): string {
  return digits.length > TAG_PREFIX_DIGITS ? `${digits.slice(0, TAG_PREFIX_DIGITS)} ${digits.slice(TAG_PREFIX_DIGITS)}` : digits;
}
