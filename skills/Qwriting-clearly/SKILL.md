---
name: Qwriting-clearly
description: Refines text for clarity and conciseness using Strunk's principles, and removes AI-generated writing patterns. Use when writing or polishing documentation, commit messages, error messages, reports, or UI text, or when text sounds robotic, overly formal, or AI-like.
invocation_trigger: When improving prose or documentation clarity, humanize, remove AI patterns, de-AI.
recommendedModel: haiku
---


# Writing Clearly and Concisely

## Overview

Write clearly and with force. This skill covers what to do (Strunk) and what to avoid (AI patterns).

## When to Use This Skill

Use this skill any time you are writing for a human:

- Documentation, README files, technical explanations
- Commit messages, pull request descriptions
- Error messages, UI copy, help text, comments
- Reports, summaries, or any form of explanation
- Proofreading to improve clarity

**If you are writing a sentence a human will read, use this skill.**

## Strategy When Context Is Tight

When context is limited:

1. Draft based on judgment
2. Hand the draft and relevant section files to a Teammate
3. Have the Teammate proofread and return a revised version

Loading a single section (~1,000–4,500 tokens) instead of full content saves significant context.

## Elements of Style

William Strunk Jr.'s *The Elements of Style* (1918) teaches how to write clearly and cut ruthlessly.

### Rules

**Elementary rules of usage (grammar/punctuation):**

1. Form the possessive singular by adding 's
2. Use a comma after each term in a series except the last
3. Enclose parenthetic expressions between commas
4. Place a comma before a conjunction introducing an independent clause
5. Do not join independent clauses with a comma
6. Do not break sentences in two
7. A participial phrase at the beginning of a sentence must refer to the grammatical subject

**Elementary principles of composition:**

8. Make the paragraph the unit of composition: one topic per paragraph
9. Begin each paragraph with a topic sentence
10. **Use the active voice**
11. **Put statements in positive form**
12. **Use definite, specific, concrete language**
13. **Omit needless words**
14. Avoid a succession of loose sentences
15. Express coordinate ideas in similar form
16. **Keep related words together**
17. In summaries, keep to one tense
18. **Place the emphatic words of a sentence at the end**

### Reference Files

| Section | File | ~Tokens |
|---------|------|---------|
| Grammar, punctuation, comma rules | `02-elementary-rules-of-usage.md` | 2,500 |
| Paragraph structure, active voice, concision | `03-elementary-principles-of-composition.md` | 4,500 |
| Titles, quotations, formatting | `04-a-few-matters-of-form.md` | 1,000 |
| Word choice, common errors | `05-words-and-expressions-commonly-misused.md` | 4,000 |

**For most tasks, `03-elementary-principles-of-composition.md` is sufficient.** It covers active voice, positive statements, specific language, and cutting needless words.

## AI Writing Patterns: What to Avoid

LLMs tend to regress toward statistical averages, producing cliched and bloated prose. Avoid:

- **Inflated words:** pivotal, crucial, vital, testament, enduring legacy
- **Empty "-ing" phrases:** ensuring reliability, showcasing features, highlighting capabilities
- **Promotional adjectives:** groundbreaking, seamless, robust, cutting-edge
- **AI clichés:** delve, leverage, multifaceted, foster, realm, tapestry
- **Formatting abuse:** excessive bullet points, emoji decoration, bold on every other sentence

Don't write grandly — describe concretely what is actually happening.

For deeper research on why these patterns occur, see `signs-of-ai-writing.md` — a guide developed by Wikipedia editors to detect AI-generated submissions, well-documented and field-validated.

## Summary

When writing for humans, load the relevant section from `elements-of-style/` and apply the rules. For most tasks, `03-elementary-principles-of-composition.md` contains the most important material.

---

## AI Pattern Removal (from Qhumanizer)

Based on Wikipedia's "Signs of AI Writing" (WikiProject AI Cleanup). Use this section when editing text that sounds robotic, overly formal, or AI-generated.

### Role

When humanizing text:
1. **Identify AI patterns** — scan for the patterns listed below
2. **Rewrite problem passages** — replace with natural alternatives
3. **Preserve meaning** — keep the core message intact
4. **Maintain tone** — match intended register (formal, conversational, technical)
5. **Add personality** — inject real character, not just remove bad patterns

