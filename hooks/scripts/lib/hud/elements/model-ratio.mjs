/**
 * hud/elements/model-ratio.mjs
 * Session-wide model distribution by TOKENS (not turn count).
 *
 * Renders "O:42 S:31 H:12 X:15" where the four buckets sum to 100:
 *   O = Opus tokens          (red)
 *   S = Sonnet tokens        (yellow)
 *   H = Haiku tokens         (green)
 *   X = Codex-delegation     (cyan)  — tokens of turns that invoked a Codex
 *                                      tool_use (codex:rescue / mcp__codex*).
 *
 * The Codex bucket attributes the Claude turn that triggered the delegation
 * to Codex — Codex's own GPT-5 token spend is not present in the Claude
 * transcript, so we use the delegating turn as a proxy. This keeps the
 * buckets mutually exclusive and the 4-way sum at 100.
 *
 * Data source: the JSONL transcript at `data.transcript_path`. Each assistant
 * line carries `message.usage` (input_tokens + output_tokens) and
 * `message.model` / `message.content[*].type`.
 */

import { existsSync, readFileSync } from 'fs';
import { C } from '../colors.mjs';

const CODEX_TOOL_RE = /^(mcp__codex|codex[._:-]?rescue)/i;

/**
 * Walk the transcript JSONL and bucket assistant-turn tokens.
 * @param {string} transcriptPath absolute path to the JSONL file
 * @returns {{ O: number, S: number, H: number, X: number, total: number }}
 */
export function bucketTokens(transcriptPath) {
  const zero = { O: 0, S: 0, H: 0, X: 0, total: 0 };
  if (!transcriptPath || !existsSync(transcriptPath)) return zero;

  let raw;
  try { raw = readFileSync(transcriptPath, 'utf8'); } catch { return zero; }

  const buckets = { O: 0, S: 0, H: 0, X: 0 };
  const lines = raw.split('\n');
  for (const line of lines) {
    if (!line) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    const msg = rec?.message;
    if (!msg || msg.role !== 'assistant') continue;

    const usage = msg.usage;
    if (!usage) continue;
    const tokens = (usage.input_tokens || 0) + (usage.output_tokens || 0);
    if (tokens <= 0) continue;

    const content = Array.isArray(msg.content) ? msg.content : [];
    const hasCodex = content.some(
      (c) => c && c.type === 'tool_use' && typeof c.name === 'string' && CODEX_TOOL_RE.test(c.name),
    );

    if (hasCodex) {
      buckets.X += tokens;
      continue;
    }

    const model = typeof msg.model === 'string' ? msg.model : '';
    if (/opus/i.test(model)) buckets.O += tokens;
    else if (/sonnet/i.test(model)) buckets.S += tokens;
    else if (/haiku/i.test(model)) buckets.H += tokens;
    // Unknown models drop silently (keeps the 4-way sum meaningful).
  }

  const total = buckets.O + buckets.S + buckets.H + buckets.X;
  return { ...buckets, total };
}

/**
 * Normalize raw bucket counts to integer percentages that sum to exactly 100.
 * Distributes the rounding delta to the largest bucket.
 * @param {{ O: number, S: number, H: number, X: number, total: number }} b
 * @returns {{ O: number, S: number, H: number, X: number }|null} null when total is 0
 */
export function normalizePercents(b) {
  if (!b || b.total <= 0) return null;
  const raw = {
    O: (b.O / b.total) * 100,
    S: (b.S / b.total) * 100,
    H: (b.H / b.total) * 100,
    X: (b.X / b.total) * 100,
  };
  const rounded = { O: Math.round(raw.O), S: Math.round(raw.S), H: Math.round(raw.H), X: Math.round(raw.X) };
  const sum = rounded.O + rounded.S + rounded.H + rounded.X;
  const delta = 100 - sum;
  if (delta !== 0) {
    // Absorb the delta into the largest bucket so we always hit exactly 100.
    const largest = ['O', 'S', 'H', 'X'].reduce((a, k) => (rounded[k] >= rounded[a] ? k : a), 'O');
    rounded[largest] += delta;
  }
  return rounded;
}

/**
 * Element render: "O:42 S:31 H:12 X:15" with per-bucket colors, or null.
 * @param {{ data: object }} ctx — `data.transcript_path` drives the read
 * @param {{ paint: Function, dim: Function }} painter
 * @returns {string|null}
 */
export function render(ctx, painter) {
  const path = ctx?.data?.transcript_path;
  const pct = normalizePercents(bucketTokens(path));
  if (!pct) return null;
  return [
    painter.paint(C.red, `O:${pct.O}`),
    painter.paint(C.yellow, `S:${pct.S}`),
    painter.paint(C.green, `H:${pct.H}`),
    painter.paint(C.cyan, `X:${pct.X}`),
  ].join(painter.dim('·'));
}
