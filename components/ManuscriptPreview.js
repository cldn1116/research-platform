import { ko } from '../lib/ko';

// ── Relative time (Korean) ─────────────────────────────────────────────────
function relativeTime(isoStr) {
  if (!isoStr) return null;
  const diff  = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return ko.time.justNow;
  if (mins < 60)  return ko.time.minutesAgo(mins);
  if (hours < 24) return ko.time.hoursAgo(hours);
  return ko.time.daysAgo(days);
}

// ── Manuscript content renderers (English — NOT translated) ───────────────

/** Renders citation placeholders in muted italic. */
function TextBlock({ text }) {
  if (!text) return null;
  const parts = text.split(/(\([^)]*(?:Reference|prior|reported|consistent|Previous)[^)]*\))/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('(') && part.endsWith(')') && i % 2 === 1
          ? <span key={i} className="text-gray-400 italic">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

/** Section-level heading inside the manuscript body — stays in English. */
function SectionTitle({ number, title }) {
  return (
    <h2 className="manuscript-section-title">
      {number ? `${number}. ` : ''}{title}
    </h2>
  );
}

/** Sub-heading inside a section — stays in English. */
function SubTitle({ children }) {
  return <h3 className="manuscript-subsection-title">{children}</h3>;
}

/** A paragraph of manuscript body text — stays in English. */
function Para({ text }) {
  if (!text) return null;
  return (
    <p className="manuscript-paragraph mb-3">
      <TextBlock text={text} />
    </p>
  );
}

/** Italic placeholder for missing content — Korean UI text. */
function ContentPlaceholder({ text }) {
  return <p className="manuscript-placeholder mb-2">{text}</p>;
}

// ── UI sub-components (Korean) ─────────────────────────────────────────────

/** Shows the time a section was last generated — Korean label, Korean time. */
function SectionTimestamp({ ts, label }) {
  if (!ts) return null;
  return (
    <p className="text-right text-gray-300 mt-1 mb-2 no-print" style={{ fontSize: '10px' }}>
      {label}: {relativeTime(ts)}
    </p>
  );
}