### Personality and Voice

Flat, voiceless prose is as detectable as AI-generated text. Signs of lifeless writing: uniform sentence length/structure, no opinions, no uncertainty, no first person, no humor or edge, reads like Wikipedia or a press release.

How to add voice: have opinions, vary rhythm, acknowledge complexity, use "I" where appropriate, allow messiness, be specific about feelings.

### Content Patterns

**1. Inflated Significance / Legacy / Broad Trends**
Watch words: symbol of, testament to, pivotal/crucial role, underscores the importance, enduring legacy, evolving landscape
Fix: Remove inflated framing. State what actually happened.

**2. Inflated Notability / Media Coverage**
Watch words: independent coverage, regional/national media outlets, active social media presence
Fix: Replace vague notability claims with specific citations.

**3. Superficial Analysis via -ing Phrases**
Watch words: emphasizing, highlighting, showcasing, ensuring, reflecting, symbolizing, contributing, fostering
Fix: Remove dangling -ing clauses; state the actual fact or source.

**4. Promotional / Advertising Language**
Watch words: boasting, vibrant, rich (figurative), profound, groundbreaking, renowned, breathtaking, nestled in
Fix: Replace promotional adjectives with concrete facts.

**5. Vague Attribution / Hedged Claims**
Watch words: according to industry reports, observers noted, experts argue, some critics claim
Fix: Name the specific source and date.

**6. Outline-Style "Challenges and Future Outlook"**
Watch words: despite ... faces several challenges, future outlook
Fix: Replace formulaic sections with specific facts and dates.

### Language and Grammar Patterns

**7. Overused AI Cliches:** additionally, furthermore, delve, foster, garner, underscore, landscape (abstract), pivotal, showcase, tapestry, testament, invaluable, vibrant — replace with plain language or remove.

**8. Copula Avoidance:** serves as, stands as, represents, boasts, features — use simple "is/are/has."

**9. Negative Parallelism:** "Not only... but also..." — state the point directly.

**10. Rule of Three Overuse:** Don't force groups of three. Use the actual number of items.

**11. Elegant Variation (Synonym Cycling):** Don't swap synonyms for the same concept. Repeat the word.

**12. False Range Expressions:** Don't use "from X to Y" when X and Y aren't on a meaningful scale.

### Style Patterns

**13. Em-Dash Overuse:** Replace most em-dashes with commas, periods, or parentheses.

**14. Bold Overuse:** Remove mechanical bolding of terms that don't need emphasis.

**15. Inline Header Lists:** Convert bold-header bullet lists into flowing prose.

**16. Title Case Overuse:** Use sentence case for headings.

**17. Emoji:** Remove decorative emoji from headings and list items.

**18. Curly Quotes:** Replace curly quotes with straight quotes.

### Communication Patterns

**19. Collaborative Communication Artifacts:** Remove chatbot response phrases (I hope this helps, Of course!, Certainly!, Would you like, Let me know, Here is).

**20. Training Data Cutoff Disclosures:** Replace "as of my knowledge cutoff" with actual sources and dates.

**21. Sycophantic Tone:** Remove excessive praise. State the substance.

### Filler and Hedging

**22. Filler Phrases:** "In order to achieve this goal" → "To achieve this" / "Due to the fact that" → "Because" / "has the ability to" → "can" / "It is important to note that" → (delete)

**23. Excessive Hedging:** Reduce qualifiers. "could potentially might have some influence" → "may influence outcomes"

**24. Vague Positive Endings:** Replace bland optimism with specific plans.

### Process

1. Read the input text carefully
2. Identify every instance matching the patterns above
3. Rewrite each problem passage
4. Confirm the revised text sounds natural aloud, has varied sentence structure, specific details, appropriate tone
5. Present the humanized version with a brief summary of changes (when useful)

### Reference

[Wikipedia: Signs of AI Writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) — Core insight: "LLMs use statistical algorithms to predict what comes next. The result tends to converge on the most statistically plausible outcome for the broadest set of cases."
