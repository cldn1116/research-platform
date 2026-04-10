/**
 * AI Manuscript Generator — server-side only.
 *
 * Exports:
 *   computeInputHash          → Results/Discussion cache hash
 *   generateAiSections        → Results + Discussion (one Claude call)
 *   computeIntroductionHash   → Introduction cache hash
 *   generateAiIntroduction    → Introduction section
 *   computeMethodsHash        → Methods cache hash
 *   generateAiMethods         → Materials and Methods section
 */

import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

// Model is configurable via ANTHROPIC_MODEL env var.
// Default: claude-haiku-4-5-20251001 (widely available, cost-efficient).
// Override example: ANTHROPIC_MODEL=claude-sonnet-4-6
const MODEL      = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 2000;

// ── Helpers ────────────────────────────────────────────────────────────────

function buildMap(arr, key) {
  const m = {};
  arr.forEach(item => { m[item[key]] = item; });
  return m;
}

// ── Hash ───────────────────────────────────────────────────────────────────

/**
 * Compute a deterministic SHA-256 hash of exactly what is sent to Claude.
 * If the hash matches the stored value, the cached AI output is returned instead
 * of calling the API again.
 *
 * @param {Object}   project  - project row
 * @param {Object[]} included - experiments with status === 'included'
 * @param {Object[]} methods  - method rows
 * @param {Object[]} results  - result rows for included experiments
 * @returns {string} hex digest
 */
