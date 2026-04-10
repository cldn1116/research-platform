/**
 * Manuscript Generation Engine
 *
 * Produces a fully-structured scientific manuscript object from project data.
 * All text is generated in formal academic English.
 */
const { formalizeText, formalizeWithContext } = require('./textFormalizer');

// ── Public entry point ─────────────────────────────────────────────────────

/**
 * Generate a complete manuscript from project data.
 *
 * @param {Object}   project     - The project record
 * @param {Object[]} methods     - All methods belonging to the project
 * @param {Object[]} experiments - All experiments belonging to the project
 * @param {Object[]} results     - All result records (flat array)
 * @returns {Object} Structured manuscript object
 */
function generateManuscript(project, methods, experiments, results) {
  const included     = experiments.filter(e => e.status === 'included');
  const supplementary = experiments.filter(e => e.status === 'supplementary');

  const methodMap = buildMap(methods, 'id');
  const resultMap = buildMap(results, 'experiment_id');

  // Figure numbering
  let figCounter = 1;
  const figMap = {};
  included.forEach(e => {
    if (resultMap[e.id] && resultMap[e.id].raw_text) {
      figMap[e.id] = figCounter++;
    }
  });
  let suppCounter = 1;
  const suppFigMap = {};
  supplementary.forEach(e => {
    suppFigMap[e.id] = suppCounter++;
  });

  return {
    meta: buildMeta(project),
    abstract: buildAbstract(project, included, methodMap, resultMap),
    introduction: buildIntroduction(project),
    materialsAndMethods: buildMethods(included, methodMap),
    results: buildResults(included, methodMap, resultMap, figMap),
    discussion: buildDiscussion(project, included, methodMap, resultMap),
    conclusion: buildConclusion(project, included),
    supplementary: supplementary.length > 0
      ? buildSupplementary(supplementary, methodMap, resultMap, suppFigMap)
      : null,
    references: buildReferences(),
    stats: {
      includedCount: included.length,
      supplementaryCount: supplementary.length,
      excludedCount: experiments.filter(e => e.status === 'excluded').length,
      figureCount: Object.keys(figMap).length,
    },
  };
}

// ── Section builders ───────────────────────────────────────────────────────

function buildMeta(project) {
  return {
    title:       project.title       || 'Untitled Manuscript',
    authors:     project.authors     || '',
    institution: project.institution || '',
    keywords:    project.keywords    || '',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
  };
}

function buildAbstract(project, included, methodMap, resultMap) {
  const topic = project.research_topic || 'the subject under investigation';

  const methodNames = uniqueMethodNames(included, methodMap);
  const withResults = included.filter(e => resultMap[e.id] && resultMap[e.id].raw_text);

  // Build abstract sentences
  const sentences = [];

  sentences.push(
    `This study investigates ${topic} through a systematic series of controlled experiments.`
  );

  if (methodNames.length > 0) {
    const listed = oxfordList(methodNames.slice(0, 4));
    sentences.push(`The experimental framework employed ${listed} as primary methodological approaches.`);
  }

  if (included.length > 0) {
    sentences.push(
      `A total of ${included.length} experiment${included.length !== 1 ? 's' : ''} were conducted to address the stated research objectives.`
    );
  }

  if (withResults.length > 0) {
    const keyFinding = formalizeText(resultMap[withResults[0].id].raw_text);
    const firstSentence = splitSentences(keyFinding)[0];
    if (firstSentence) {
      sentences.push(`Key findings demonstrate that ${lcFirst(firstSentence)}`);
    }
  }

  sentences.push(
    `These results contribute to the current understanding of ${topic} and provide a basis for further experimental and theoretical investigations.`
  );

  return {
    text: sentences.join(' '),
    methodNames,
    experimentCount: included.length,
  };
}

