import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Modal from '../../components/Modal';
import ExperimentSidebar from '../../components/ExperimentSidebar';
import ExperimentForm from '../../components/ExperimentForm';
import MethodEditor from '../../components/MethodEditor';
import ManuscriptPreview from '../../components/ManuscriptPreview';
import { ko } from '../../lib/ko';

export default function ProjectEditor() {
  const router = useRouter();
  const { id }  = router.query;

  // ── Core data ──────────────────────────────────────────────────────────────
  const [project,     setProject]     = useState(null);
  const [methods,     setMethods]     = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [results,     setResults]     = useState({});   // keyed by experiment_id

  // ── Draft state ────────────────────────────────────────────────────────────
  // manuscript: the last-saved draft object (or null if never generated)
  // draftInfo: { generated_at, timestamps, project_updated_at_snapshot }
  const [manuscript,  setManuscript]  = useState(null);
  const [draftInfo,   setDraftInfo]   = useState(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading,         setLoading]         = useState(true);
  const [generating,      setGenerating]      = useState(null); // null | 'full' | 'materialsAndMethods' | 'results' | 'discussion'
  const [activeTab,       setActiveTab]       = useState('experiments');
  const [selectedExp,     setSelectedExp]     = useState(null);
  const [editingMethod,   setEditingMethod]   = useState(null);
  const [showExpModal,    setShowExpModal]    = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showProjModal,   setShowProjModal]   = useState(false);
  const [projForm,        setProjForm]        = useState({});
  const [savingProj,      setSavingProj]      = useState(false);

  // ── Initial data load ──────────────────────────────────────────────────────
  const loadAll = useCallback(async (projectId) => {
    setLoading(true);
    try {
      const [projRes, methodsRes, expsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/methods?projectId=${projectId}`),
        fetch(`/api/experiments?projectId=${projectId}`),
      ]);

      if (!projRes.ok) { router.push('/'); return; }

      const [proj, meths, exps] = await Promise.all([
        projRes.json(), methodsRes.json(), expsRes.json(),
      ]);

      setProject(proj);
      setMethods(meths);
      setExperiments(exps);
      setProjForm({
        title:          proj.title,
        research_topic: proj.research_topic,
        authors:        proj.authors,
        institution:    proj.institution,
        keywords:       proj.keywords,
      });

      // Load all results in parallel (for the editor panel)
      const entries = await Promise.all(
        exps.map(async (exp) => {
          try {
            const r = await fetch(`/api/results/${exp.id}`);
            if (r.ok) return [exp.id, await r.json()];
          } catch {}
          return [exp.id, null];
        })
      );
      const rMap = {};
      entries.forEach(([eid, r]) => { if (r) rMap[eid] = r; });
      setResults(rMap);

      // Load stored draft — do NOT generate; just fetch what's saved
      const draftRes = await fetch(`/api/manuscript/${projectId}`);
      if (draftRes.ok) {
        const data = await draftRes.json();
        if (data) {
          setManuscript(data.manuscript);
          setDraftInfo({
            generated_at:                data.generated_at,
            timestamps:                  data.timestamps,
            project_updated_at_snapshot: data.project_updated_at_snapshot,
          });
        }
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (id) loadAll(id);
  }, [id, loadAll]);

  // ── Explicit manuscript generation ─────────────────────────────────────────
  // Only called when the user clicks a "Generate …" button.
  // Data has already been saved to the DB by all the save handlers below —
  // this step purely reads from the DB and writes the draft.
  async function generateSection(section) {
    if (generating) return;        // prevent concurrent generation
    setGenerating(section);
    try {
      const res = await fetch(`/api/manuscript/${id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ section }),
      });
      if (res.ok) {
        const data = await res.json();
        setManuscript(data.manuscript);
        setDraftInfo({
          generated_at:                data.generated_at,
          timestamps:                  data.timestamps,
          project_updated_at_snapshot: data.project_updated_at_snapshot,
        });
      }
    } catch (err) {
      console.error('Generation error:', err);
    } finally {
      setGenerating(null);
    }
  }

  // ── Project update — saves immediately, does NOT regenerate ───────────────
  async function handleProjectSave(e) {
    e.preventDefault();
    setSavingProj(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(projForm),
      });
      if (res.ok) {
        setProject(await res.json());
        setShowProjModal(false);
        // Draft not regenerated — user must click Generate to see changes
      }
    } catch {}
    setSavingProj(false);
  }

  // ── Status change — updates DB immediately, does NOT regenerate ───────────
  async function handleStatusChange(expId, newStatus) {
    try {
      const res = await fetch(`/api/experiments/${expId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setExperiments(prev => prev.map(e => e.id === expId ? updated : e));
        // Refresh project.updated_at so staleness indicator updates correctly
        const projRes = await fetch(`/api/projects/${id}`);
        if (projRes.ok) setProject(await projRes.json());
      }
    } catch {}
  }

  // ── Delete experiment — saves immediately, does NOT regenerate ────────────
  async function handleDeleteExperiment(expId) {
    try {
      await fetch(`/api/experiments/${expId}`, { method: 'DELETE' });
      setExperiments(prev => prev.filter(e => e.id !== expId));
      setResults(prev => { const n = { ...prev }; delete n[expId]; return n; });
      if (selectedExp?.id === expId) setSelectedExp(null);
      const projRes = await fetch(`/api/projects/${id}`);
      if (projRes.ok) setProject(await projRes.json());
    } catch {}
  }

  // ── Save experiment + result — saves immediately, does NOT regenerate ─────
  async function handleExpSave(savedExp, savedResult) {
    setExperiments(prev => {
      const exists = prev.find(e => e.id === savedExp.id);
      return exists
        ? prev.map(e => e.id === savedExp.id ? savedExp : e)
        : [...prev, savedExp];
    });
    if (savedResult) {
      setResults(prev => ({ ...prev, [savedExp.id]: savedResult }));
    }
    setSelectedExp(savedExp);
    setShowExpModal(false);
    // Refresh project.updated_at for staleness indicator
    const projRes = await fetch(`/api/projects/${id}`);
    if (projRes.ok) setProject(await projRes.json());
  }

  // ── Delete method — saves immediately, does NOT regenerate ───────────────
  async function handleDeleteMethod(methodId) {
    if (!confirm(ko.editor.deleteMethodConfirm)) return;
    await fetch(`/api/methods/${methodId}`, { method: 'DELETE' });
    setMethods(prev => prev.filter(m => m.id !== methodId));
    setExperiments(prev => prev.map(e =>
      e.method_id === methodId ? { ...e, method_id: null, method_name: null } : e
    ));
    if (editingMethod?.id === methodId) setEditingMethod(null);
  }

  // ── Save method — saves immediately, does NOT regenerate ──────────────────
  async function handleMethodSave(savedMethod) {
    setMethods(prev => {
      const exists = prev.find(m => m.id === savedMethod.id);
      if (exists) return prev.map(m => m.id === savedMethod.id ? savedMethod : m);
      return [...prev, savedMethod].sort((a, b) => a.name.localeCompare(b.name));
    });
    setEditingMethod(null);
    setShowMethodModal(false);
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  function exportDocx() { window.location.href = `/api/export/${id}?format=docx`; }
  function exportPdf()  { window.print(); }

  // ── Loading guard ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600 mx-auto mb-4" />
          <p className="text-sm">{ko.editor.loadingProject}</p>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const selectedResult = selectedExp ? results[selectedExp.id] || null : null;

  // Staleness: project was changed after the last draft was saved
  const isStale = draftInfo && project &&
    project.updated_at > (draftInfo.project_updated_at_snapshot || draftInfo.generated_at || '');

  const labelCls = 'block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1';
  const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <>
      <Head>
        <title>{project.title} — {ko.home.platformTitle}</title>
      </Head>

      <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

        {/* ── Navigation bar ──────────────────────────────────────────── */}
        <header className="bg-white border-b border-gray-200 shadow-sm no-print shrink-0">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Back + project name */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors shrink-0"
                title={ko.editor.backTooltip}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="border-l border-gray-200 pl-3 min-w-0">
                <button onClick={() => setShowProjModal(true)} className="text-left group min-w-0">
                  <h1 className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors leading-tight truncate">
                    {project.title}
                  </h1>
                  {project.research_topic && (
                    <p className="text-xs text-gray-500 italic truncate">{project.research_topic}</p>
                  )}
                </button>
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={exportPdf}
                className="flex items-center gap-1.5 text-xs border border-gray-300 hover:border-gray-400 bg-white text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-md transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {ko.editor.printBtn}
              </button>
              <button
                onClick={exportDocx}
                disabled={!manuscript}
                title={!manuscript ? ko.editor.exportDocxHint : ko.editor.exportDocxBtn}
                className="flex items-center gap-1.5 text-xs bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-md transition-colors font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {ko.editor.exportDocxBtn}
              </button>
            </div>
          </div>
        </header>

        {/* ── Main split screen ────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden no-print">

          {/* ══ LEFT PANEL ════════════════════════════════════════════ */}
          <div className="w-80 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">

            {/* Tab switcher */}
            <div className="flex border-b border-gray-200 shrink-0">
              {['experiments', 'methods'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors
                    ${activeTab === tab
                      ? 'text-blue-700 border-b-2 border-blue-700 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  {tab === 'experiments' ? ko.editor.experimentsTab(experiments.length) : ko.editor.methodsTab(methods.length)}
                </button>
              ))}
            </div>

            {/* ── Experiments tab ──────────────────────────────────── */}
            {activeTab === 'experiments' && (
              <ExperimentSidebar
                experiments={experiments}
                results={results}
                selectedId={selectedExp?.id}
                onSelect={(exp) => { setSelectedExp(exp); setShowExpModal(true); }}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteExperiment}
                onAdd={() => { setSelectedExp(null); setShowExpModal(true); }}
              />
            )}

            {/* ── Methods tab ──────────────────────────────────────── */}
            {activeTab === 'methods' && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 shrink-0">
                  <p className="text-xs text-gray-500">
                    {ko.editor.methodsHint}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto sidebar-scroll px-3 py-3 space-y-2">
                  {methods.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <p className="text-sm mb-1">{ko.editor.noMethods}</p>
                      <p className="text-xs">{ko.editor.noMethodsHint}</p>
                    </div>
                  ) : (
                    methods.map(method => (
                      <div
                        key={method.id}
                        className={`rounded-md border p-3 transition-all ${
                          editingMethod?.id === method.id
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-800">{method.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-gray-400">v{method.version || 1}</span>
                            <button
                              onClick={() => { setEditingMethod(method); setShowMethodModal(true); }}
                              className="text-blue-500 hover:text-blue-700 p-0.5"
                              title={ko.editor.editMethodTooltip}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteMethod(method.id)}
                              className="text-red-400 hover:text-red-600 p-0.5"
                              title={ko.editor.deleteMethodTooltip}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {method.objective && (
                          <p className="text-xs text-gray-500 italic truncate">{method.objective}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {ko.editor.usedBy(method.usage_count ?? 0)}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-3 py-3 border-t border-gray-200 shrink-0">
                  <button
                    onClick={() => { setEditingMethod(null); setShowMethodModal(true); }}
                    className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {ko.editor.newMethodBtn}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT PANEL — Manuscript Preview ══════════════════════ */}
          <div className="flex-1 overflow-hidden">
            <ManuscriptPreview
              manuscript={manuscript}
              draftInfo={draftInfo}
              isStale={isStale}
              generating={generating}
              project={project}
              onGenerate={generateSection}
            />
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}

      <Modal
        isOpen={showExpModal}
        onClose={() => { setShowExpModal(false); setSelectedExp(null); }}
        title={selectedExp ? ko.editor.editExpTitle : ko.editor.addExpTitle}
        width="max-w-2xl"
      >
        {showExpModal && (
          <ExperimentForm
            projectId={Number(id)}
            methods={methods}
            experiment={selectedExp}
            result={selectedResult}
            onSave={handleExpSave}
            onCancel={() => { setShowExpModal(false); setSelectedExp(null); }}
          />
        )}
      </Modal>

      <Modal
        isOpen={showMethodModal}
        onClose={() => { setShowMethodModal(false); setEditingMethod(null); }}
        title={editingMethod ? ko.editor.editMethodTitle : ko.editor.newMethodTitle}
        width="max-w-2xl"
      >
        {showMethodModal && (
          <MethodEditor
            projectId={Number(id)}
            method={editingMethod}
            onSave={handleMethodSave}
            onCancel={() => { setShowMethodModal(false); setEditingMethod(null); }}
          />
        )}
      </Modal>

      <Modal
        isOpen={showProjModal}
        onClose={() => setShowProjModal(false)}
        title={ko.editor.settingsTitle}
        width="max-w-xl"
      >
        <form onSubmit={handleProjectSave} className="space-y-4">
          <div>
            <label className={labelCls}>{ko.editor.settingsTitleLabel}</label>
            <input type="text" className={inputCls} required
              value={projForm.title || ''}
              onChange={e => setProjForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>{ko.editor.settingsTopicLabel}</label>
            <input type="text" className={inputCls}
              value={projForm.research_topic || ''}
              onChange={e => setProjForm(p => ({ ...p, research_topic: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{ko.editor.settingsAuthors}</label>
              <input type="text" className={inputCls}
                value={projForm.authors || ''}
                onChange={e => setProjForm(p => ({ ...p, authors: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>{ko.editor.settingsInstitut}</label>
              <input type="text" className={inputCls}
                value={projForm.institution || ''}
                onChange={e => setProjForm(p => ({ ...p, institution: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>{ko.editor.settingsKeywords}</label>
            <input type="text" className={inputCls}
              value={projForm.keywords || ''}
              onChange={e => setProjForm(p => ({ ...p, keywords: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={savingProj}
              className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold py-2 px-4 rounded-md transition-colors"
            >
              {savingProj ? ko.common.saving : ko.editor.saveChanges}
            </button>
            <button type="button" onClick={() => setShowProjModal(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:text-gray-900"
            >
              {ko.common.cancel}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
