// contract-validator.mjs — validates parsed contract objects
// Checks for required sections and returns { valid, missing[] }

/**
 * Validates a parsed contract object.
 * @param {Object} parsed - Contract object with signature, purpose, constraints, flow, invariants, errorModes
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateContract(parsed) {
  const required = ['signature', 'purpose', 'constraints', 'invariants', 'errorModes'];
  const missing = [];

  // Handle null/undefined input
  if (parsed == null) {
    return { valid: false, missing: [...required] };
  }

  // Check each required section
  for (const key of required) {
    const value = parsed[key];
    // Missing if null, undefined, or whitespace-only string
    if (value == null || (typeof value === 'string' && value.trim() === '')) {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

export default validateContract;