function buildIntroduction(project) {
  const topic = project.research_topic || 'the subject under investigation';
  const T = ucFirst(topic);

  return {
    background: [
      `${T} represents a significant domain of scientific inquiry with broad implications for both fundamental research and applied sciences.`,
      `The mechanistic understanding of ${topic} has advanced substantially in recent decades, driven by improvements in experimental methodology and analytical instrumentation (Reference 1; Reference 2).`,
      `Despite this progress, several critical aspects of the system remain incompletely characterised, including the interplay between key variables under varying experimental conditions (Reference 3).`,
      `This gap in knowledge necessitates a systematic investigation employing rigorous experimental controls.`,
    ].join(' '),

    objectives: [
      `Characterise the primary parameters governing ${topic} under defined experimental conditions.`,
      `Establish quantitative and qualitative relationships between experimental variables.`,
      `Interpret observed outcomes within the framework of existing theoretical models.`,
      `Identify directions for further investigation based on the empirical findings.`,
    ],

    significance: [
      `The findings of the present study are expected to expand the existing body of knowledge pertaining to ${topic}.`,
      `Furthermore, the methodological approaches developed herein may serve as a reproducible template for subsequent investigations in this research area (Reference 4).`,
      `Ultimately, a deeper mechanistic understanding of ${topic} has the potential to inform both theoretical models and practical applications in the field.`,
    ].join(' '),
  };
}

function buildMethods(included, methodMap) {
  const usedIds = [...new Set(included.filter(e => e.method_id).map(e => e.method_id))];

  if (usedIds.length === 0) {
    return { methods: [], note: 'No methods have been assigned to included experiments.' };
  }

  const methods = usedIds.map(id => {
    const m = methodMap[id];
    if (!m) return null;

    const usingExperiments = included
      .filter(e => e.method_id === id)
      .map(e => e.name);

    return {
      id:          m.id,
      name:        m.name,
      objective:   m.objective  || '',
      materials:   parseListText(m.materials),
      procedure:   parseListText(m.procedure),
      usedIn:      usingExperiments,
      version:     m.version || 1,
    };
  }).filter(Boolean);

  return { methods };
}

function buildResults(included, methodMap, resultMap, figMap) {
  const withResults = included.filter(e => resultMap[e.id] && resultMap[e.id].raw_text);
  const pending     = included.filter(e => !resultMap[e.id] || !resultMap[e.id].raw_text);

  const experiments = withResults.map(exp => {
    const result = resultMap[exp.id];
    const method = exp.method_id ? methodMap[exp.method_id] : null;

    const formalText = result.formal_text && result.formal_text.trim()
      ? result.formal_text
      : formalizeWithContext(result.raw_text, exp.name, method ? method.name : null);

    return {
      id:           exp.id,
      name:         exp.name,
      conditions:   exp.conditions || '',
      methodName:   method ? method.name : null,
      rawText:      result.raw_text,
      formalText,
      figureNumber: figMap[exp.id] || null,
      figureLegend: result.figure_legend || '',
    };
  });

  const pendingNames = pending.map(e => e.name);

  return { experiments, pending: pendingNames };
}

function buildDiscussion(project, included, methodMap, resultMap) {
  const topic = project.research_topic || 'the subject under investigation';
  const withResults = included.filter(e => resultMap[e.id] && resultMap[e.id].raw_text);

  const perExperiment = withResults.map((exp, i) => {
    const result = resultMap[exp.id];
    const formal = formalizeText(result.raw_text);
    const first = splitSentences(formal)[0] || formal;

    return {
      name: exp.name,
      interpretation: [
        `Regarding the ${exp.name.toLowerCase()}, ${lcFirst(first)}`,
        `This observation is in accordance with established principles and is consistent with findings previously reported in the literature (Reference ${5 + i}).`,
      ].join(' '),
    };
  });

  return {
    overview: [
      `The present study examined ${topic} through a systematic, multi-experiment approach.`,
      `The aggregate results provide several important insights into the mechanistic and quantitative dimensions of this research area.`,
    ].join(' '),

    perExperiment,

    priorLiterature: [
      `The findings of the present study are broadly consistent with the existing body of knowledge.`,
      `(Previous studies have reported analogous trends in comparable experimental systems; Reference 6).`,
      `However, certain aspects of the current results merit specific discussion.`,
      `Observed deviations from expected values may be attributable to differences in experimental conditions, sample heterogeneity, or methodological variation.`,
      `(Consistent with prior findings in the field, such variability is not uncommon under similar experimental constraints; Reference 7).`,
    ].join(' '),

    mechanisms: [
      `The mechanistic basis of the observed phenomena may be interpreted within the context of current theoretical frameworks.`,
      `(It has been proposed that the underlying processes involve complex regulatory interactions; Reference 8).`,
      `Further investigation employing complementary techniques will be necessary to elucidate the precise mechanisms responsible for the observed outcomes.`,
    ].join(' '),

    limitations: [
      `Several limitations of the present study should be acknowledged.`,
      `The experimental conditions employed may not fully recapitulate the complexity of natural or large-scale systems.`,
      `Additionally, the scope of the current investigation may constrain the generalisability of the findings.`,
      `Future studies with expanded experimental designs and independent replications will be necessary to confirm and extend these observations.`,
    ].join(' '),

    futureDirections: [
      `Based on the findings of this study, several directions for future investigation are proposed.`,
      `First, the systematic examination of additional variables and conditions will provide a more comprehensive understanding of the system.`,
      `Second, the application of advanced analytical and imaging techniques may yield further mechanistic insights.`,
      `Third, the translation of these findings to broader biological, industrial, or clinical contexts warrants consideration.`,
    ].join(' '),
  };
}

