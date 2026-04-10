/**
 * Korean UI Translation Dictionary
 *
 * ALL user-facing interface text lives here.
 * Manuscript content (generated academic English) is never translated.
 *
 * Naming convention:
 *   ko.<area>.<key>           → string
 *   ko.<area>.<key>(arg, …)   → function returning string
 */

export const ko = {

  // ── Common ─────────────────────────────────────────────────────────────────
  common: {
    save:       '저장',
    saving:     '저장 중…',
    cancel:     '취소',
    delete:     '삭제',
    edit:       '편집',
    add:        '추가',
    create:     '생성',
    loading:    '불러오는 중…',
    close:      '닫기',
    optional:   '(선택사항)',
    version:    (v) => `v${v}`,
  },

  // ── Status labels (experiment inclusion state) ─────────────────────────────
  status: {
    included:      '포함',
    excluded:      '제외',
    supplementary: '보조자료',
  },

  // ── Relative timestamps ───────────────────────────────────────────────────
  time: {
    justNow:    '방금',
    minutesAgo: (m) => `${m}분 전`,
    hoursAgo:   (h) => `${h}시간 전`,
    daysAgo:    (d) => `${d}일 전`,
  },

  // ── Home page ─────────────────────────────────────────────────────────────
  home: {
    platformTitle:    '연구 원고 플랫폼',
    platformSubtitle: '실험 기반 과학 논문 작성 시스템',
    newProject:       '새 프로젝트',
    projectList:      (n) => `프로젝트 목록 (${n}개)`,
    loading:          '프로젝트 불러오는 중…',
    noProjects:       '아직 프로젝트가 없습니다.',
    noProjectsDesc:   '첫 번째 연구 프로젝트를 생성하세요. 각 프로젝트는 실험 데이터를 기반으로 하나의 과학 논문이 됩니다.',
    createFirst:      '첫 프로젝트 만들기',
    nIncluded:        (n) => `${n}개 포함`,
    nExperiments:     (n) => `실험 ${n}개`,
    deleteTooltip:    '프로젝트 삭제',
    deleteConfirm:    (title) =>
      `"${title}" 프로젝트를 삭제하시겠습니까?\n모든 실험 및 결과가 영구적으로 삭제됩니다.`,
  },

  // ── New project modal ─────────────────────────────────────────────────────
  newProject: {
    modalTitle:          '새 연구 프로젝트',
    titleLabel:          '프로젝트 / 원고 제목 *',
    titlePlaceholder:    '예: Saccharomyces cerevisiae의 에탄올 생산 최적화',
    topicLabel:          '연구 주제 / 핵심 내용',
    topicPlaceholder:    '예: 미생물 발효 동역학 및 대사산물 생산',
    topicHint:           '논문 전체(서론, 토론, 결론)에 사용됩니다.',
    authorsLabel:        '저자',
    authorsPlaceholder:  '예: 홍길동, 김철수',
    institutLabel:       '소속 기관',
    institutPlaceholder: '예: 한국과학기술원',
    keywordsLabel:       '키워드',
    keywordsPlaceholder: '예: 발효; 에탄올; 동역학; 효모',
    createBtn:           '프로젝트 생성 및 편집기 열기',
    creating:            '생성 중…',
  },

  // ── Project editor (pages/projects/[id].js) ───────────────────────────────
  editor: {
    loadingProject:      '프로젝트 불러오는 중…',
    backTooltip:         '프로젝트 목록으로',
    experimentsTab:      (n) => `실험 (${n}개)`,
    methodsTab:          (n) => `방법 (${n}개)`,
    previewTab:          '미리보기',
    methodsHint:         '방법은 재사용 가능한 템플릿입니다. 실험에 방법을 지정하면 재료 및 방법 섹션이 자동으로 채워집니다.',
    noMethods:           '아직 방법이 없습니다.',
    noMethodsHint:       '방법을 생성하여 시작하세요.',
    newMethodBtn:        '새 방법',
    usedBy:              (n) => n === 1 ? '실험 1개에서 사용 중' : `실험 ${n}개에서 사용 중`,
    editMethodTooltip:   '방법 편집',
    deleteMethodTooltip: '방법 삭제',
    deleteMethodConfirm: '이 방법을 삭제하시겠습니까?\n방법이 실험에서 해제되지만 실험 데이터는 유지됩니다.',
    printBtn:            '인쇄 / PDF',
    exportDocxBtn:       '.docx 내보내기',
    exportDocxHint:      '먼저 초안을 생성하세요',
    // Project settings modal
    settingsTitle:       '프로젝트 설정',
    settingsTitleLabel:  '원고 제목 *',
    settingsTopicLabel:  '연구 주제 / 핵심 내용',
    settingsAuthors:     '저자',
    settingsInstitut:    '소속 기관',
    settingsKeywords:    '키워드',
    saveChanges:         '변경 저장',
    // Modals opened from editor
    addExpTitle:         '실험 추가',
    editExpTitle:        '실험 편집',
    newMethodTitle:      '새 방법 생성',
    editMethodTitle:     '방법 편집',
  },

  // ── Experiment sidebar ────────────────────────────────────────────────────
  sidebar: {
    header:             '실험 목록',
    summary:            (inc, total) => `${inc}개 포함 · 전체 ${total}개`,
    noExperiments:      '아직 실험이 없습니다.',
    noExperimentsHint:  "'실험 추가' 버튼을 클릭하여 시작하세요.",
    groupIncluded:      '원고에 포함',
    groupSupplementary: '보조자료',
    groupExcluded:      '제외됨',
    groupLabel:         (label, n) => `${label} (${n}개)`,
    noMethod:           '방법 없음',
    hasResults:         '결과 있음',
    noResults:          '결과 없음',
    deleteTooltip:      '실험 삭제',
    statusTooltip:      '클릭하여 상태 변경',
    deleteConfirm:      (name) =>
      `"${name}" 실험을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
    addBtn:             '실험 추가',
    // Groups
    newGroupBtn:        '+ 새 그룹',
    ungrouped:          '미분류',
    deleteGroupConfirm: (name) => `"${name}" 그룹을 삭제하시겠습니까?\n실험들은 미분류로 이동됩니다.`,
    newGroupPrompt:     '새 그룹 이름을 입력하세요:',
    renameGroupPrompt:  '그룹 이름을 입력하세요:',
  },

  // ── Experiment form ───────────────────────────────────────────────────────
  expForm: {
    nameLabel:           '실험 이름 *',
    namePlaceholder:     '예: 에탄올 발효 – 37°C',
    methodLabel:         '방법',
    noMethod:            '— 없음 —',
    statusLabel:         '상태',
    conditionsLabel:     '실험 조건',
    conditionsPlaceholder: '예: pH 7.0, 37°C, 혐기성, 72시간',
    resultsLabel:        '결과 — 자연어 입력',
    resultsHint:         '자동으로 학술 영어로 변환됩니다',
    resultsPlaceholder:
      '결과를 일반 언어로 설명하세요:\n\n' +
      'OD가 24시간까지 급격히 증가한 뒤 정체되었습니다. ' +
      '에탄올은 후기 성장 단계에서 증가하였고, ' +
      '포도당 농도는 48시간까지 0으로 감소하였습니다.',
    previewBtn:          '✦ 학술 버전 미리보기',
    previewSaveFirst:    '미리보기 전에 먼저 실험을 저장하세요',
    formalizing:         '변환 중…',
    hideBtn:             '숨기기',
    formalLabel:         '자동 생성된 학술 버전',
    formalEditHint:      '아래에서 직접 편집할 수 있습니다',
    groupLabel:          '그룹',
    noGroup:             '— 없음 —',
    legendLabel:         '그림 범례',
    legendPlaceholder:   '예: 37°C 회분식 발효 중 성장 곡선 및 에탄올 생산량.',
    saveBtn:             '변경 저장',
    addBtn:              '실험 추가',
    saving:              '저장 중…',
  },

  // ── Growth curve builder ──────────────────────────────────────────────────
  growthCurve: {
    tabLabel:        '성장 곡선',
    selectExp:       '실험 선택',
    noExpSelected:   '왼쪽에서 실험을 선택하거나 아래에서 선택하세요.',
    timeLabel:       '시간 (h)',
    timePlaceholder: '예: 0, 2, 4, 6, 8, 12, 24',
    valueLabel:      '측정값 (OD, CFU 등)',
    valuePlaceholder:'예: 0.05, 0.12, 0.34, 0.67, 1.02, 1.18',
    unitLabel:       '단위',
    unitPlaceholder: '예: OD600',
    parseHint:       '쉼표(,) 또는 탭으로 구분 · 엑셀에서 붙여넣기 가능',
    parseError:      '숫자를 파싱할 수 없습니다. 쉼표 또는 탭으로 구분된 숫자를 입력하세요.',
    lengthMismatch:  '시간과 측정값의 개수가 다릅니다.',
    minPoints:       '데이터 포인트가 최소 3개 이상 필요합니다.',
    drawBtn:         '그래프 그리기',
    saveBtn:         '성장 곡선 저장',
    saving:          '저장 중…',
    savedOk:         '저장됨',
    muMax:           (v) => `μmax = ${v} h⁻¹`,
    lagPhase:        (v) => `지연기 = ${v} h`,
    maxValue:        (v) => `최대값 = ${v}`,
    noData:          '저장된 성장 곡선 데이터가 없습니다.',
    clearConfirm:    '성장 곡선 데이터를 초기화하시겠습니까?',
  },

  // ── Draft chat editor ─────────────────────────────────────────────────────
  chat: {
    panelTitle:    '초안 채팅 편집',
    openBtn:       '채팅 편집',
    closeBtn:      '닫기',
    comingSoon:    '준비 중인 기능입니다.',
    comingSoonDesc:'원고 섹션을 클릭하고 AI와 대화하며 내용을 수정하는 기능을 곧 제공합니다.',
    placeholder:   '수정 요청을 입력하세요… (예: 더 간결하게 써줘)',
    sendBtn:       '전송',
  },

  // ── Method editor form ────────────────────────────────────────────────────
  methodForm: {
    nameLabel:            '방법 이름 *',
    namePlaceholder:      '예: 발효 성장 측정법',
    objectiveLabel:       '목표',
    objectivePlaceholder: '예: 혐기성 조건에서 박테리아 성장 동역학 측정',
    materialsLabel:       '재료',
    materialsHint:        '한 줄에 하나씩 입력. 원고에서 목록 형식으로 표시됩니다.',
    materialsPlaceholder: 'LB 배지\n500 mL 삼각 플라스크\n분광광도계\n37°C 진탕 배양기',
    procedureLabel:       '실험 절차',
    procedureHint:        '각 단계를 한 줄씩 입력. 원고에서 자동으로 번호가 매겨집니다.',
    procedurePlaceholder: '배양액 1% v/v를 LB 배지 100 mL에 접종\n200 rpm으로 진탕하며 37°C에서 배양\n24시간 동안 2시간마다 OD600 측정\n모든 측정값을 이중으로 기록',
    versionNote:          (v) => `버전 ${v} — 저장 시 버전이 업데이트됩니다.`,
    updateBtn:            '방법 업데이트',
    createBtn:            '방법 생성',
    saving:               '저장 중…',
  },

  // ── Manuscript preview panel ──────────────────────────────────────────────
  preview: {
    panelTitle:    '원고 미리보기',
    stats:         (inc, supp, exc, figs) =>
      `${inc}개 포함 · 보조 ${supp}개 · 제외 ${exc}개 · 그림 ${figs}개`,
    printBtn:      '인쇄 / PDF',

    // Generation toolbar
    generateLabel: '섹션 생성:',
    btnMethods:    '방법 생성',
    btnResults:    '결과 생성',
    btnDiscussion: '토론 생성',
    btnFull:       '전체 초안 생성',
    tipMethods:    'Materials & Methods 섹션을 방법 템플릿으로 재생성합니다',
    tipResults:    '저장된 실험 결과로 Results 섹션을 재생성합니다',
    tipDiscussion: 'Discussion 및 Conclusion 섹션을 재생성합니다',
    tipFull:       '모든 섹션을 처음부터 생성합니다 (처음 사용 시 권장)',
    generatingBtn: '생성 중…',

    // Staleness
    staleWarning:  '마지막 생성 이후 데이터가 변경되었습니다. 아래 버튼을 클릭하여 초안을 업데이트하세요.',

    // Draft age labels
    fullDraftAge:  (t) => `전체 초안: ${t}`,
    noDraftAge:    '"전체 초안 생성"을 클릭하세요',

    // Generating overlay
    updatingFull:    '전체 초안 업데이트 중…',
    updatingSection: (name) => `${name} 섹션 업데이트 중…`,
    sectionNames: {
      materialsAndMethods: 'Methods',
      results:             'Results',
      discussion:          'Discussion',
    },

    // Empty state (no draft yet)
    emptyTitle:  '아직 생성된 초안이 없습니다',
    emptyDesc:
      '왼쪽 패널에서 실험과 방법을 추가한 뒤, ' +
      '위의 전체 초안 생성 버튼을 클릭하여 원고를 생성하세요. ' +
      '데이터는 즉시 저장되며, 생성은 항상 명시적으로 실행됩니다.',
    emptyBtn:    '전체 초안 생성',

    // Per-section timestamps
    tsMethodsLabel:    '방법 최종 생성',
    tsResultsLabel:    '결과 최종 생성',
    tsDiscussionLabel: '토론 최종 생성',
    tsAbstractLabel:   '초록 최종 업데이트',

    // Ghost section
    ghostMsg:     '이 섹션은 아직 생성되지 않았습니다.',
    ghostBtn:     '지금 생성 →',

    // AI generation — Results & Discussion
    btnAiGenerate:          'AI Results & Discussion',
    btnAiRegenerate:        '↻ 재생성',
    tipAiGenerate:          'Claude AI로 Results & Discussion을 생성합니다. 동일한 데이터면 저장된 결과를 재사용합니다.',
    tipAiRegenerate:        '데이터가 같더라도 AI를 강제로 재호출하여 새로 생성합니다.',
    aiGeneratingBtn:        'AI 생성 중…',
    tsAiLabel:              'AI 최종 생성',
    aiOverlayMsg:           'Claude AI로 Results & Discussion 생성 중…',
    aiBadge:                'AI 생성',

    // AI generation — Abstract
    btnAiAbstract:          'AI Abstract',
    tipAiAbstract:          'Claude AI로 Abstract를 생성합니다. Introduction, Methods, Results, Discussion의 AI 생성 내용을 종합합니다.',
    aiAbstractOverlayMsg:   'Claude AI로 Abstract 생성 중…',
    tsAiAbstractLabel:      'AI Abstract 최종 생성',

    // AI generation — Introduction
    btnAiIntroduction:      'AI Introduction',
    tipAiIntroduction:      'Claude AI로 Introduction (Background, Research Gap, Objectives)을 생성합니다.',
    aiIntroOverlayMsg:      'Claude AI로 Introduction 생성 중…',
    tsAiIntroLabel:         'AI Introduction 최종 생성',

    // AI generation — Methods
    btnAiMethods:           'AI Methods',
    tipAiMethods:           'Claude AI로 Methods를 논문 스타일(과거 시제·수동태)로 재작성합니다.',
    aiMethodsOverlayMsg:    'Claude AI로 Materials and Methods 재작성 중…',
    tsAiMethodsLabel:       'AI Methods 최종 생성',

    // AI generation — Conclusion
    btnAiConclusion:        'AI Conclusion',
    tipAiConclusion:        'Claude AI로 Conclusion을 생성합니다. Results & Discussion AI 내용을 기반으로 합니다.',
    aiConclusionOverlayMsg: 'Claude AI로 Conclusion 생성 중…',
    tsAiConclusionLabel:    'AI Conclusion 최종 생성',
  },
};