export function computeInputHash(project, included, methods, results) {
  const methodMap = buildMap(methods, 'id');
  const resultMap = buildMap(results, 'experiment_id');

  const payload = {
    title:  (project.title           || '').trim(),
    topic:  (project.research_topic  || '').trim(),
    // Sort by name so hash is stable regardless of DB return order
    experiments: included
      .filter(e => resultMap[e.id]?.raw_text)
      .map(e => ({
        name:       (e.name       || '').trim(),
        conditions: (e.conditions || '').trim(),
        method:     e.method_id ? ((methodMap[e.method_id]?.name) || '').trim() : '',
        result:     resultMap[e.id].raw_text.trim(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

// ── Claude call ────────────────────────────────────────────────────────────

/**
 * Generate AI-enhanced Results and Discussion sections in a single Claude call.
 *
 * Only experiments with status === 'included' AND non-empty result data are
 * passed to the model. Excluded experiments are never sent.
 *
 * @param {Object}   project  - project row
 * @param {Object[]} included - experiments filtered to status === 'included'
 * @param {Object[]} methods  - method rows
 * @param {Object[]} results  - result rows (only for included experiments)
 * @returns {{ results_ai, discussion_ai, inputHash }}
 */
export async function generateAiSections(project, included, methods, results) {
  const methodMap = buildMap(methods, 'id');
  const resultMap = buildMap(results, 'experiment_id');

  const inputHash = computeInputHash(project, included, methods, results);

  // Only experiments that have actual result text
  const withResults = included.filter(e => resultMap[e.id]?.raw_text);
  if (withResults.length === 0) {
    throw new Error(
      'No included experiments with result data found. ' +
      'Add results to at least one included experiment before generating AI content.'
    );
  }

  // Build input for Claude — include only what is needed
  const experiments = withResults.map(e => {
    const entry = {
      id:     e.id,
      name:   e.name,
      result: resultMap[e.id].raw_text,
    };
    if (e.conditions)                              entry.conditions = e.conditions;
    if (e.method_id && methodMap[e.method_id])    entry.method     = methodMap[e.method_id].name;
    return entry;
  });

  // ── Prompt ──────────────────────────────────────────────────────────────

  const system = `You are a scientific manuscript writer for PhD theses and peer-reviewed journals.
Write in precise, concise, formal academic English.

STRICT RULES — every rule is mandatory:
1. Write ONLY about information explicitly provided in the experiment data below.
2. Do NOT fabricate numbers, statistics, p-values, fold-changes, or any quantitative claims not stated in the input.
3. Do NOT invent mechanisms, citations, references, or prior literature.
4. Do NOT generate placeholder or filler text for data that is absent.
5. If an experiment has no result data, omit it completely.
6. Eliminate redundant phrases. Every sentence must convey specific information.
7. Return ONLY a valid JSON object. No markdown code fences, no text outside the JSON.`;

  const userContent = `Write the Results and Discussion sections for this scientific manuscript.

Project title: ${project.title || 'Untitled'}
Research topic: ${project.research_topic || '(not specified)'}

Experiments with results (${experiments.length} total — these are the ONLY experiments to write about):
${JSON.stringify(experiments, null, 2)}

Return this exact JSON structure — no extra keys, no markdown fences:
{
  "results": {
    "experiments": [
      {
        "id": <integer — must exactly match an id from the input>,
        "formalText": "<one formal academic paragraph describing this experiment's result, grounded strictly in the provided result text>"
      }
    ]
  },
  "discussion": {
    "overview": "<1–2 sentences synthesising what was studied and the overall significance of the combined findings — based only on the data provided>",
    "perExperiment": [
      {
        "name": "<experiment name>",
        "interpretation": "<2–3 sentences of data-grounded mechanistic or contextual interpretation — do not invent mechanisms not supported by the data>"
      }
    ],
    "limitations": "<2–3 sentences of honest, specific limitations based on the experimental design and the data provided>",
    "futureDirections": "<2–3 sentences of specific follow-up experiments or research questions arising directly from these results>"
  }
}`;

  // ── API call ─────────────────────────────────────────────────────────────

  const client = new Anthropic();

  let message;
  try {
    message = await client.messages.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages:   [{ role: 'user', content: userContent }],
    });
  } catch (err) {
    // Surface actionable error messages
    const status = err.status ?? err.statusCode;
    if (status === 404) {
      throw new Error(
        `모델 "${MODEL}"을 사용할 수 없습니다. ` +
        `.env.local에 ANTHROPIC_MODEL=claude-haiku-4-5-20251001 또는 ` +
        `ANTHROPIC_MODEL=claude-sonnet-4-6 을 추가하세요.`
      );
    }
    if (status === 401) {
      throw new Error('API 키가 올바르지 않습니다. .env.local의 ANTHROPIC_API_KEY를 확인하세요.');
    }
    if (status === 429) {
      throw new Error('API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    }
    throw new Error(`Claude API 오류 (${status ?? 'unknown'}): ${err.message}`);
  }

  const raw = (message.content[0]?.text || '').trim();

  // ── Parse response ────────────────────────────────────────────────────────

  let parsed;

  // 1. Try raw parse
  try { parsed = JSON.parse(raw); } catch { /* continue */ }

  // 2. Strip markdown fences
  if (!parsed) {
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    try { parsed = JSON.parse(stripped); } catch { /* continue */ }
  }

  // 3. Extract first {...} block
  if (!parsed) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) { try { parsed = JSON.parse(match[0]); } catch { /* fall through */ } }
  }

  if (!parsed?.results || !parsed?.discussion) {
    throw new Error('Claude returned an unexpected response format. Please try again.');
  }

  // ── Enrich results with experiment names (for display when rule-based draft is absent) ──
  const nameMap = Object.fromEntries(withResults.map(e => [e.id, e.name]));
  if (Array.isArray(parsed.results.experiments)) {
    parsed.results.experiments = parsed.results.experiments.map(e => ({
      ...e,
      name: nameMap[e.id] || e.name || `Experiment ${e.id}`,
    }));
  }

  return {
    results_ai:    parsed.results,
    discussion_ai: parsed.discussion,
    inputHash,
  };
}

// ── Introduction ───────────────────────────────────────────────────────────

/**
 * Compute a deterministic hash of the inputs used for Introduction generation.
 * Based on project metadata + method names/objectives + included experiment names.
 * Does NOT depend on result data (Introduction is written before results are known).
 *
 * @param {Object}   project  - project row
 * @param {Object[]} methods  - method rows
 * @param {Object[]} included - experiments with status === 'included'
 * @returns {string} hex digest
 */
export function computeIntroductionHash(project, methods, included) {
  const payload = {
    title:       (project.title           || '').trim(),
    topic:       (project.research_topic  || '').trim(),
    keywords:    (project.keywords        || '').trim(),
    methods:     methods
      .map(m => ({ name: (m.name || '').trim(), objective: (m.objective || '').trim() }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    experiments: included.map(e => (e.name || '').trim()).sort(),
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

/**
 * Generate an AI-written Introduction section (Background, Research Gap, Objectives).
 *
 * Citation rule: (Author, Year) placeholder format only — no real author names,
 * journal titles, or DOIs are generated.
 *
 * @param {Object}   project  - project row
 * @param {Object[]} methods  - method rows
 * @param {Object[]} included - experiments with status === 'included'
 * @returns {{ introduction_ai, introductionHash }}
 */
export async function generateAiIntroduction(project, methods, included) {
  const introductionHash = computeIntroductionHash(project, methods, included);

  // Auto-extract keywords from method names + experiment names if not provided
  const keywordSources = [
    project.keywords,
    ...methods.map(m => m.name),
    ...included.map(e => e.name),
  ].filter(Boolean).join('; ');

  const methodContext = methods.length > 0
    ? methods.map(m => ({
        name:      m.name,
        objective: m.objective || '',
      }))
    : [];

  const experimentContext = included.map(e => e.name);

  const system = `You are writing the Introduction section of a scientific manuscript for a PhD thesis.
Write in formal, precise academic English suitable for a peer-reviewed journal.

STRICT RULES — every rule is mandatory:
1. CITATION PLACEHOLDERS: Where a citation would normally appear, write (Author, Year) as a placeholder.
   Do NOT invent real author names, paper titles, journal names, volume numbers, or DOIs.
2. Write based strictly on the provided research topic, keywords, and experimental objectives.
   Do not fabricate specific claims about the literature beyond general field context.
3. General mechanistic background is permitted at a high level, but do not assert specific
   quantitative findings from fictional studies.
4. Do NOT overstate the novelty or significance — base claims only on the provided context.
5. Length: 2–4 paragraphs total across all three sections.
6. Return ONLY a valid JSON object. No markdown fences, no text outside the JSON.`;

  const userContent = `Write the Introduction section for this scientific manuscript.

Project title: ${project.title || 'Untitled'}
Research topic: ${project.research_topic || '(not specified)'}
Keywords / context: ${keywordSources || '(not provided)'}

Experimental methods used (name and objective):
${methodContext.length > 0 ? JSON.stringify(methodContext, null, 2) : '(not specified)'}

Included experiments (names only, for scope reference):
${experimentContext.length > 0 ? experimentContext.join(', ') : '(not specified)'}

Return this exact JSON structure — no extra keys, no markdown fences:
{
  "background": "<1–2 paragraphs: general scientific context of the research topic. Use (Author, Year) placeholders where citations belong. Do not invent specific findings.>",
  "researchGap": "<1 paragraph: what is currently unknown or unaddressed in the field that motivates this study. Base only on the provided topic and objectives.>",
  "objectives": "<1 paragraph: the specific aims of this study, derived from the provided experimental methods and objectives. Start with 'The present study aims to…' or similar.>"
}`;

  const client = new Anthropic();

  let message;
  try {
    message = await client.messages.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages:   [{ role: 'user', content: userContent }],
    });
  } catch (err) {
    const status = err.status ?? err.statusCode;
    if (status === 404) {
      throw new Error(
        `모델 "${MODEL}"을 사용할 수 없습니다. ` +
        `.env.local에 ANTHROPIC_MODEL=claude-haiku-4-5-20251001 또는 ` +
        `ANTHROPIC_MODEL=claude-sonnet-4-6 을 추가하세요.`
      );
    }
    if (status === 401) {
      throw new Error('API 키가 올바르지 않습니다. .env.local의 ANTHROPIC_API_KEY를 확인하세요.');
    }
    if (status === 429) {
      throw new Error('API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    }
    throw new Error(`Claude API 오류 (${status ?? 'unknown'}): ${err.message}`);
  }

  const raw = (message.content[0]?.text || '').trim();

  // ── Log raw response for debugging ───────────────────────────────────────
  console.log('[AI intro] stop_reason:', message.stop_reason);
  console.log('[AI intro] raw response:\n', raw.slice(0, 800));

  // ── Parse JSON — three attempts ───────────────────────────────────────────
  let parsed = null;

  // 1. Direct parse
  try { parsed = JSON.parse(raw); } catch { /* continue */ }

  // 2. Strip markdown fences
  if (!parsed) {
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    try { parsed = JSON.parse(stripped); } catch { /* continue */ }
  }

  // 3. Extract first {...} block
  if (!parsed) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) { try { parsed = JSON.parse(match[0]); } catch { /* fall through */ } }
  }

  // ── Normalise field names (accept snake_case or camelCase variants) ────────
  if (parsed) {
    parsed.background  = parsed.background  || parsed.Background  || null;
    parsed.researchGap = parsed.researchGap || parsed.research_gap || parsed.ResearchGap || parsed.gap || null;
    parsed.objectives  = parsed.objectives  || parsed.Objectives   || parsed.objective   || null;
  }

  // ── Fallback: if still not parseable, store raw text as background ─────────
  if (!parsed || (!parsed.background && !parsed.researchGap && !parsed.objectives)) {
    console.warn('[AI intro] JSON parse failed — storing raw text as fallback. Raw excerpt:', raw.slice(0, 300));

    // Try to split by double newline into up to 3 chunks for the 3 fields
    const paragraphs = raw.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    return {
      introduction_ai: {
        background:   paragraphs[0] || raw,
        researchGap:  paragraphs[1] || '',
        objectives:   paragraphs[2] || '',
      },
      introductionHash,
      _fallback: true,
    };
  }

  // ── Guard: ensure at least one field is populated ─────────────────────────
  if (!parsed.background && !parsed.researchGap && !parsed.objectives) {
    throw new Error(
      `Introduction 필드가 모두 비어 있습니다. Claude 응답 일부: "${raw.slice(0, 200)}"`
    );
  }

  console.log('[AI intro] parse succeeded. Fields:', {
    background:  !!parsed.background,
    researchGap: !!parsed.researchGap,
    objectives:  !!parsed.objectives,
  });

  return {
    introduction_ai: {
      background:   parsed.background  || '',
      researchGap:  parsed.researchGap || '',
      objectives:   parsed.objectives  || '',
    },
    introductionHash,
  };
}

// ── Materials and Methods ──────────────────────────────────────────────────

/**
 * Compute a deterministic hash of method raw text content.
 * Changes when the user edits any method's name, objective, materials, or procedure.
 *
 * @param {Object[]} methods - method rows from DB (raw text fields)
 * @returns {string} hex digest
 */
export function computeMethodsHash(methods) {
  const payload = methods
    .map(m => ({
      id:        m.id,
      name:      (m.name      || '').trim(),
      objective: (m.objective || '').trim(),
      materials: (m.materials || '').trim(),
      procedure: (m.procedure || '').trim(),
    }))
    .sort((a, b) => a.id - b.id);
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

/**
 * Rewrite all project methods into formal Materials and Methods style.
 *
 * Rules enforced:
 * - Past tense, passive voice throughout the Procedure
 * - Only numerical values present in the input are used
 * - No new materials, steps, or conditions are invented
 * - Informal language is formalised, not expanded
 *
 * @param {Object[]} methods  - method rows from DB (raw text)
 * @param {Object[]} included - experiments with status === 'included' (for conditions context)
 * @returns {{ methods_ai, methodsHash }}
 */
export async function generateAiMethods(methods, included) {
  if (!methods || methods.length === 0) {
    throw new Error('생성할 방법(Method)이 없습니다. 먼저 방법을 추가하세요.');
  }

  const methodsHash = computeMethodsHash(methods);

  // Build method id → experiments that use it (for conditions context)
  const expsByMethod = {};
  included.forEach(e => {
    if (e.method_id) {
      if (!expsByMethod[e.method_id]) expsByMethod[e.method_id] = [];
      expsByMethod[e.method_id].push({
        name:       e.name,
        conditions: e.conditions || '',
      });
    }
  });

  // Build input for Claude — raw text, not pre-processed arrays
  const methodInput = methods.map(m => {
    const entry = {
      id:        m.id,
      name:      m.name,
      objective: m.objective || '',
      materials: m.materials || '',
      procedure: m.procedure || '',
    };
    const exps = expsByMethod[m.id];
    if (exps?.length) {
      entry.used_in = exps.map(e => e.conditions ? `${e.name} (${e.conditions})` : e.name);
    }
    return entry;
  });

  const system = `You are rewriting the Materials and Methods section of a scientific manuscript.
Rewrite each method in formal academic English suitable for a PhD thesis or peer-reviewed journal.

STRICT RULES — every rule is mandatory:
1. Use ONLY the information provided. Do not add materials, steps, reagent concentrations, temperatures,
   times, or any conditions that are not explicitly stated in the input.
2. Numerical values (temperature, pH, time, concentration, speed, volume) must be copied exactly
   as given — do not round, estimate, or invent values.
3. Write the Procedure in past tense and passive voice
   (e.g. "Cells were incubated at 37 °C for 24 h.", not "Incubate cells at 37 °C for 24 h.").
4. Formalise informal language (e.g. "put in fridge" → "stored at 4 °C") only when the condition
   value itself is explicitly stated in the input.
5. Do not invent safety notices, statistical methods, or controls unless in the input.
6. Materials should be individual items (one item per array element).
7. Procedure steps should each be one complete sentence or short imperative rewritten in passive past tense.
8. Return ONLY valid JSON — no markdown fences, no text outside the JSON.`;

  const userContent = `Rewrite the following methods for a scientific manuscript.

Methods to rewrite (${methodInput.length} total):
${JSON.stringify(methodInput, null, 2)}

Return this exact JSON — one entry per method, preserving all input ids:
{
  "methods": [
    {
      "id": <integer matching input id>,
      "objective": "<formal 1-sentence or short-paragraph objective>",
      "materials": ["<formal item 1>", "<formal item 2>", ...],
      "procedure": ["<Past-tense passive step 1.>", "<Past-tense passive step 2.>", ...]
    }
  ]
}

If a field (materials or procedure) is empty in the input, return an empty array [] for that field.
Do not invent content for empty fields.`;

  const client = new Anthropic();

  let message;
  try {
    message = await client.messages.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages:   [{ role: 'user', content: userContent }],
    });
  } catch (err) {
    const status = err.status ?? err.statusCode;
    if (status === 404) {
      throw new Error(
        `모델 "${MODEL}"을 사용할 수 없습니다. ` +
        `.env.local에 ANTHROPIC_MODEL=claude-haiku-4-5-20251001 또는 ` +
        `ANTHROPIC_MODEL=claude-sonnet-4-6 을 추가하세요.`
      );
    }
    if (status === 401) throw new Error('API 키가 올바르지 않습니다. ANTHROPIC_API_KEY를 확인하세요.');
    if (status === 429) throw new Error('API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    throw new Error(`Claude API 오류 (${status ?? 'unknown'}): ${err.message}`);
  }

  const raw = (message.content[0]?.text || '').trim();
  console.log('[AI methods] stop_reason:', message.stop_reason);
  console.log('[AI methods] raw response:\n', raw.slice(0, 600));

  // ── Parse JSON ────────────────────────────────────────────────────────────
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { /* continue */ }

  if (!parsed) {
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    try { parsed = JSON.parse(stripped); } catch { /* continue */ }
  }

  if (!parsed) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) { try { parsed = JSON.parse(match[0]); } catch { /* fall through */ } }
  }

  if (!parsed?.methods || !Array.isArray(parsed.methods) || parsed.methods.length === 0) {
    console.warn('[AI methods] parse failed. Raw excerpt:', raw.slice(0, 300));
    throw new Error(
      `Methods AI 응답을 파싱할 수 없습니다. Claude 응답 일부: "${raw.slice(0, 200)}"`
    );
  }

  // Normalise each method entry — guard against missing fields
  const normalisedMethods = parsed.methods.map(m => ({
    id:        m.id,
    objective: m.objective || '',
    materials: Array.isArray(m.materials) ? m.materials : [],
    procedure: Array.isArray(m.procedure) ? m.procedure : [],
  }));

  console.log('[AI methods] parse succeeded. Methods:', normalisedMethods.map(m => m.id));

  return {
    methods_ai: { methods: normalisedMethods },
    methodsHash,
  };
}