function buildConclusion(project, included) {
  const topic = project.research_topic || 'the subject under investigation';
  const n = included.length;

  const sentences = [
    `In conclusion, the present study has provided systematic evidence pertaining to ${topic}.`,
  ];

  if (n > 0) {
    sentences.push(
      `Through the design and execution of ${n} controlled experiment${n !== 1 ? 's' : ''}, ` +
      `a series of significant observations were made that contribute to the current mechanistic understanding of the field.`
    );
  }

  sentences.push(
    `The results reported herein establish a reproducible experimental foundation and highlight the importance of continued research in this domain.`,
    `Collectively, these findings advance the understanding of ${topic} and provide a conceptual basis for subsequent experimental and applied investigations.`,
  );

  return sentences.join(' ');
}

function buildSupplementary(experiments, methodMap, resultMap, suppFigMap) {
  return experiments.map(exp => {
    const result = resultMap[exp.id];
    const method = exp.method_id ? methodMap[exp.method_id] : null;

    const formalText = result && result.raw_text
      ? (result.formal_text && result.formal_text.trim()
          ? result.formal_text
          : formalizeWithContext(result.raw_text, exp.name, method ? method.name : null))
      : '';

    return {
      id:           exp.id,
      name:         exp.name,
      conditions:   exp.conditions || '',
      formalText,
      figureNumber: suppFigMap[exp.id] || null,
      figureLegend: result ? result.figure_legend || '' : '',
    };
  });
}

function buildReferences() {
  return [
    '[Author(s), Year. Title of article. Journal Name. Volume(Issue):Pages. DOI:]',
    '[Author(s), Year. Title of article. Journal Name. Volume(Issue):Pages. DOI:]',
    '[Author(s), Year. Title of article. Journal Name. Volume(Issue):Pages. DOI:]',
    '[Author(s), Year. Title of article. Journal Name. Volume(Issue):Pages. DOI:]',
    '[Author(s), Year. Title of article. Journal Name. Volume(Issue):Pages. DOI:]',
    '[Author(s), Year. Title of article. Journal Name. Volume(Issue):Pages. DOI:]',
    '[Author(s), Year. Title of article. Journal Name. Volume(Issue):Pages. DOI:]',
    '[Author(s), Year. Title of article. Journal Name. Volume(Issue):Pages. DOI:]',
  ];
}

// ── Utility helpers ────────────────────────────────────────────────────────

function buildMap(arr, key) {
  const map = {};
  arr.forEach(item => { map[item[key]] = item; });
  return map;
}

function uniqueMethodNames(experiments, methodMap) {
  const seen = new Set();
  const names = [];
  experiments.forEach(e => {
    if (e.method_id && methodMap[e.method_id] && !seen.has(e.method_id)) {
      seen.add(e.method_id);
      names.push(methodMap[e.method_id].name);
    }
  });
  return names;
}

function parseListText(text) {
  if (!text || !text.trim()) return [];
  const lines = text.split('\n').map(l => l.trim().replace(/^[-•*\d]+[.)]\s*/, '')).filter(Boolean);
  return lines.length > 0 ? lines : [text.trim()];
}

function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g) || [text];
}

function oxfordList(arr) {
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
}

function ucFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function lcFirst(str) {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

module.exports = { generateManuscript };
