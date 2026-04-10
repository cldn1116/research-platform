/**
 * Rule-based scientific text formalizer.
 * Converts informal experimental descriptions to formal academic English.
 */

// ── Ordered replacement rules ─────────────────────────────────────────────────
// More specific patterns must come before general ones.
const RULES = [
  // ── First-person → passive ─────────────────────────────────────────────────
  [/\b[Ii] (observed|noted|found|noticed)\b/g,    'It was $1 that'],
  [/\b[Ww]e (observed|noted|found|noticed)\b/g,   'It was $1 that'],
  [/\b[Ii] (measured|quantified|assessed)\b/g,    'Measurements were performed to $1'],
  [/\b[Ww]e (measured|quantified|assessed)\b/g,   'Measurements were performed to $1'],
  [/\b[Ii] (detected|identified|confirmed)\b/g,   'Detection revealed'],
  [/\b[Ww]e (detected|identified|confirmed)\b/g,  'Detection revealed'],
  [/\b[Ii] used\b/g,                              'The study utilized'],
  [/\b[Ww]e used\b/g,                             'The study utilized'],
  [/\b[Ii] tested\b/g,                            'The study examined'],
  [/\b[Ww]e tested\b/g,                           'The study examined'],
  [/\b[Ii] ran\b/g,                               'The experiment was conducted'],
  [/\b[Ww]e ran\b/g,                              'The experiment was conducted'],

  // ── Informal verbs → formal ────────────────────────────────────────────────
  [/\bshowed up\b/gi,                    'was detected'],
  [/\bshowed\b/gi,                       'demonstrated'],
  [/\bwent up\b/gi,                      'increased'],
  [/\bwent down\b/gi,                    'decreased'],
  [/\bshot up\b/gi,                      'increased markedly'],
  [/\bspiked\b/gi,                       'increased sharply'],
  [/\bdropped sharply\b/gi,              'decreased sharply'],
  [/\bdropped\b/gi,                      'decreased'],
  [/\bcrashed\b/gi,                      'decreased substantially'],
  [/\bleveled off\b/gi,                  'reached a plateau'],
  [/\blevelled off\b/gi,                 'reached a plateau'],
  [/\bplateaued\b/gi,                    'reached a plateau'],
  [/\bflattened out\b/gi,                'reached a plateau'],
  [/\bstayed (the )?same\b/gi,           'remained unchanged'],
  [/\bdid not change\b/gi,               'remained unchanged'],
  [/\bdidn'?t change\b/gi,              'remained unchanged'],
  [/\bkept (increasing|rising)\b/gi,     'continued to increase'],
  [/\bkept (decreasing|falling)\b/gi,    'continued to decrease'],
  [/\bbuilt up\b/gi,                     'accumulated'],
  [/\bbuild up\b/gi,                     'accumulate'],
  [/\bbroke down\b/gi,                   'degraded'],
  [/\bbreak down\b/gi,                   'degrade'],
  [/\bgot higher\b/gi,                   'increased'],
  [/\bgot lower\b/gi,                    'decreased'],
  [/\bgot bigger\b/gi,                   'increased in magnitude'],
  [/\bgot smaller\b/gi,                  'decreased in magnitude'],
  [/\bstarted\b/gi,                      'commenced'],
  [/\bended\b/gi,                        'concluded'],
  [/\bstopped\b/gi,                      'ceased'],
  [/\bstart\b/gi,                        'commence'],
  [/\bbegin\b/gi,                        'initiate'],
  [/\bend\b/gi,                          'terminate'],
  [/\bstop\b/gi,                         'cease'],

  // ── Common biology / microbiology shorthand ───────────────────────────────
  [/\bOD(\s*6\d{2})?\b/g,               'optical density (OD$1)'],
  [/\bcfu\b/gi,                          'colony-forming units (CFU)'],
  [/\bATP\b/g,                           'adenosine triphosphate (ATP)'],
  [/\bDNA\b/g,                           'deoxyribonucleic acid (DNA)'],
  [/\bRNA\b/g,                           'ribonucleic acid (RNA)'],
  [/\bmRNA\b/g,                          'messenger RNA (mRNA)'],
  [/\bPCR\b/g,                           'polymerase chain reaction (PCR)'],
  [/\bHPLC\b/g,                          'high-performance liquid chromatography (HPLC)'],
  [/\bGC\b/g,                            'gas chromatography (GC)'],

  // ── Time units ────────────────────────────────────────────────────────────
  [/\b(\d+(?:\.\d+)?)\s*h\b/g,           '$1 hours'],
  [/\b(\d+(?:\.\d+)?)\s*hrs?\b/gi,       '$1 hours'],
  [/\b(\d+(?:\.\d+)?)\s*min\b/g,         '$1 minutes'],
  [/\b(\d+(?:\.\d+)?)\s*mins?\b/gi,      '$1 minutes'],
  [/\b(\d+(?:\.\d+)?)\s*sec\b/g,         '$1 seconds'],
  [/\b(\d+(?:\.\d+)?)\s*secs?\b/gi,      '$1 seconds'],

  // ── Phase / growth stage ─────────────────────────────────────────────────
  [/\blate stationary phase\b/gi,        'the late stationary phase'],
  [/\bstationary phase\b/gi,             'the stationary phase'],
  [/\bearly log phase\b/gi,              'the early logarithmic (log) phase'],
  [/\blog phase\b/gi,                    'the logarithmic (log) phase'],
  [/\blag phase\b/gi,                    'the lag phase'],
  [/\bearly phase\b/gi,                  'the early exponential phase'],
  [/\blate phase\b/gi,                   'the late stationary phase'],
  [/\bgrowth phase\b/gi,                 'the active growth phase'],
  [/\bdeath phase\b/gi,                  'the decline phase'],

  // ── Informal adjectives / adverbs → formal ────────────────────────────────
  [/\bvery quickly\b/gi,                 'rapidly'],
  [/\bvery slowly\b/gi,                  'gradually'],
  [/\bvery fast\b/gi,                    'at a high rate'],
  [/\bvery high\b/gi,                    'substantially elevated'],
  [/\bvery low\b/gi,                     'substantially reduced'],
  [/\bvery significant\b/gi,             'highly significant'],
  [/\bpretty (high|elevated)\b/gi,       'notably $1'],
  [/\bpretty (low|reduced)\b/gi,         'notably $1'],
  [/\bpretty\b/gi,                       'notably'],
  [/\bkind of\b/gi,                      'somewhat'],
  [/\bsort of\b/gi,                      'somewhat'],
  [/\ba lot of\b/gi,                     'a considerable amount of'],
  [/\blots of\b/gi,                      'a significant quantity of'],
  [/\btiny\b/gi,                         'negligible'],
  [/\bhuge\b/gi,                         'substantial'],
  [/\bbig\b/gi,                          'substantial'],
  [/\bsmall\b/gi,                        'minimal'],
  [/\bfast\b/gi,                         'rapid'],
  [/\bquick\b/gi,                        'rapid'],
  [/\bquickly\b/gi,                      'rapidly'],
  [/\bslowly\b/gi,                       'gradually'],
  [/\bslow\b/gi,                         'gradual'],
  [/\bvery\b/gi,                         'significantly'],
  [/\breally\b/gi,                       'notably'],

  // ── Quantity / approximation ─────────────────────────────────────────────
  [/\baround (\d)/g,                     'approximately $1'],
  [/\babout (\d)/g,                      'approximately $1'],
  [/\bmore or less\b/gi,                 'approximately'],

  // ── Connectives ──────────────────────────────────────────────────────────
  [/\bthen\b/gi,                         'subsequently'],
  [/\balso\b/gi,                         'additionally'],
  [/\bbut\b/gi,                          'however,'],
  [/\bso\b/gi,                           'therefore'],
  [/\bthough\b/gi,                       'although'],
  [/\bafter\b/gi,                        'following'],
  [/\bbefore\b/gi,                       'prior to'],
  [/\bduring\b/gi,                       'throughout'],

  // ── Concentration / level ─────────────────────────────────────────────────
  [/\bhigh levels?\b/gi,                 'elevated concentrations'],
  [/\blow levels?\b/gi,                  'reduced concentrations'],
  [/\bpeak levels?\b/gi,                 'maximal concentrations'],
  [/\bbasal levels?\b/gi,                'basal concentrations'],

  // ── Common informal expressions ───────────────────────────────────────────
  [/\bclear (increase|decrease|change)\b/gi,  'significant $1'],
  [/\bno (increase|decrease|change)\b/gi,     'no significant $1'],
  [/\bsignificant amount\b/gi,                'substantial quantity'],
  [/\bwe can see\b/gi,                        'it is apparent that'],
  [/\bwe see\b/gi,                            'it is apparent that'],
  [/\byou can see\b/gi,                       'it is evident that'],
  [/\bseems? to\b/gi,                         'appears to'],
  [/\bseems? like\b/gi,                       'appears as though'],
  [/\bgets?\b/gi,                             'becomes'],
  [/\bgot\b/gi,                               'became'],
];

// ── Sentence-level openers for structural variation ────────────────────────
const OPENERS = [
  'It was observed that',
  'The data indicated that',
  'Analysis revealed that',
  'These results demonstrated that',
  'Notably,',
  'Furthermore,',
  'The findings suggest that',
];

// ── Main formalizer ────────────────────────────────────────────────────────

/**
 * Apply all vocabulary replacement rules to a text block.
 */
function applyRules(text) {
  let out = text;
  for (const [pattern, replacement] of RULES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Capitalize the first letter of each sentence.
 */
function capitalizeSentences(text) {
  // After . ! ? followed by whitespace, capitalize next word
  return text
    .replace(/([.!?])\s+([a-z])/g, (_, punct, letter) => `${punct} ${letter.toUpperCase()}`)
    .replace(/^([a-z])/, letter => letter.toUpperCase());
}

/**
 * Ensure every sentence ends with a period.
 */
function ensureTermination(text) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.match(/[.!?]$/) ? trimmed : trimmed + '.';
}

/**
 * Remove repeated spaces and clean double punctuation.
 */
function clean(text) {
  return text
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/\.\s*\./g, '.')
    .trim();
}

/**
 * Check whether the text already starts with a formal scientific opener.
 */
function hasProperOpener(text) {
  return /^(The|It was|Analysis|Examination|Notably|Furthermore|Additionally|These|Data|Results|A significant|Optical|Measurements|Detection|In the|Throughout)/i.test(text);
}

/**
 * Formalize raw result text into academic English.
 * @param {string} rawText    User-entered informal text
 * @returns {string}          Formally written academic text
 */
function formalizeText(rawText) {
  if (!rawText || !rawText.trim()) return '';

  let text = rawText.trim();
  text = applyRules(text);
  text = capitalizeSentences(text);
  text = ensureTermination(text);
  text = clean(text);

  return text;
}

/**
 * Formalize with contextual framing (for Results section).
 * @param {string} rawText        User-entered informal text
 * @param {string} experimentName Name of the experiment
 * @param {string|null} methodName Name of the method used (or null)
 * @returns {string}
 */
function formalizeWithContext(rawText, experimentName, methodName) {
  const formal = formalizeText(rawText);
  if (!formal) return '';

  // If text already has a formal opener, return as-is
  if (hasProperOpener(formal)) return formal;

  // Build contextual intro
  const intro = methodName
    ? `In the ${experimentName} experiment, employing ${methodName}, `
    : `In the ${experimentName} experiment, `;

  // Lower-case start of formal text to integrate with intro
  const body = formal.charAt(0).toLowerCase() + formal.slice(1);
  return clean(capitalizeSentences(intro + body));
}

module.exports = { formalizeText, formalizeWithContext };
