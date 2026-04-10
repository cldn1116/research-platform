import { ko } from '../lib/ko';

// Status display config — values match DB, labels come from ko
const STATUS_META = {
  included:      { label: ko.status.included,      cls: 'status-included'       },
  excluded:      { label: ko.status.excluded,       cls: 'status-excluded'        },
  supplementary: { label: ko.status.supplementary,  cls: 'status-supplementary'  },
};

const STATUS_CYCLE = ['included', 'supplementary', 'excluded'];

// Group display order
const STATUS_GROUPS = [
  { key: 'included',      label: ko.sidebar.groupIncluded      },
  { key: 'supplementary', label: ko.sidebar.groupSupplementary },
  { key: 'excluded',      label: ko.sidebar.groupExcluded      },
];

export default function ExperimentSidebar({
  experiments,
  results,
  groups,
  selectedId,
  onSelect,
  onStatusChange,
  onDelete,
  onAdd,
  onGroupCreate,
  onGroupDelete,
  onGroupRename,
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

  async function handleNewGroup() {
    const name = prompt(ko.sidebar.newGroupPrompt);
    if (name?.trim()) await onGroupCreate(name.trim());
  }

  async function handleRenameGroup(group, e) {
    e.stopPropagation();
    const name = prompt(ko.sidebar.renameGroupPrompt, group.name);
    if (name?.trim() && name.trim() !== group.name) await onGroupRename(group.id, name.trim());
  }

  async function handleDeleteGroup(group, e) {
    e.stopPropagation();
    if (!confirm(ko.sidebar.deleteGroupConfirm(group.name))) return;
    await onGroupDelete(group.id);
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

  // Render experiments within a status section, grouped by group_id
  function StatusSection({ statusKey, statusLabel }) {
    const statusExps = byStatus[statusKey];
    if (statusExps.length === 0) return null;

    // Partition by group
    const byGroupId = {};
    statusExps.forEach(exp => {
      const gid = exp.group_id ?? 'ungrouped';
      if (!byGroupId[gid]) byGroupId[gid] = [];
      byGroupId[gid].push(exp);
    });

    const groupsWithExps = (groups || []).filter(g => byGroupId[g.id]?.length > 0);
    const ungroupedExps  = byGroupId['ungrouped'] || [];
    const hasAnyGroups   = groupsWithExps.length > 0;

    return (
      <div className="mb-4">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 px-1">
          {ko.sidebar.groupLabel(statusLabel, statusExps.length)}
        </p>

        {/* Grouped experiments */}
        {groupsWithExps.map(g => (
          <div key={g.id} className="mb-2">
            <div className="flex items-center gap-1 px-1 mb-1 group/grp">
              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              <span className="text-xs font-medium text-gray-600 flex-1 truncate">{g.name}</span>
              {/* Rename / delete buttons — visible on hover */}
              {onGroupRename && (
                <button
                  onClick={(e) => handleRenameGroup(g, e)}
                  className="opacity-0 group-hover/grp:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity p-0.5"
                  title="그룹 이름 변경"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {onGroupDelete && (
                <button
                  onClick={(e) => handleDeleteGroup(g, e)}
                  className="opacity-0 group-hover/grp:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-0.5"
                  title="그룹 삭제"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="pl-3 border-l border-gray-100 ml-1.5">
              {byGroupId[g.id].map(exp => (
                <ExperimentCard key={exp.id} exp={exp} />
              ))}
            </div>
          </div>
        ))}

        {/* Ungrouped experiments */}
        {ungroupedExps.length > 0 && (
          <div>
            {hasAnyGroups && (
              <p className="text-xs text-gray-300 px-1 mb-1 italic">{ko.sidebar.ungrouped}</p>
            )}
            {ungroupedExps.map(exp => (
              <ExperimentCard key={exp.id} exp={exp} />
            ))}
          </div>
        )}
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {ko.sidebar.summary(byStatus.included.length, experiments.length)}
            </span>
            {onGroupCreate && (
              <button
                onClick={handleNewGroup}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                title={ko.sidebar.newGroupBtn}
              >
                {ko.sidebar.newGroupBtn}
              </button>
            )}
          </div>
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
          STATUS_GROUPS.map(({ key, label }) => (
            <StatusSection key={key} statusKey={key} statusLabel={label} />
          ))
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
