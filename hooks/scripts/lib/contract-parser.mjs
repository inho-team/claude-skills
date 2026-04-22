#!/usr/bin/env node
'use strict';

/**
 * Contract Parser — Parses contract markdown to extract structured sections.
 *
 * Splits input on level-2 headers (## ) and extracts sections for signature, purpose,
 * constraints, flow, invariants, and error modes. Handles fenced code blocks correctly
 * by ignoring ## headers inside them. Returns null for missing sections.
 */

/**
 * Parse a contract markdown string and extract named sections.
 *
 * @param {string} text - Markdown string containing contract sections
 * @returns {{
 *   signature: string | null,
 *   purpose: string | null,
 *   constraints: string | null,
 *   flow: string | null,
 *   invariants: string | null,
 *   errorModes: string | null
 * }} Object with extracted sections, all keys present (null if missing)
 * @example
 * const contract = `
 * ## Signature
 * function doWork(input: string): Promise<void>
 *
 * ## Purpose
 * Performs the primary work task.
 * `;
 * const result = parseContract(contract);
 * console.log(result.signature); // "function doWork(input: string): Promise<void>"
 */
export function parseContract(text) {
  const result = {
    signature: null,
    purpose: null,
    constraints: null,
    flow: null,
    invariants: null,
    errorModes: null,
  };

  if (!text || typeof text !== 'string') {
    return result;
  }

  const lines = text.split('\n');
  const sections = new Map();

  let currentHeader = null;
  let currentBody = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track fenced code blocks (```)
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (currentHeader !== null) {
        currentBody.push(line);
      }
      continue;
    }

    // Check for level-2 header only when NOT inside a code block
    if (!inCodeBlock && line.match(/^## /)) {
      // Save previous section if any
      if (currentHeader !== null) {
        const trimmedBody = currentBody.join('\n').trim();
        if (trimmedBody && !sections.has(currentHeader)) {
          sections.set(currentHeader, trimmedBody);
        }
      }

      // Extract new header name and normalize
      currentHeader = line.replace(/^## /, '').trim().toLowerCase();
      currentBody = [];
      continue;
    }

    // Accumulate body lines for current section
    if (currentHeader !== null) {
      currentBody.push(line);
    }
  }

  // Save the last section
  if (currentHeader !== null) {
    const trimmedBody = currentBody.join('\n').trim();
    if (trimmedBody && !sections.has(currentHeader)) {
      sections.set(currentHeader, trimmedBody);
    }
  }

  // Map recognized headers to result keys
  const headerMap = {
    signature: 'signature',
    purpose: 'purpose',
    constraints: 'constraints',
    flow: 'flow',
    invariants: 'invariants',
    'error modes': 'errorModes',
  };

  for (const [header, key] of Object.entries(headerMap)) {
    if (sections.has(header)) {
      result[key] = sections.get(header);
    }
  }

  return result;
}

export default parseContract;