/** Placeholder shown when a section exists in the draft object but has no data yet. */
function SectionGhost({ title, onGenerate }) {
  return (
    <div className="my-4">
      {/* Title kept in English — it refers to the manuscript section name */}
      <h2 className="manuscript-section-title opacity-30">{title}</h2>
      <div className="border border-dashed border-gray-200 rounded-md px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-gray-400 italic">
          {ko.preview.ghostMsg}
        </span>
        {onGenerate && (
          <button
            onClick={onGenerate}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            {ko.preview.ghostBtn}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Generation toolbar ─────────────────────────────────────────────────────

const BUTTONS = [
  {
    section: 'materialsAndMethods',
    label:   ko.preview.btnMethods,
    tsKey:   'materialsAndMethods',
    tip:     ko.preview.tipMethods,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    section: 'results',
    label:   ko.preview.btnResults,
    tsKey:   'results',
    tip:     ko.preview.tipResults,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    section: 'discussion',
    label:   ko.preview.btnDiscussion,
    tsKey:   'discussion',
    tip:     ko.preview.tipDiscussion,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    section: 'full',
    label:   ko.preview.btnFull,
    tsKey:   'full',
    tip:     ko.preview.tipFull,
    primary: true,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

function GenerationToolbar({ draftInfo, isStale, generating, onGenerate, hasDraft }) {
  const ts = draftInfo?.timestamps || {};

  return (
    <div className="shrink-0 border-b border-gray-200 bg-white no-print">
      {/* Staleness banner */}
      {isStale && hasDraft && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-b border-amber-200">
          <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-xs text-amber-700">{ko.preview.staleWarning}</span>
        </div>
      )}

      {/* Button row */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
          {ko.preview.generateLabel}
        </span>

        {BUTTONS.map(btn => {
          const isRunning  = generating === btn.section;
          const anyRunning = !!generating;
          const btnTs      = ts[btn.tsKey];

          return (
            <div key={btn.section} className="flex flex-col items-start">
              <button
                onClick={() => onGenerate(btn.section)}
                disabled={anyRunning}
                title={btn.tip}
                className={`
                  flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${btn.primary
                    ? 'bg-blue-700 hover:bg-blue-800 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'}
                `}
              >
                {isRunning ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : btn.icon}
                {isRunning ? ko.preview.generatingBtn : btn.label}
              </button>
              {/* Per-section timestamp */}
              {btnTs && (
                <span className="text-gray-400 mt-0.5 pl-0.5" style={{ fontSize: '10px' }}>
                  {relativeTime(btnTs)}
                </span>
              )}
            </div>
          );
        })}

        {/* Full-draft age (right side) */}
        <div className="ml-auto text-right shrink-0">
          {draftInfo?.generated_at ? (
            <span className="text-xs text-gray-400">
              {ko.preview.fullDraftAge(relativeTime(draftInfo.generated_at))}
            </span>
          ) : !hasDraft ? (
            <span className="text-xs text-gray-400 italic">
              {ko.preview.noDraftAge}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ManuscriptPreview({
  manuscript,
  draftInfo,
  isStale,
  generating,
  project,
  onGenerate,
}) {
  const hasDraft = !!manuscript;

  // Overlay message while generating
  let overlayMsg = null;
  if (generating) {
    overlayMsg = generating === 'full'
      ? ko.preview.updatingFull
      : ko.preview.updatingSection(ko.preview.sectionNames[generating] || generating);
  }

  return (
    <div className="h-full flex flex-col">

      {/* ── Status bar ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 no-print shrink-0">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
          {ko.preview.panelTitle}
        </span>
        {hasDraft && manuscript.stats && (
          <span className="text-xs text-gray-400">
            {ko.preview.stats(
              manuscript.stats.includedCount,
              manuscript.stats.supplementaryCount,
              manuscript.stats.excludedCount,
              manuscript.stats.figureCount,
            )}
          </span>
        )}
        {hasDraft && (
          <button
            onClick={() => window.print()}
            className="text-xs bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1 rounded text-gray-600 transition-colors"
          >
            {ko.preview.printBtn}
          </button>
        )}
      </div>

      {/* ── Generation toolbar (Korean UI) ───────────────── */}
      <GenerationToolbar
        draftInfo={draftInfo}
        isStale={isStale}
        generating={generating}
        onGenerate={onGenerate}
        hasDraft={hasDraft}
      />

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto sidebar-scroll bg-gray-100">

        {/* Empty state (Korean UI) */}
        {!hasDraft && !generating && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">{ko.preview.emptyTitle}</h3>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed mb-4">{ko.preview.emptyDesc}</p>
            <button
              onClick={() => onGenerate('full')}
              disabled={!!generating}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {ko.preview.emptyBtn}
            </button>
          </div>
        )}

        {/* Spinner before first draft */}
        {!hasDraft && generating && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600 mb-4" />
            <p className="text-sm">{ko.preview.generatingBtn}</p>
          </div>
        )}

        {/* Manuscript (academic English — nothing here is translated) */}
        {hasDraft && (
          <div className="print-page max-w-3xl mx-auto my-6 bg-white shadow-sm rounded-lg px-12 py-10 manuscript-body relative">

            {/* Overlay while updating a section */}
            {generating && (
              <div className="absolute inset-0 bg-white/60 rounded-lg flex items-center justify-center z-10">
                <div className="flex items-center gap-3 bg-white shadow-md rounded-lg px-5 py-3 border border-gray-200">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-200 border-t-blue-600" />
                  <span className="text-sm text-gray-600 font-medium">{overlayMsg}</span>
                </div>
              </div>
            )}

            {/* ── Title block (manuscript metadata — English) ─── */}
            {manuscript.meta && (
              <div className="text-center mb-6">
                <h1 className="manuscript-title">{manuscript.meta.title}</h1>
                {manuscript.meta.authors && (
                  <p className="text-sm text-gray-600 italic mt-2">{manuscript.meta.authors}</p>
                )}
                {manuscript.meta.institution && (
                  <p className="text-sm text-gray-500 mt-1">{manuscript.meta.institution}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{manuscript.meta.date}</p>
              </div>
            )}

            <hr className="border-gray-300 mb-6" />

            {/* ── Abstract ───── English content ─────────────── */}
            {manuscript.abstract ? (
              <>
                <SectionTitle title="Abstract" />
                <Para text={manuscript.abstract.text} />
                {manuscript.meta?.keywords && (
                  <p className="manuscript-keywords">
                    <strong>Keywords:</strong> {manuscript.meta.keywords}
                  </p>
                )}
                {/* UI timestamp — Korean */}
                <SectionTimestamp ts={draftInfo?.timestamps?.results} label={ko.preview.tsAbstractLabel} />
              </>
            ) : (
              <SectionGhost title="Abstract" />
            )}

            {/* ── 1. Introduction ── English content ─────────── */}
            {manuscript.introduction ? (
              <>
                <SectionTitle number="1" title="Introduction" />
                <SubTitle>Background</SubTitle>
                <Para text={manuscript.introduction.background} />
                <SubTitle>Research Objectives</SubTitle>
                <p className="manuscript-paragraph mb-2">
                  The present study was designed with the following specific objectives:
                </p>
                <ol className="list-decimal list-inside ml-4 mb-3 space-y-1">
                  {(manuscript.introduction.objectives || []).map((obj, i) => (
                    <li key={i} className="text-sm leading-relaxed"><TextBlock text={obj} /></li>
                  ))}
                </ol>
                <SubTitle>Significance</SubTitle>
                <Para text={manuscript.introduction.significance} />
              </>
            ) : (
              <SectionGhost title="1. Introduction" />
            )}

            {/* ── 2. Materials & Methods ── English content ──── */}
            {manuscript.materialsAndMethods ? (
              <>
                <SectionTitle number="2" title="Materials and Methods" />
                {(!manuscript.materialsAndMethods.methods || manuscript.materialsAndMethods.methods.length === 0) ? (
                  <ContentPlaceholder text="No methods have been assigned to included experiments. Assign methods and click 'Generate Methods' to populate this section." />
                ) : (
                  manuscript.materialsAndMethods.methods.map((method, mi) => (
                    <div key={method.id || mi} className="mb-5">
                      <SubTitle>2.{mi + 1} {method.name}</SubTitle>
                      {method.version > 1 && (
                        <span className="text-xs text-gray-400 italic">(v{method.version})</span>
                      )}
                      {method.objective && (
                        <p className="manuscript-paragraph mb-2">
                          <strong>Objective:</strong> {method.objective}
                        </p>
                      )}
                      {method.materials && method.materials.length > 0 && (
                        <>
                          <p className="font-semibold text-sm mb-1">Materials</p>
                          <ul className="list-disc list-inside ml-4 mb-3 space-y-0.5">
                            {method.materials.map((m, i) => (
                              <li key={i} className="text-sm leading-relaxed">{m}</li>
                            ))}
                          </ul>
                        </>
                      )}
                      {method.procedure && method.procedure.length > 0 && (
                        <>
                          <p className="font-semibold text-sm mb-1">Procedure</p>
                          <ol className="list-decimal list-inside ml-4 mb-3 space-y-1">
                            {method.procedure.map((s, i) => (
                              <li key={i} className="text-sm leading-relaxed">{s}</li>
                            ))}
                          </ol>
                        </>
                      )}
                      {method.usedIn && method.usedIn.length > 0 && (
                        <p className="text-xs text-gray-400 italic mt-1">
                          Applied in: {method.usedIn.join('; ')}.
                        </p>
                      )}
                    </div>
                  ))
                )}
                {/* UI timestamp — Korean */}
                <SectionTimestamp ts={draftInfo?.timestamps?.materialsAndMethods} label={ko.preview.tsMethodsLabel} />
              </>
            ) : (
              <SectionGhost title="2. Materials and Methods" onGenerate={() => onGenerate('materialsAndMethods')} />
            )}

            {/* ── 3. Results ── English content ──────────────── */}
            {manuscript.results ? (
              <>
                <SectionTitle number="3" title="Results" />
                {(!manuscript.results.experiments || manuscript.results.experiments.length === 0) &&
                 (!manuscript.results.pending     || manuscript.results.pending.length === 0) ? (
                  <ContentPlaceholder text="No experiments currently included. Add experiments with results and click 'Generate Results'." />
                ) : (
                  <>
                    {(manuscript.results.experiments || []).map((exp, ei) => (
                      <div key={exp.id || ei} className="mb-6">
                        <SubTitle>3.{ei + 1} {exp.name}</SubTitle>
                        {exp.conditions && (
                          <p className="text-xs text-gray-500 italic mb-2">Conditions: {exp.conditions}</p>
                        )}
                        <Para text={exp.formalText} />
                        {exp.figureNumber && (
                          <div className="manuscript-figure-legend">
                            <strong>Figure {exp.figureNumber}.</strong>{' '}
                            {exp.figureLegend || '[Figure legend — describe the figure content here]'}
                          </div>
                        )}
                      </div>
                    ))}
                    {manuscript.results.pending && manuscript.results.pending.length > 0 && (
                      <ContentPlaceholder
                        text={`Data pending for: ${manuscript.results.pending.join('; ')}.`}
                      />
                    )}
                  </>
                )}
                {/* UI timestamp — Korean */}
                <SectionTimestamp ts={draftInfo?.timestamps?.results} label={ko.preview.tsResultsLabel} />
              </>
            ) : (
              <SectionGhost title="3. Results" onGenerate={() => onGenerate('results')} />
            )}

            {/* ── 4. Discussion ── English content ───────────── */}
            {manuscript.discussion ? (
              <>
                <SectionTitle number="4" title="Discussion" />
                <Para text={manuscript.discussion.overview} />
                {manuscript.discussion.perExperiment && manuscript.discussion.perExperiment.length > 0 && (
                  <>
                    <SubTitle>Key Findings</SubTitle>
                    {manuscript.discussion.perExperiment.map((item, i) => (
                      <Para key={i} text={item.interpretation} />
                    ))}
                  </>
                )}
                <SubTitle>Comparison with Prior Literature</SubTitle>
                <Para text={manuscript.discussion.priorLiterature} />
                <SubTitle>Mechanistic Considerations</SubTitle>
                <Para text={manuscript.discussion.mechanisms} />
                <SubTitle>Limitations</SubTitle>
                <Para text={manuscript.discussion.limitations} />
                <SubTitle>Future Directions</SubTitle>
                <Para text={manuscript.discussion.futureDirections} />
                {/* UI timestamp — Korean */}
                <SectionTimestamp ts={draftInfo?.timestamps?.discussion} label={ko.preview.tsDiscussionLabel} />
              </>
            ) : (
              <SectionGhost title="4. Discussion" onGenerate={() => onGenerate('discussion')} />
            )}

            {/* ── 5. Conclusion ── English content ───────────── */}
            {manuscript.conclusion ? (
              <>
                <SectionTitle number="5" title="Conclusion" />
                <Para text={manuscript.conclusion} />
              </>
            ) : (
              <SectionGhost title="5. Conclusion" />
            )}

            {/* ── Supplementary ── English content ───────────── */}
            {manuscript.supplementary && manuscript.supplementary.length > 0 && (
              <>
                <SectionTitle title="Supplementary Materials" />
                {manuscript.supplementary.map((supp, si) => (
                  <div key={supp.id || si} className="mb-4">
                    <SubTitle>
                      Supplementary Figure S{supp.figureNumber || si + 1}: {supp.name}
                    </SubTitle>
                    {supp.conditions && (
                      <p className="text-xs text-gray-500 italic mb-1">Conditions: {supp.conditions}</p>
                    )}
                    {supp.formalText
                      ? <Para text={supp.formalText} />
                      : <ContentPlaceholder text="Results pending." />
                    }
                    {supp.figureLegend && (
                      <div className="manuscript-figure-legend">
                        <strong>Supplementary Figure S{supp.figureNumber || si + 1}.</strong>{' '}
                        {supp.figureLegend}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* ── References ── English content ──────────────── */}
            {manuscript.references && (
              <>
                <SectionTitle title="References" />
                <ol className="space-y-2">
                  {manuscript.references.map((ref, i) => (
                    <li key={i} className="manuscript-reference">{i + 1}. {ref}</li>
                  ))}
                </ol>
                <p className="manuscript-placeholder mt-3 text-xs">
                  Note: Replace citation placeholders with actual references using a reference manager (Zotero, Mendeley, EndNote).
                </p>
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
