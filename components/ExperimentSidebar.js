import { ko } from '../lib/ko';

// Status display config — values match DB, labels come from ko
const STATUS_META = {
  included:      { label: ko.status.included,      cls: 'status-included'       },
  excluded:      { label: ko.status.excluded,       cls: 'status-excluded'        },
  supplementary: { label: ko.status.supplementary,  cls: 'status-supplementary'  },
};

const STATUS_CYCLE = ['included', 'supplementary', 'excluded'];

// Group display order
const GROUPS = [
  { key: 'included',      label: ko.sidebar.groupIncluded      },
  { key: 'supplementary', label: ko.sidebar.groupSupplementary },
  { key: 'excluded',      label: ko.sidebar.groupExcluded      },
];

export default function ExperimentSidebar({
  experiments,
  results,
  selectedId,
  onSelect,
  onStatusChange,
  onDelete,
  onAdd,
}) {
  const byStatus = {
    included:      experiments.filter(e => e.status === 'included'),
    supplementary: experiments.filter(e => e.status === 'supplementary'),
    excluded:      experiments.filter(e => e.status === 'excluded'),
  };

  async function cycleStatus(exp, e) {
    e.stopPropagation();
    const nextIdx    = (STATUS_CYCLE.indexOf(exp.status) + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIdx];
    await onStatusChange(exp.id, nextStatus);
  }

  async function handleDelete(exp, e) {
    e.stopPropagation();
    if (!confirm(ko.sidebar.deleteConfirm(exp.name))) return;
    await onDelete(exp.id);
  }

  function ExperimentCard({ exp }) {
    const meta       = STATUS_META[exp.status] || STATUS_META.included;
    const hasResult  = results && results[exp.id] && results[exp.id].raw_text;
    const isSelected = selectedId === exp.id;

    return (
      <div
        className={`
          group relative rounded-md border cursor-pointer transition-all mb-2
          ${isSelected
            ? 'bg-blue-50 border-blue-300 shadow-sm'
            : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/40'}
        `}
        onClick={() => onSelect(exp)}
      >
        <div className="px-3 py-2.5">
          {/* Name row */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className={`text-sm font-medium leading-snug ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>
              {exp.name}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {/* Status cycle toggle */}
              <button
                onClick={(e) => cycleStatus(exp, e)}
                className={`text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${meta.cls}`}
                title={ko.sidebar.statusTooltip}
              >
                {meta.label}
              </button>
              {/* Delete */}
              <button
                onClick={(e) => handleDelete(exp, e)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-0.5"
                title={ko.sidebar.deleteTooltip}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Method & result status */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {exp.method_name
              ? <span className="truncate max-w-[120px]" title={exp.method_name}>⚗ {exp.method_name}</span>
              : <span className="italic">{ko.sidebar.noMethod}</span>
            }
            {hasResult
              ? <span className="text-emerald-600">● {ko.sidebar.hasResults}</span>
              : <span className="text-gray-300">○ {ko.sidebar.noResults}</span>
            }
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {ko.sidebar.header}
          </span>
          <span className="text-xs text-gray-400">
            {ko.sidebar.summary(byStatus.included.length, experiments.length)}
          </span>
        </div>
      </div>

      {/* Experiment list */}
      <div className="flex-1 overflow-y-auto sidebar-scroll px-3 py-3">
        {experiments.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p className="text-sm mb-1">{ko.sidebar.noExperiments}</p>
            <p className="text-xs">{ko.sidebar.noExperimentsHint}</p>
          </div>
        ) : (
          GROUPS.map(({ key, label }) =>
            byStatus[key].length > 0 ? (
              <div key={key} className="mb-4">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 px-1">
                  {ko.sidebar.groupLabel(label, byStatus[key].length)}
                </p>
                {byStatus[key].map(exp => (
                  <ExperimentCard key={exp.id} exp={exp} />
                ))}
              </div>
            ) : null
          )
        )}
      </div>

      {/* Add button */}
      <div className="px-3 py-3 border-t border-gray-200 shrink-0">
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {ko.sidebar.addBtn}
        </button>
      </div>
    </div>
  );
}
