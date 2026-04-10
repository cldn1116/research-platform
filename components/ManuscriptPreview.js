import React from 'react';
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

// ── Reusable AI button (violet) ────────────────────────────────────────────
function AiButton({ section, label, tip, tsKey, aiGenerating, generating, onAiGenerate, ts }) {
  const isRunning = aiGenerating === section;
  const spinIcon = (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
  const sparkIcon = (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
  return (
    <div className="flex flex-col items-start shrink-0">
      <button
        onClick={() => onAiGenerate(false, section)}
        disabled={!!generating || !!aiGenerating}
        title={tip}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-700 text-white"
      >
        {isRunning ? spinIcon : sparkIcon}
        {isRunning ? ko.preview.aiGeneratingBtn : label}
      </button>
      {ts[tsKey] && (
        <span className="text-gray-400 mt-0.5 pl-0.5" style={{ fontSize: '10px' }}>
          {relativeTime(ts[tsKey])}
        </span>
      )}
    </div>
  );
}

function GenerationToolbar({ draftInfo, isStale, generating, onGenerate, hasDraft, aiGenerating, onAiGenerate, hasAiContent }) {
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
          const anyRunning = !!generating || aiGenerating;
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

        {/* ── AI generation buttons (paper flow order) ───────── */}
        <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />

        {/* AI Abstract */}
        <AiButton
          section="abstract"
          label={ko.preview.btnAiAbstract}
          tip={ko.preview.tipAiAbstract}
          tsKey="abstract_ai"
          aiGenerating={aiGenerating}
          generating={generating}
          onAiGenerate={onAiGenerate}
          ts={ts}
        />

        {/* AI Introduction */}
        <AiButton
          section="introduction"
          label={ko.preview.btnAiIntroduction}
          tip={ko.preview.tipAiIntroduction}
          tsKey="introduction_ai"
          aiGenerating={aiGenerating}
          generating={generating}
          onAiGenerate={onAiGenerate}
          ts={ts}
        />

        {/* AI Methods */}
        <AiButton
          section="methods"
          label={ko.preview.btnAiMethods}
          tip={ko.preview.tipAiMethods}
          tsKey="methods_ai"
          aiGenerating={aiGenerating}
          generating={generating}
          onAiGenerate={onAiGenerate}
          ts={ts}
        />

        {/* AI Results & Discussion */}
        <AiButton
          section="results_discussion"
          label={ko.preview.btnAiGenerate}
          tip={ko.preview.tipAiGenerate}
          tsKey="results_ai"
          aiGenerating={aiGenerating}
          generating={generating}
          onAiGenerate={onAiGenerate}
          ts={ts}
        />

        {/* Regenerate — shown when any AI content exists */}
        {hasAiContent && (
          <button
            onClick={() => onAiGenerate(true, 'results_discussion')}
            disabled={!!generating || !!aiGenerating}
            title={ko.preview.tipAiRegenerate}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-violet-300 text-violet-700 hover:bg-violet-50 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {ko.preview.btnAiRegenerate}
          </button>
        )}

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

// ── Draft Chat Editor panel (UI shell — not yet functional) ───────────────
function ChatPanel({ onClose }) {
  return (
    <div className="flex flex-col h-full border-l border-gray-200 bg-white w-72 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            {ko.chat.panelTitle}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
          title={ko.chat.closeBtn}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Coming soon placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 bg-violet-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-600 mb-2">{ko.chat.comingSoon}</p>
        <p className="text-xs text-gray-400 leading-relaxed">{ko.chat.comingSoonDesc}</p>
      </div>

      {/* Input area (disabled) */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-100 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            disabled
            placeholder={ko.chat.placeholder}
            className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-xs bg-gray-50 text-gray-400 cursor-not-allowed"
          />
          <button
            disabled
            className="bg-violet-200 text-violet-400 cursor-not-allowed text-xs font-semibold px-3 py-2 rounded-md"
          >
            {ko.chat.sendBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManuscriptPreview({
  manuscript,
  draftInfo,
  isStale,
  generating,
  aiGenerating,
  project,
  results,       // raw results map keyed by experiment_id — used for growth curve display
  onGenerate,
  onAiGenerate,
}) {
  const [showChat, setShowChat] = React.useState(false);

  const hasDraft     = !!manuscript;
  const hasAiContent = !!(
    manuscript?.results_ai   ||
    manuscript?.discussion_ai ||
    manuscript?.introduction_ai ||
    manuscript?.methods_ai    ||
    manuscript?.abstract_ai
  );

  // Build map: experiment id → AI formalText (for Results section)
  const aiExpMap = {};
  if (manuscript?.results_ai?.experiments) {
    manuscript.results_ai.experiments.forEach(e => { aiExpMap[e.id] = e.formalText; });
  }

  // Build map: method id → AI content (for Methods section)
  const aiMethodMap = {};
  if (manuscript?.methods_ai?.methods) {
    manuscript.methods_ai.methods.forEach(m => { aiMethodMap[m.id] = m; });
  }

  // Overlay message while generating
  let overlayMsg = null;
  if (aiGenerating === 'abstract') {
    overlayMsg = ko.preview.aiAbstractOverlayMsg;
  } else if (aiGenerating === 'introduction') {
    overlayMsg = ko.preview.aiIntroOverlayMsg;
  } else if (aiGenerating === 'methods') {
    overlayMsg = ko.preview.aiMethodsOverlayMsg;
  } else if (aiGenerating) {
    overlayMsg = ko.preview.aiOverlayMsg;
  } else if (generating) {
    overlayMsg = generating === 'full'
      ? ko.preview.updatingFull
      : ko.preview.updatingSection(ko.preview.sectionNames[generating] || generating);
  }

  return (
    <div className="h-full flex flex-row overflow-hidden">

    {/* ── Main preview column ──────────────────────────── */}
    <div className="flex-1 flex flex-col overflow-hidden">

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChat(c => !c)}
            className={`text-xs border px-3 py-1 rounded transition-colors ${
              showChat
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-600'
            }`}
          >
            {ko.chat.openBtn}
          </button>
          {hasDraft && (
            <button
              onClick={() => window.print()}
              className="text-xs bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1 rounded text-gray-600 transition-colors"
            >
              {ko.preview.printBtn}
            </button>
          )}
        </div>
      </div>

      {/* ── Generation toolbar (Korean UI) ───────────────── */}
      <GenerationToolbar
        draftInfo={draftInfo}
        isStale={isStale}
        generating={generating}
        onGenerate={onGenerate}
        hasDraft={hasDraft}
        aiGenerating={aiGenerating}
        onAiGenerate={onAiGenerate}
        hasAiContent={hasAiContent}
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
        {!hasDraft && (generating || aiGenerating) && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600 mb-4" />
            <p className="text-sm">{ko.preview.generatingBtn}</p>
          </div>
        )}

        {/* Manuscript (academic English — nothing here is translated) */}
        {hasDraft && (
          <div className="print-page max-w-3xl mx-auto my-6 bg-white shadow-sm rounded-lg px-12 py-10 manuscript-body relative">

            {/* Overlay while updating a section (rule-based or AI) */}
            {(generating || aiGenerating) && (
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
            {(manuscript.abstract_ai || manuscript.abstract) ? (
              <>
                <SectionTitle title="Abstract" />
                {manuscript.abstract_ai ? (
                  <>
                    <div className="inline-flex items-center gap-1 text-xs text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded mb-3 no-print">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      {ko.preview.aiBadge}
                    </div>
                    <Para text={manuscript.abstract_ai.text} />
                    <SectionTimestamp ts={draftInfo?.timestamps?.abstract_ai} label={ko.preview.tsAiAbstractLabel} />
                  </>
                ) : (
                  <>
                    <Para text={manuscript.abstract.text} />
                    <SectionTimestamp ts={draftInfo?.timestamps?.results} label={ko.preview.tsAbstractLabel} />
                  </>
                )}
                {manuscript.meta?.keywords && (
                  <p className="manuscript-keywords">
                    <strong>Keywords:</strong> {manuscript.meta.keywords}
                  </p>
                )}
              </>
            ) : (
              <SectionGhost title="Abstract" onGenerate={() => onAiGenerate(false, 'abstract')} />
            )}

            {/* ── 1. Introduction ── English content ─────────── */}
            {(manuscript.introduction_ai || manuscript.introduction) ? (
              <>
                <SectionTitle number="1" title="Introduction" />

                {manuscript.introduction_ai ? (
                  // ── AI-generated Introduction ──────────────────
                  <>
                    <div className="inline-flex items-center gap-1 text-xs text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded mb-3 no-print">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      {ko.preview.aiBadge}
                    </div>
                    <SubTitle>Background</SubTitle>
                    <Para text={manuscript.introduction_ai.background} />
                    <SubTitle>Research Gap</SubTitle>
                    <Para text={manuscript.introduction_ai.researchGap} />
                    <SubTitle>Objectives</SubTitle>
                    <Para text={manuscript.introduction_ai.objectives} />
                    <SectionTimestamp ts={draftInfo?.timestamps?.introduction_ai} label={ko.preview.tsAiIntroLabel} />
                  </>
                ) : (
                  // ── Rule-based Introduction ────────────────────
                  <>
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
                )}
              </>
            ) : (
              <SectionGhost title="1. Introduction" />
            )}

            {/* ── 2. Materials & Methods ── English content ──── */}
            {(manuscript.materialsAndMethods || manuscript.methods_ai) ? (
              <>
                <SectionTitle number="2" title="Materials and Methods" />

                {/* AI badge */}
                {manuscript.methods_ai && (
                  <div className="inline-flex items-center gap-1 text-xs text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded mb-3 no-print">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {ko.preview.aiBadge}
                  </div>
                )}

                {(() => {
                  // Determine which method list to render from
                  // Use rule-based list if available (has usedIn, display order); fall back to AI list
                  const baseMethods = manuscript.materialsAndMethods?.methods?.length > 0
                    ? manuscript.materialsAndMethods.methods
                    : manuscript.methods_ai?.methods ?? [];

                  if (baseMethods.length === 0) {
                    return (
                      <ContentPlaceholder text="No methods have been assigned to included experiments. Assign methods and click 'Generate Methods' to populate this section." />
                    );
                  }

                  return baseMethods.map((method, mi) => {
                    // Overlay AI content when available for this method id
                    const ai = aiMethodMap[method.id];
                    const objective = ai?.objective || method.objective || '';
                    const materials = ai?.materials?.length  ? ai.materials  : (method.materials || []);
                    const procedure = ai?.procedure?.length  ? ai.procedure  : (method.procedure || []);

                    return (
                      <div key={method.id || mi} className="mb-5">
                        <SubTitle>2.{mi + 1} {method.name}</SubTitle>
                        {method.version > 1 && (
                          <span className="text-xs text-gray-400 italic">(v{method.version})</span>
                        )}
                        {objective && (
                          <p className="manuscript-paragraph mb-2">
                            <strong>Objective:</strong> {objective}
                          </p>
                        )}
                        {materials.length > 0 && (
                          <>
                            <p className="font-semibold text-sm mb-1">Materials</p>
                            <ul className="list-disc list-inside ml-4 mb-3 space-y-0.5">
                              {materials.map((m, i) => (
                                <li key={i} className="text-sm leading-relaxed">{m}</li>
                              ))}
                            </ul>
                          </>
                        )}
                        {procedure.length > 0 && (
                          <>
                            <p className="font-semibold text-sm mb-1">Procedure</p>
                            <ol className="list-decimal list-inside ml-4 mb-3 space-y-1">
                              {procedure.map((s, i) => (
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
                    );
                  });
                })()}

                <SectionTimestamp ts={draftInfo?.timestamps?.materialsAndMethods} label={ko.preview.tsMethodsLabel} />
                {manuscript.methods_ai && (
                  <SectionTimestamp ts={draftInfo?.timestamps?.methods_ai} label={ko.preview.tsAiMethodsLabel} />
                )}
              </>
            ) : (
              <SectionGhost title="2. Materials and Methods" onGenerate={() => onGenerate('materialsAndMethods')} />
            )}

            {/* ── 3. Results ── English content ──────────────── */}
            {(manuscript.results || manuscript.results_ai) ? (
              <>
                <SectionTitle number="3" title="Results" />

                {/* AI badge */}
                {manuscript.results_ai && (
                  <div className="inline-flex items-center gap-1 text-xs text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded mb-3 no-print">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {ko.preview.aiBadge}
                  </div>
                )}

                {manuscript.results ? (
                  // Full rendering: rule-based structure + AI formalText when available
                  <>
                    {(!manuscript.results.experiments || manuscript.results.experiments.length === 0) &&
                     (!manuscript.results.pending     || manuscript.results.pending.length === 0) ? (
                      <ContentPlaceholder text="No experiments currently included. Add experiments with results and click 'Generate Results'." />
                    ) : (
                      <>
                        {(manuscript.results.experiments || []).map((exp, ei) => {
                          const rawResult    = results?.[exp.id];
                          const gcd          = rawResult?.growth_curve_data;
                          const gcParams     = gcd?.params;
                          const figNum       = exp.figureNumber || (gcParams ? ei + 1 : null);
                          const autoLegend   = gcParams
                            ? `Growth kinetics of ${exp.name}. μmax = ${gcParams.muMax} h⁻¹, lag phase = ${gcParams.lagPhase} h, maximum ${gcd.unit || 'OD'} = ${gcParams.maxValue}.`
                            : null;
                          return (
                            <div key={exp.id || ei} className="mb-6">
                              <SubTitle>3.{ei + 1} {exp.name}</SubTitle>
                              {exp.conditions && (
                                <p className="text-xs text-gray-500 italic mb-2">Conditions: {exp.conditions}</p>
                              )}
                              {/* Use AI-generated formalText when available, otherwise fall back to rule-based */}
                              <Para text={aiExpMap[exp.id] || exp.formalText} />
                              {/* Figure legend: explicit > auto-generated from growth curve */}
                              {(exp.figureNumber || gcParams) && (
                                <div className="manuscript-figure-legend">
                                  <strong>Figure {figNum}.</strong>{' '}
                                  {exp.figureLegend || autoLegend || '[Figure legend]'}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {manuscript.results.pending && manuscript.results.pending.length > 0 && (
                          <ContentPlaceholder
                            text={`Data pending for: ${manuscript.results.pending.join('; ')}.`}
                          />
                        )}
                      </>
                    )}
                    <SectionTimestamp ts={draftInfo?.timestamps?.results} label={ko.preview.tsResultsLabel} />
                    {manuscript.results_ai && (
                      <SectionTimestamp ts={draftInfo?.timestamps?.results_ai} label={ko.preview.tsAiLabel} />
                    )}
                  </>
                ) : (
                  // AI-only rendering (no rule-based draft yet)
                  <>
                    {(manuscript.results_ai.experiments || []).map((exp, ei) => {
                      const rawResult = results?.[exp.id];
                      const gcd       = rawResult?.growth_curve_data;
                      const gcParams  = gcd?.params;
                      return (
                        <div key={exp.id || ei} className="mb-6">
                          <SubTitle>3.{ei + 1} {exp.name || `Experiment ${exp.id}`}</SubTitle>
                          <Para text={exp.formalText} />
                          {gcParams && (
                            <div className="manuscript-figure-legend">
                              <strong>Figure {ei + 1}.</strong>{' '}
                              {`Growth kinetics of ${exp.name || `Experiment ${exp.id}`}. μmax = ${gcParams.muMax} h⁻¹, lag phase = ${gcParams.lagPhase} h, maximum ${gcd.unit || 'OD'} = ${gcParams.maxValue}.`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <SectionTimestamp ts={draftInfo?.timestamps?.results_ai} label={ko.preview.tsAiLabel} />
                  </>
                )}
              </>
            ) : (
              <SectionGhost title="3. Results" onGenerate={() => onGenerate('results')} />
            )}

            {/* ── 4. Discussion ── English content ───────────── */}
            {(manuscript.discussion_ai || manuscript.discussion) ? (
              <>
                <SectionTitle number="4" title="Discussion" />

                {manuscript.discussion_ai ? (
                  // ── AI-generated Discussion ────────────────────
                  <>
                    <div className="inline-flex items-center gap-1 text-xs text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded mb-3 no-print">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      {ko.preview.aiBadge}
                    </div>
                    <Para text={manuscript.discussion_ai.overview} />
                    {manuscript.discussion_ai.perExperiment?.length > 0 && (
                      <>
                        <SubTitle>Key Findings</SubTitle>
                        {manuscript.discussion_ai.perExperiment.map((item, i) => (
                          <div key={i} className="mb-4">
                            <p className="font-semibold text-sm text-gray-700 mb-1">{item.name}</p>
                            <Para text={item.interpretation} />
                          </div>
                        ))}
                      </>
                    )}
                    {manuscript.discussion_ai.limitations && (
                      <>
                        <SubTitle>Limitations</SubTitle>
                        <Para text={manuscript.discussion_ai.limitations} />
                      </>
                    )}
                    {manuscript.discussion_ai.futureDirections && (
                      <>
                        <SubTitle>Future Directions</SubTitle>
                        <Para text={manuscript.discussion_ai.futureDirections} />
                      </>
                    )}
                    <SectionTimestamp ts={draftInfo?.timestamps?.discussion_ai} label={ko.preview.tsAiLabel} />
                  </>
                ) : (
                  // ── Rule-based Discussion ──────────────────────
                  <>
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
                    <SectionTimestamp ts={draftInfo?.timestamps?.discussion} label={ko.preview.tsDiscussionLabel} />
                  </>
                )}
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

    {/* ── Chat panel (toggleable) ─────────────────────── */}
    {showChat && <ChatPanel onClose={() => setShowChat(false)} />}

    </div>
  );
}
