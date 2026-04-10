import { useState, useEffect } from 'react';
import { ko } from '../lib/ko';

// Status options — values stored in DB, labels from ko
const STATUS_OPTIONS = [
  { value: 'included',      label: ko.status.included,      color: 'text-emerald-700' },
  { value: 'excluded',      label: ko.status.excluded,       color: 'text-red-700'     },
  { value: 'supplementary', label: ko.status.supplementary,  color: 'text-amber-700'   },
];

export default function ExperimentForm({
  projectId,
  methods,
  experiment,
  result,
  onSave,
  onCancel,
}) {
  const [form, setForm] = useState({
    name: '', method_id: '', conditions: '', status: 'included',
  });
  const [rawText,      setRawText]      = useState('');
  const [formalText,   setFormalText]   = useState('');
  const [figureLegend, setFigureLegend] = useState('');
  const [showFormal,   setShowFormal]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [formalizing,  setFormalizing]  = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    if (experiment) {
      setForm({
        name:       experiment.name       || '',
        method_id:  experiment.method_id  ? String(experiment.method_id) : '',
        conditions: experiment.conditions || '',
        status:     experiment.status     || 'included',
      });
    } else {
      setForm({ name: '', method_id: '', conditions: '', status: 'included' });
    }
    if (result) {
      setRawText(result.raw_text       || '');
      setFormalText(result.formal_text || '');
      setFigureLegend(result.figure_legend || '');
    } else {
      setRawText(''); setFormalText(''); setFigureLegend('');
    }
    setShowFormal(false);
    setError('');
  }, [experiment, result]);

  const setField = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  async function previewFormalization() {
    if (!rawText.trim()) return;
    setFormalizing(true);
    try {
      const res = await fetch('/api/results', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          experiment_id: experiment?.id,
          raw_text:      rawText,
          formal_text:   '',
          figure_legend: figureLegend,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFormalText(data.formal_text || '');
        setShowFormal(true);
      }
    } catch {}
    setFormalizing(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('실험 이름을 입력해 주세요.'); return; }
    setSaving(true); setError('');
    try {
      let savedExp = experiment;

      // 1. Create or update experiment
      if (experiment) {
        const res = await fetch(`/api/experiments/${experiment.id}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ...form, method_id: form.method_id || null }),
        });
        if (!res.ok) throw new Error((await res.json()).error || '실험 저장에 실패했습니다.');
        savedExp = await res.json();
      } else {
        const res = await fetch('/api/experiments', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ...form, project_id: projectId, method_id: form.method_id || null }),
        });
        if (!res.ok) throw new Error((await res.json()).error || '실험 생성에 실패했습니다.');
        savedExp = await res.json();
      }

      // 2. Save result (upsert)
      if (rawText.trim()) {
        const rRes = await fetch('/api/results', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            experiment_id: savedExp.id,
            raw_text:      rawText,
            formal_text:   showFormal && formalText.trim() ? formalText : '',
            figure_legend: figureLegend,
          }),
        });
        if (!rRes.ok) throw new Error((await rRes.json()).error || '결과 저장에 실패했습니다.');
        const savedResult = await rRes.json();
        onSave(savedExp, savedResult);
      } else {
        onSave(savedExp, null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const labelCls   = 'block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1';
  const inputCls   = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const optionalCls = 'text-gray-400 normal-case font-normal';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* ── Metadata ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>{ko.expForm.nameLabel}</label>
          <input
            type="text"
            className={inputCls}
            placeholder={ko.expForm.namePlaceholder}
            value={form.name}
            onChange={setField('name')}
            required
          />
        </div>

        <div>
          <label className={labelCls}>{ko.expForm.methodLabel}</label>
          <select className={inputCls} value={form.method_id} onChange={setField('method_id')}>
            <option value="">{ko.expForm.noMethod}</option>
            {methods.map(m => (
              <option key={m.id} value={String(m.id)}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>{ko.expForm.statusLabel}</label>
          <select className={inputCls} value={form.status} onChange={setField('status')}>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>
          {ko.expForm.conditionsLabel}{' '}
          <span className={optionalCls}>{ko.common.optional}</span>
        </label>
        <input
          type="text"
          className={inputCls}
          placeholder={ko.expForm.conditionsPlaceholder}
          value={form.conditions}
          onChange={setField('conditions')}
        />
      </div>

      {/* ── Results input ─────────────────────────────────── */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-1">
          <label className={labelCls + ' mb-0'}>{ko.expForm.resultsLabel}</label>
          <span className="text-xs text-gray-400">{ko.expForm.resultsHint}</span>
        </div>
        <textarea
          className={`${inputCls} academic-textarea`}
          rows={6}
          placeholder={ko.expForm.resultsPlaceholder}
          value={rawText}
          onChange={e => { setRawText(e.target.value); setShowFormal(false); }}
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={previewFormalization}
            disabled={!rawText.trim() || formalizing || !experiment}
            className="text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white px-3 py-1.5 rounded transition-colors"
            title={!experiment ? ko.expForm.previewSaveFirst : ''}
          >
            {formalizing ? ko.expForm.formalizing : ko.expForm.previewBtn}
          </button>
          {showFormal && (
            <button
              type="button"
              onClick={() => setShowFormal(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {ko.common.cancel === '취소' ? ko.expForm.hideBtn : ko.expForm.hideBtn}
            </button>
          )}
        </div>
      </div>

      {/* ── Formalized preview / override ────────────────── */}
      {showFormal && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              {ko.expForm.formalLabel}
            </span>
            <span className="text-xs text-blue-500">{ko.expForm.formalEditHint}</span>
          </div>
          <textarea
            className="w-full border border-blue-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white academic-textarea"
            rows={6}
            value={formalText}
            onChange={e => setFormalText(e.target.value)}
          />
        </div>
      )}

      {/* ── Figure legend ─────────────────────────────────── */}
      <div>
        <label className={labelCls}>
          {ko.expForm.legendLabel}{' '}
          <span className={optionalCls}>{ko.common.optional}</span>
        </label>
        <input
          type="text"
          className={inputCls}
          placeholder={ko.expForm.legendPlaceholder}
          value={figureLegend}
          onChange={e => setFigureLegend(e.target.value)}
        />
      </div>

      {/* ── Actions ───────────────────────────────────────── */}
      <div className="flex gap-3 pt-3 border-t border-gray-100">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold py-2 px-4 rounded-md transition-colors"
        >
          {saving
            ? ko.expForm.saving
            : experiment ? ko.expForm.saveBtn : ko.expForm.addBtn}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md transition-colors"
        >
          {ko.common.cancel}
        </button>
      </div>
    </form>
  );
}
