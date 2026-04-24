/**
 * slider-parser.mjs
 * Pure ES module for parsing, serializing, and updating slider markdown blocks.
 * No external dependencies, no MCP references.
 */

// ---------------------------------------------------------------------------
// parseSliders
// ---------------------------------------------------------------------------

/**
 * Parse slider blocks from a markdown document.
 * Slider blocks are defined by opening and closing HTML comments with attributes.
 * Silently skips malformed blocks and logs warnings via console.warn.
 *
 * @param {string} markdown - The markdown document to parse
 * @returns {Array<{
 *   name: string,
 *   min: number,
 *   max: number,
 *   step: number,
 *   value: number,
 *   unit: string,
 *   innerContent: string,
 *   startLine: number,
 *   endLine: number
 * }>} Array of parsed slider objects
 */
export function parseSliders(markdown) {
  const result = [];

  if (!markdown || typeof markdown !== 'string') {
    return result;
  }

  // Regex to match opening slider comment: <!-- slider name="..." ... -->
  const openRe = /<!--\s*slider\s+([^>]+?)\s*-->/g;
  let openMatch;

  while ((openMatch = openRe.exec(markdown)) !== null) {
    const openPos = openMatch.index;
    const openText = openMatch[1];
    const openEnd = openMatch.index + openMatch[0].length;

    // Find the closing comment: <!-- /slider -->
    const closeRe = /<!--\s*\/slider\s*-->/;
    const closeMatch = markdown.substring(openEnd).match(closeRe);

    if (!closeMatch) {
      console.warn(`[slider-parser] Missing closing comment for slider at position ${openPos}`);
      continue;
    }

    const innerStart = openEnd;
    const innerEnd = openEnd + closeMatch.index;
    const innerContent = markdown.substring(innerStart, innerEnd);

    // Parse attributes
    const slider = parseAttributes(openText);
    if (!slider) {
      console.warn(`[slider-parser] Invalid attributes in slider at position ${openPos}: ${openText}`);
      continue;
    }

    // Compute line numbers
    const startLine = markdown.substring(0, openPos).split('\n').length - 1;
    const closeEnd = innerEnd + closeMatch[0].length;
    const endLine = markdown.substring(0, closeEnd).split('\n').length - 1;

    slider.innerContent = innerContent;
    slider.startLine = startLine;
    slider.endLine = endLine;

    result.push(slider);
  }

  return result;
}

/**
 * Extract and validate attributes from a slider opening tag.
 *
 * @param {string} attrStr - The attribute string from the opening comment
 * @returns {Object|null} Slider object with name, min, max, step, value, unit, or null if invalid
 */
function parseAttributes(attrStr) {
  const slider = {};

  // name (required)
  const nameMatch = attrStr.match(/name\s*=\s*"([^"]*)"/);
  if (!nameMatch || !nameMatch[1]) {
    return null;
  }
  slider.name = nameMatch[1];

  // min (required, numeric)
  const minMatch = attrStr.match(/min\s*=\s*(\d+)/);
  if (!minMatch) {
    return null;
  }
  slider.min = parseInt(minMatch[1], 10);

  // max (required, numeric)
  const maxMatch = attrStr.match(/max\s*=\s*(\d+)/);
  if (!maxMatch) {
    return null;
  }
  slider.max = parseInt(maxMatch[1], 10);

  // step (required, numeric)
  const stepMatch = attrStr.match(/step\s*=\s*(\d+)/);
  if (!stepMatch) {
    return null;
  }
  slider.step = parseInt(stepMatch[1], 10);

  // value (required, numeric)
  const valueMatch = attrStr.match(/value\s*=\s*(\d+)/);
  if (!valueMatch) {
    return null;
  }
  slider.value = parseInt(valueMatch[1], 10);

  // unit (optional, may be quoted or bare)
  const unitMatch = attrStr.match(/unit\s*=\s*"([^"]*)"|unit\s*=\s*(\S+)/);
  slider.unit = unitMatch ? (unitMatch[1] || unitMatch[2] || '') : '';

  return slider;
}

// ---------------------------------------------------------------------------
// serializeSlider
// ---------------------------------------------------------------------------

