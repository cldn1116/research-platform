import { useState, useEffect } from 'react';
import { ko } from '../lib/ko';
import Modal from './Modal';

export default function MethodEditor({ projectId, method, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '', objective: '', materials: '', procedure: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (method) {
      setForm({
        name:      method.name      || '',
        objective: method.objective || '',
        materials: method.materials || '',
        procedure: method.procedure || '',
      });
    } else {
      setForm({ name: '', objective: '', materials: '', procedure: '' });
    }
    setError('');
  }, [method]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('방법 이름을 입력해 주세요.'); return; }
    setSaving(true); setError('');
    try {
      const url    = method ? `/api/methods/${method.id}` : '/api/methods';
      const verb   = method ? 'PUT' : 'POST';
      const body   = method ? form : { ...form, project_id: projectId };

      const res = await fetch(url, {
        method:  verb,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || '방법 저장에 실패했습니다.');
      const saved = await res.json();
      onSave(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const labelCls    = 'block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1';
  const inputCls    = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const textareaCls = `${inputCls} academic-textarea`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Method name */}
      <div>
        <label className={labelCls}>{ko.methodForm.nameLabel}</label>
        <input
          type="text"
          className={inputCls}
          placeholder={ko.methodForm.namePlaceholder}
          value={form.name}
          onChange={set('name')}
          required
        />
      </div>

      {/* Objective */}
      <div>
        <label className={labelCls}>{ko.methodForm.objectiveLabel}</label>
        <input
          type="text"
          className={inputCls}
          placeholder={ko.methodForm.objectivePlaceholder}
          value={form.objective}
          onChange={set('objective')}
        />
      </div>

      {/* Materials */}
      <div>
        <label className={labelCls}>{ko.methodForm.materialsLabel}</label>
        <p className="text-xs text-gray-400 mb-1">{ko.methodForm.materialsHint}</p>
        <textarea
          className={textareaCls}
          rows={5}
          placeholder={ko.methodForm.materialsPlaceholder}
          value={form.materials}
          onChange={set('materials')}
        />
      </div>

      {/* Procedure */}
      <div>
        <label className={labelCls}>{ko.methodForm.procedureLabel}</label>
        <p className="text-xs text-gray-400 mb-1">{ko.methodForm.procedureHint}</p>
        <textarea
          className={textareaCls}
          rows={7}
          placeholder={ko.methodForm.procedurePlaceholder}
          value={form.procedure}
          onChange={set('procedure')}
        />
      </div>

      {/* Version note */}
      {method && (
        <p className="text-xs text-gray-400 italic">
          {ko.methodForm.versionNote(method.version || 1)}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold py-2 px-4 rounded-md transition-colors"
        >
          {saving
            ? ko.methodForm.saving
            : method ? ko.methodForm.updateBtn : ko.methodForm.createBtn}
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
