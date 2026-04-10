import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Modal from '../components/Modal';
import { ko } from '../lib/ko';

function ProjectCard({ project, onDelete }) {
  const router = useRouter();

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 group-hover:text-blue-800 transition-colors leading-snug">
            {project.title}
          </h2>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(project); }}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 rounded"
            title={ko.home.deleteTooltip}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {project.research_topic && (
          <p className="text-sm text-gray-600 italic mb-3 leading-snug">{project.research_topic}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            {ko.home.nIncluded(project.included_count ?? 0)}
          </span>
          <span>{ko.home.nExperiments(project.experiment_count ?? 0)}</span>
          <span className="ml-auto">
            {new Date(project.updated_at).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'short', day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [projects,   setProjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [form,       setForm]       = useState({
    title: '', research_topic: '', authors: '', institution: '', keywords: '',
  });
  const [error, setError] = useState('');

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    try {
      const res  = await fetch('/api/projects');
      setProjects(await res.json());
    } catch {}
    setLoading(false);
  }

  const setField = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('원고 제목을 입력해 주세요.'); return; }
    setCreating(true); setError('');
    try {
      const res = await fetch('/api/projects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  async function handleDelete(project) {
    if (!confirm(ko.home.deleteConfirm(project.title))) return;
    await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
    setProjects(prev => prev.filter(p => p.id !== project.id));
  }

  function openModal() {
    setForm({ title: '', research_topic: '', authors: '', institution: '', keywords: '' });
    setError('');
    setShowModal(true);
  }

  const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const labelCls = 'block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1';

  return (
    <>
      <Head>
        <title>{ko.home.platformTitle}</title>
        <meta name="description" content={ko.home.platformSubtitle} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* ── Navigation ──────────────────────────────────── */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
                {ko.home.platformTitle}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">{ko.home.platformSubtitle}</p>
            </div>
            <button
              onClick={openModal}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold py-2 px-4 rounded-md transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {ko.home.newProject}
            </button>
          </div>
        </header>

        {/* ── Content ─────────────────────────────────────── */}
        <main className="max-w-6xl mx-auto px-6 py-8">
          {projects.length > 0 && (
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {ko.home.projectList(projects.length)}
              </h2>
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mx-auto mb-3" />
              <span className="text-sm">{ko.home.loading}</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-2">{ko.home.noProjects}</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">{ko.home.noProjectsDesc}</p>
              <button
                onClick={openModal}
                className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold py-2.5 px-6 rounded-md transition-colors"
              >
                {ko.home.createFirst}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(project => (
                <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── New project modal ─────────────────────────────── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={ko.newProject.modalTitle}>
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className={labelCls}>{ko.newProject.titleLabel}</label>
            <input
              type="text"
              className={inputCls}
              placeholder={ko.newProject.titlePlaceholder}
              value={form.title}
              onChange={setField('title')}
              required
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>{ko.newProject.topicLabel}</label>
            <input
              type="text"
              className={inputCls}
              placeholder={ko.newProject.topicPlaceholder}
              value={form.research_topic}
              onChange={setField('research_topic')}
            />
            <p className="text-xs text-gray-400 mt-1">{ko.newProject.topicHint}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{ko.newProject.authorsLabel}</label>
              <input
                type="text"
                className={inputCls}
                placeholder={ko.newProject.authorsPlaceholder}
                value={form.authors}
                onChange={setField('authors')}
              />
            </div>
            <div>
              <label className={labelCls}>{ko.newProject.institutLabel}</label>
              <input
                type="text"
                className={inputCls}
                placeholder={ko.newProject.institutPlaceholder}
                value={form.institution}
                onChange={setField('institution')}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{ko.newProject.keywordsLabel}</label>
            <input
              type="text"
              className={inputCls}
              placeholder={ko.newProject.keywordsPlaceholder}
              value={form.keywords}
              onChange={setField('keywords')}
            />
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold py-2.5 px-4 rounded-md transition-colors"
            >
              {creating ? ko.newProject.creating : ko.newProject.createBtn}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
            >
              {ko.common.cancel}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
