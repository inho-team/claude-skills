/**
 * Helper module for emitting structured exit(2) block messages from hooks.
 * Provides consistent, parseable output that Claude can use for context-aware
 * escalation and guidance.
 */

'use strict';

/**
 * Emits a structured block message to stderr and exits with code 2.
 * Takes options object with skill, reason, action, and optional bypass fields.
 * Claude receives this message and can parse the fields for context.
 */
export function emitBlock({ skill, reason, action, bypass }) {
  const parts = [
    `[QE:BLOCK] skill=${skill}`,
    `reason=${reason}`,
    `action=${action}`,
  ];
  if (bypass) {
    parts.push(`bypass=${bypass}`);
  }
  process.stderr.write(parts.join(' | '));
  process.exit(2);
}
