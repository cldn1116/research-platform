/**
 * AI manuscript generation endpoint.
 *
 * POST /api/manuscript/[projectId]/ai
 *   Body: { section?: 'results_discussion' | 'introduction', force?: boolean }
 *
 * section = 'results_discussion' (default):
 *   Generates Results + Discussion together in one Claude call.
 *   Input hash based on included experiments + their results.
 *
 * section = 'introduction':
 *   Generates Introduction (Background, Research Gap, Objectives).
 *   Input hash based on project metadata + methods + experiment names.
 *   No experiment result data is passed to Claude.
 *
 * force = false (default): return cached output when input hash is unchanged.
 * force = true: always call Claude regardless of cache.
 *
 * Excluded experiments are never passed to Claude.
 * Rule-based generated_at and project_updated_at_snapshot are always preserved.
 */

import { query, queryOne } from '../../../../lib/db';
import {
  generateAiSections,
  computeInputHash,
  generateAiIntroduction,
  computeIntroductionHash,
  generateAiMethods,
  computeMethodsHash,
  generateAiAbstract,
  computeAbstractHash,
} from '../../../../lib/aiManuscriptGenerator';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { projectId } = req.query;
  const { force = false, section = 'results_discussion' } = req.body || {};

  if (!['results_discussion', 'introduction', 'methods', 'abstract'].includes(section)) {
    return res.status(400).json({
      error: `Unknown section "${section}". Valid values: results_discussion, introduction, methods, abstract`,
    });
  }

  try {
    const project = await queryOne('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const methods = await query('SELECT * FROM methods WHERE project_id = $1', [projectId]);
    const allExperiments = await query(
      'SELECT * FROM experiments WHERE project_id = $1 ORDER BY display_order ASC, created_at ASC',
      [projectId]
    );

    // Excluded experiments are never passed to the AI
    const included = allExperiments.filter(e => e.status === 'included');

    const existing       = await queryOne('SELECT * FROM drafts WHERE project_id = $1', [projectId]);
    const prevManuscript = existing?.manuscript  ?? {};
    const prevTimestamps = existing?.timestamps  ?? {};

    // ── Route by section ──────────────────────────────────────────────────

    if (section === 'introduction') {
      return await handleIntroduction({
        res, projectId, project, methods, included,
        force, existing, prevManuscript, prevTimestamps,
      });
    }

    if (section === 'methods') {
      return await handleMethods({
        res, projectId, project, methods, included,
        force, existing, prevManuscript, prevTimestamps,
      });
    }

    if (section === 'abstract') {
      return await handleAbstract({
        res, projectId, project,
        force, existing, prevManuscript, prevTimestamps,
      });
    }

    return await handleResultsDiscussion({
      res, projectId, project, methods, included,
      force, existing, prevManuscript, prevTimestamps,
    });

  } catch (err) {
    console.error('[AI manuscript] Unhandled error:', err);
    const message = err?.message || String(err) || '알 수 없는 서버 오류';
    return res.status(500).json({ error: message });
  }
}

// ── Results + Discussion ───────────────────────────────────────────────────

async function handleResultsDiscussion({
  res, projectId, project, methods, included,
  force, existing, prevManuscript, prevTimestamps,
}) {
  if (included.length === 0) {
    return res.status(400).json({
      error: 'No included experiments found. Include at least one experiment before generating AI content.',
    });
  }

  const expIds  = included.map(e => e.id);
  const results = expIds.length
    ? await query('SELECT * FROM results WHERE experiment_id = ANY($1)', [expIds])
    : [];

  // Cache check
  if (!force) {
    const currentHash = computeInputHash(project, included, methods, results);
    if (
      currentHash === prevManuscript.ai_input_hash &&
      prevManuscript.results_ai &&
      prevManuscript.discussion_ai
    ) {
      return res.status(200).json({
        manuscript:                  prevManuscript,
        generated_at:                existing.generated_at,
        timestamps:                  prevTimestamps,
        project_updated_at_snapshot: existing.project_updated_at_snapshot,
        cached:                      true,
      });
    }
  }

  const { results_ai, discussion_ai, inputHash } = await generateAiSections(
    project, included, methods, results
  );

  const nowStr = new Date().toISOString();
  const mergedManuscript = {
    ...prevManuscript,
    results_ai,
    discussion_ai,
    ai_input_hash:   inputHash,
    ai_generated_at: nowStr,
  };
  const mergedTimestamps = {
    ...prevTimestamps,
    results_ai:    nowStr,
    discussion_ai: nowStr,
  };

  return saveAndRespond({ res, projectId, existing, project, mergedManuscript, mergedTimestamps });
}

// ── Introduction ───────────────────────────────────────────────────────────

async function handleIntroduction({
  res, projectId, project, methods, included,
  force, existing, prevManuscript, prevTimestamps,
}) {
  // Cache check
  if (!force) {
    const currentHash = computeIntroductionHash(project, methods, included);
    if (
      currentHash === prevManuscript.introduction_input_hash &&
      prevManuscript.introduction_ai
    ) {
      return res.status(200).json({
        manuscript:                  prevManuscript,
        generated_at:                existing?.generated_at ?? null,
        timestamps:                  prevTimestamps,
        project_updated_at_snapshot: existing?.project_updated_at_snapshot ?? null,
        cached:                      true,
      });
    }
  }

  const { introduction_ai, introductionHash } = await generateAiIntroduction(
    project, methods, included
  );

  const nowStr = new Date().toISOString();
  const mergedManuscript = {
    ...prevManuscript,
    introduction_ai,
    introduction_input_hash: introductionHash,
  };
  const mergedTimestamps = {
    ...prevTimestamps,
    introduction_ai: nowStr,
  };

  return saveAndRespond({ res, projectId, existing, project, mergedManuscript, mergedTimestamps });
}