/**
 * Serialize a slider object back to markdown format.
 * Attribute order: name, min, max, step, value, unit (if present).
 *
 * @param {Object} slider - The slider object to serialize
 * @param {string} slider.name - Slider name identifier
 * @param {number} slider.min - Minimum value
 * @param {number} slider.max - Maximum value
 * @param {number} slider.step - Step size
 * @param {number} slider.value - Current value
 * @param {string} [slider.unit] - Optional unit string
 * @param {string} [slider.innerContent] - Inner markdown/CSS content
 * @returns {string} Markdown representation of the slider block
 */
export function serializeSlider(slider) {
  if (!slider || typeof slider.name !== 'string') {
    return '';
  }

  let attrParts = [
    `name="${slider.name}"`,
    `min=${slider.min}`,
    `max=${slider.max}`,
    `step=${slider.step}`,
    `value=${slider.value}`,
  ];

  if (slider.unit) {
    attrParts.push(`unit="${slider.unit}"`);
  }

  const openTag = `<!-- slider ${attrParts.join(' ')} -->`;
  const closeTag = `<!-- /slider -->`;
  const inner = slider.innerContent || '';

  return `${openTag}\n${inner}\n${closeTag}`;
}

// ---------------------------------------------------------------------------
// applyValues
// ---------------------------------------------------------------------------

/**
 * Apply new values to existing sliders in markdown.
 * Updates the value attribute and rewrites numeric occurrences in innerContent.
 *
 * @param {string} markdown - The markdown document to update
 * @param {Object} valueMap - Map of slider name to new value, e.g., { "hero-padding": 48 }
 * @returns {string} Updated markdown string
 */
export function applyValues(markdown, valueMap) {
  if (!markdown || typeof markdown !== 'string' || !valueMap || typeof valueMap !== 'object') {
    return markdown;
  }

  const sliders = parseSliders(markdown);

  // Build a map of updates to apply
  const updates = [];

  for (const slider of sliders) {
    const newValue = valueMap[slider.name];
    if (newValue === undefined) {
      continue; // Preserve existing slider
    }

    const oldValue = slider.value;
    const newInnerContent = rewriteInnerContent(slider.innerContent, oldValue, newValue, slider.unit);

    slider.value = newValue;
    slider.innerContent = newInnerContent;

    const oldMarkdown = `<!-- slider ${buildAttrsString(
      slider.name,
      slider.min,
      slider.max,
      slider.step,
      oldValue,
      slider.unit
    )} -->`;
    const newMarkdown = serializeSlider(slider);

    updates.push({ old: oldMarkdown, new: newMarkdown });
  }

  // Apply updates
  let result = markdown;
  for (const { old, new: newText } of updates) {
    // Find and replace the full slider block, not just the opening tag
    const sliderBlockRe = new RegExp(
      escapeRegex(old) + '[\\s\\S]*?' + '<!--\\s*/slider\\s*-->',
      'g'
    );
    result = result.replace(sliderBlockRe, newText);
  }

  return result;
}

/**
 * Build the attributes string for a slider opening tag (used for pattern matching).
 *
 * @param {string} name
 * @param {number} min
 * @param {number} max
 * @param {number} step
 * @param {number} value
 * @param {string} unit
 * @returns {string}
 */
function buildAttrsString(name, min, max, step, value, unit) {
  const parts = [
    `name="${name}"`,
    `min=${min}`,
    `max=${max}`,
    `step=${step}`,
    `value=${value}`,
  ];
  if (unit) {
    parts.push(`unit="${unit}"`);
  }
  return parts.join(' ');
}

/**
 * Rewrite numeric occurrences in inner content from oldValue to newValue.
 * Searches for word boundaries to avoid partial matches.
 *
 * @param {string} content - The inner content to rewrite
 * @param {number} oldValue - The old numeric value
 * @param {number} newValue - The new numeric value
 * @param {string} [unit] - Optional unit to preserve
 * @returns {string} Rewritten content
 */
function rewriteInnerContent(content, oldValue, newValue, unit) {
  if (!content || typeof content !== 'string') {
    return content;
  }

  // Create a regex to match the old value with word boundaries
  // This handles cases like "32px", "32", " 32 "
  const pattern = new RegExp(`\\b${escapeRegex(oldValue.toString())}\\b`, 'g');

  return content.replace(pattern, newValue.toString());
}

/**
 * Escape special regex characters in a string.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
