import { query, queryOne } from '../../../lib/db';
import { generateManuscript } from '../../../lib/manuscriptGenerator';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType,
} from 'docx';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { projectId, format } = req.query;

  const project = await queryOne('SELECT * FROM projects WHERE id = $1', [projectId]);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Prefer the stored draft; fall back to live generation if none exists
  const draft = await queryOne('SELECT * FROM drafts WHERE project_id = $1', [projectId]);

  let ms;
  if (draft?.manuscript && Object.keys(draft.manuscript).length > 0) {
    ms = { ...draft.manuscript };
    // Always sync meta (title, authors, date) from live project
    ms.meta = generateManuscript(project, [], [], []).meta;
  } else {
    const methods     = await query('SELECT * FROM methods WHERE project_id = $1', [projectId]);
    const experiments = await query('SELECT * FROM experiments WHERE project_id = $1', [projectId]);
    const expIds      = experiments.map(e => e.id);
    const results     = expIds.length
      ? await query('SELECT * FROM results WHERE experiment_id = ANY($1)', [expIds])
      : [];
    ms = generateManuscript(project, methods, experiments, results);
  }

  if (format === 'docx') {
    const doc    = buildDocx(ms);
    const buffer = await Packer.toBuffer(doc);
    const name   = (ms.meta?.title || 'manuscript').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.docx"`);
    return res.send(buffer);
  }

  return res.status(200).json(ms);
}

// ── DOCX builder ───────────────────────────────────────────────────────────

const FONT = 'Times New Roman';
const SIZE = 22; // half-points → 11 pt

function run(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: SIZE, ...opts });
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [run(text)],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 0, after: 140, line: 360 },
    ...opts,
  });
}

function heading(level, text) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 280, after: 100 },
  });
}

function subheading(text) {
  return new Paragraph({
    children: [run(text, { bold: true })],
    spacing: { before: 200, after: 80 },
  });
}

function bullet(text) {
  return new Paragraph({
    children: [run(text)],
    bullet: { level: 0 },
    spacing: { before: 0, after: 60 },
  });
}

function numbered(n, text) {
  return new Paragraph({
    children: [run(`${n}. ${text}`)],
    spacing: { before: 0, after: 60 },
  });
}

function italic(text) {
  return new Paragraph({
    children: [run(text, { italics: true, color: '666666', size: 20 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 120 },
  });
}

function buildDocx(ms) {
  const {
    meta, abstract, introduction, materialsAndMethods,
    results, discussion, conclusion, supplementary, references,
  } = ms;
  const children = [];

  // Title block
  children.push(new Paragraph({
    children: [run(meta.title, { bold: true, size: 32 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 160 },
  }));
  if (meta.authors)     children.push(new Paragraph({ children: [run(meta.authors,     { italics: true, size: 24 })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }));
  if (meta.institution) children.push(new Paragraph({ children: [run(meta.institution, { size: 22 })],               alignment: AlignmentType.CENTER, spacing: { after: 60 } }));
  children.push(new Paragraph({ children: [run(meta.date, { size: 20, color: '888888' })], alignment: AlignmentType.CENTER, spacing: { after: 240 } }));

  // Abstract
  children.push(heading(HeadingLevel.HEADING_1, 'Abstract'));
  children.push(p(abstract.text));
  if (meta.keywords) children.push(new Paragraph({ children: [run('Keywords: ', { bold: true }), run(meta.keywords, { italics: true })], spacing: { before: 80, after: 160 } }));

  // Introduction
  children.push(heading(HeadingLevel.HEADING_1, '1. Introduction'));
  children.push(subheading('Background'));
  children.push(p(introduction.background));
  children.push(subheading('Research Objectives'));
  introduction.objectives.forEach((obj, i) => children.push(numbered(i + 1, obj)));
  children.push(subheading('Significance'));
  children.push(p(introduction.significance));

  // Materials & Methods
  children.push(heading(HeadingLevel.HEADING_1, '2. Materials and Methods'));
  if (materialsAndMethods.methods.length === 0) {
    children.push(p('No methods assigned to included experiments.'));
  } else {
    materialsAndMethods.methods.forEach((method, mi) => {
      children.push(subheading(`2.${mi + 1} ${method.name}`));
      if (method.objective) children.push(new Paragraph({ children: [run('Objective: ', { bold: true }), run(method.objective)], spacing: { after: 80 } }));
      if (method.materials.length) {
        children.push(new Paragraph({ children: [run('Materials:', { bold: true })], spacing: { before: 80, after: 40 } }));
        method.materials.forEach(m => children.push(bullet(m)));
      }
      if (method.procedure.length) {
        children.push(new Paragraph({ children: [run('Procedure:', { bold: true })], spacing: { before: 80, after: 40 } }));
        method.procedure.forEach((s, i) => children.push(numbered(i + 1, s)));
      }
    });
  }

  // Results
  children.push(heading(HeadingLevel.HEADING_1, '3. Results'));
  if (results.experiments.length === 0) {
    children.push(p('No results have been entered for included experiments.'));
  } else {
    results.experiments.forEach((exp, ei) => {
      children.push(subheading(`3.${ei + 1} ${exp.name}`));
      if (exp.conditions) children.push(new Paragraph({ children: [run(`Conditions: ${exp.conditions}`, { italics: true, size: 20 })], spacing: { after: 80 } }));
      children.push(p(exp.formalText));
      if (exp.figureNumber) children.push(italic(`Figure ${exp.figureNumber}${exp.figureLegend ? ': ' + exp.figureLegend : ': [Figure legend]'}`));
    });
  }

  // Discussion
  children.push(heading(HeadingLevel.HEADING_1, '4. Discussion'));
  children.push(p(discussion.overview));
  if (discussion.perExperiment.length) {
    children.push(subheading('Key Findings'));
    discussion.perExperiment.forEach(item => children.push(p(item.interpretation)));
  }
  children.push(subheading('Comparison with Prior Literature')); children.push(p(discussion.priorLiterature));
  children.push(subheading('Mechanistic Considerations'));       children.push(p(discussion.mechanisms));
  children.push(subheading('Limitations'));                     children.push(p(discussion.limitations));
  children.push(subheading('Future Directions'));               children.push(p(discussion.futureDirections));

  // Conclusion
  children.push(heading(HeadingLevel.HEADING_1, '5. Conclusion'));
  children.push(p(conclusion));

  // Supplementary
  if (supplementary?.length > 0) {
    children.push(heading(HeadingLevel.HEADING_1, 'Supplementary Materials'));
    supplementary.forEach((supp, si) => {
      children.push(subheading(`Supplementary Figure S${supp.figureNumber || si + 1}: ${supp.name}`));
      if (supp.formalText) children.push(p(supp.formalText));
    });
  }

  // References
  children.push(heading(HeadingLevel.HEADING_1, 'References'));
  references.forEach((ref, i) => children.push(numbered(i + 1, ref)));
  children.push(new Paragraph({
    children: [run('Note: Replace placeholders with actual references.', { italics: true, size: 18, color: '888888' })],
    spacing: { before: 160 },
  }));

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: SIZE }, paragraph: { spacing: { line: 360 } } } } },
    sections: [{ children }],
  });
}