// ── Methods ────────────────────────────────────────────────────────────────

async function handleMethods({
  res, projectId, project, methods, included,
  force, existing, prevManuscript, prevTimestamps,
}) {
  if (!methods || methods.length === 0) {
    return res.status(400).json({
      error: '생성할 방법(Method)이 없습니다. 먼저 방법을 추가하세요.',
    });
  }

  // Cache check
  if (!force) {
    const currentHash = computeMethodsHash(methods);
    if (
      currentHash === prevManuscript.methods_input_hash &&
      prevManuscript.methods_ai
    ) {
      return res.status(200).json({
        manuscript:                  prevManuscript,
        generated_at:                existing?.generated_at ?? null,
        timestamps:                  prevTimestamps,
        project_updated_at_snapshot: existing?.project_updated_at_snapshot ?? null,
        cached:                      true,
      });
    }
  }

  const { methods_ai, methodsHash } = await generateAiMethods(methods, included);

  // Enrich AI output with metadata from DB (usedIn, version, name)
  // so the preview can render correctly even without a rule-based draft
  const expsByMethod = {};
  included.forEach(e => {
    if (e.method_id) {
      if (!expsByMethod[e.method_id]) expsByMethod[e.method_id] = [];
      expsByMethod[e.method_id].push(e.name);
    }
  });
  const methodMetaMap = Object.fromEntries(
    methods.map(m => [m.id, { name: m.name, version: m.version || 1, usedIn: expsByMethod[m.id] || [] }])
  );
  methods_ai.methods = methods_ai.methods.map(m => ({
    ...m,
    name:    methodMetaMap[m.id]?.name    ?? `Method ${m.id}`,
    version: methodMetaMap[m.id]?.version ?? 1,
    usedIn:  methodMetaMap[m.id]?.usedIn  ?? [],
  }));

  const nowStr = new Date().toISOString();
  const mergedManuscript = {
    ...prevManuscript,
    methods_ai,
    methods_input_hash: methodsHash,
  };
  const mergedTimestamps = {
    ...prevTimestamps,
    methods_ai: nowStr,
  };

  return saveAndRespond({ res, projectId, existing, project, mergedManuscript, mergedTimestamps });
}

// ── Abstract ───────────────────────────────────────────────────────────────

async function handleAbstract({
  res, projectId, project,
  force, existing, prevManuscript, prevTimestamps,
}) {
  // Need at least one AI section to summarize
  const hasAiContent = !!(
    prevManuscript.introduction_ai ||
    prevManuscript.methods_ai      ||
    prevManuscript.results_ai      ||
    prevManuscript.discussion_ai
  );
  if (!hasAiContent) {
    return res.status(400).json({
      error: 'Abstract를 생성하려면 먼저 다른 AI 섹션(Introduction, Methods, Results & Discussion)을 하나 이상 생성해야 합니다.',
    });
  }

  // Cache check
  if (!force) {
    const currentHash = computeAbstractHash(project, prevManuscript);
    if (
      currentHash === prevManuscript.abstract_input_hash &&
      prevManuscript.abstract_ai
    ) {
      return res.status(200).json({
        manuscript:                  prevManuscript,
        generated_at:                existing?.generated_at ?? null,
        timestamps:                  prevTimestamps,
        project_updated_at_snapshot: existing?.project_updated_at_snapshot ?? null,
        cached:                      true,
      });
    }
  }

  const { abstract_ai, abstractHash } = await generateAiAbstract(project, prevManuscript);

  const nowStr = new Date().toISOString();
  const mergedManuscript = {
    ...prevManuscript,
    abstract_ai,
    abstract_input_hash: abstractHash,
  };
  const mergedTimestamps = {
    ...prevTimestamps,
    abstract_ai: nowStr,
  };

  return saveAndRespond({ res, projectId, existing, project, mergedManuscript, mergedTimestamps });
}

// ── Shared DB upsert ───────────────────────────────────────────────────────

async function saveAndRespond({
  res, projectId, existing, project, mergedManuscript, mergedTimestamps,
}) {
  const saved = await queryOne(
    `INSERT INTO drafts
       (project_id, manuscript, timestamps, generated_at, project_updated_at_snapshot)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (project_id) DO UPDATE SET
       manuscript = EXCLUDED.manuscript,
       timestamps = EXCLUDED.timestamps,
       updated_at = NOW()
     RETURNING *`,
    [
      projectId,
      JSON.stringify(mergedManuscript),
      JSON.stringify(mergedTimestamps),
      existing?.generated_at                ?? null,
      existing?.project_updated_at_snapshot ?? project.updated_at,
    ]
  );

  return res.status(200).json({
    manuscript:                  saved.manuscript,
    generated_at:                saved.generated_at,
    timestamps:                  saved.timestamps,
    project_updated_at_snapshot: saved.project_updated_at_snapshot,
    cached:                      false,
  });
}
