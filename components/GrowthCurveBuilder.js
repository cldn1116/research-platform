/**
 * GrowthCurveBuilder — multi-series growth curve editor.
 *
 * Saves to results.growth_curve_data (JSONB v2 format).
 * Backward-compatible with v1 single-series format.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { ko } from '../lib/ko';

// ── Constants ──────────────────────────────────────────────────────────────

const SERIES_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f97316',
  '#a855f7', '#ec4899', '#14b8a6', '#eab308',
];

const PRESET_SERIES = [
  { name: 'OD600',         color: '#3b82f6' },
  { name: 'EtOH (g/L)',    color: '#ef4444' },
  { name: 'Glucose (g/L)', color: '#22c55e' },
  { name: 'pH',            color: '#f97316' },
  { name: 'Custom',        color: '#a855f7' },
];

const MARKER_SHAPES = ['circle', 'square', 'triangle', 'diamond'];

// ── Growth parameter calculation ───────────────────────────────────────────

function computeParams(time, values) {
  if (!time || !values || time.length < 3) return null;
  let muMax = 0, muMaxIdx = 1;
  for (let i = 1; i < time.length; i++) {
    const dt = time[i] - time[i - 1];
    if (dt <= 0 || values[i] <= 0 || values[i - 1] <= 0) continue;
    const slope = (Math.log(values[i]) - Math.log(values[i - 1])) / dt;
    if (slope > muMax) { muMax = slope; muMaxIdx = i; }
  }
  let lagPhase = 0;
  if (muMax > 0) {
    const t_i = time[muMaxIdx - 1], y_i = values[muMaxIdx - 1], y_0 = values[0];
    if (y_0 > 0 && y_i > 0) lagPhase = Math.max(0, t_i + (Math.log(y_0) - Math.log(y_i)) / muMax);
  }
  return {
    muMax:    muMax.toFixed(3),
    lagPhase: lagPhase.toFixed(2),
    maxValue: Math.max(...values).toPrecision(4),
  };
}

// ── Number parsing ─────────────────────────────────────────────────────────

function parseNums(text) {
  if (!text?.trim()) return null;
  const parts = text.trim().split(/[\s,;\t]+/).filter(Boolean);
  const nums  = parts.map(Number);
  return nums.some(isNaN) ? null : nums;
}

// ── Custom SVG dot shapes ──────────────────────────────────────────────────

function makeDot(shape) {
  return function CustomDot(props) {
    const { cx, cy, fill, stroke } = props;
    if (cx == null || cy == null) return null;
    const s = 5;
    switch (shape) {
      case 'square':
        return <rect x={cx - s} y={cy - s} width={s * 2} height={s * 2} fill={fill} stroke={stroke} strokeWidth={1} />;
      case 'triangle':
        return <polygon points={`${cx},${cy - s * 1.4} ${cx - s},${cy + s * 0.8} ${cx + s},${cy + s * 0.8}`} fill={fill} stroke={stroke} strokeWidth={1} />;
      case 'diamond':
        return <polygon points={`${cx},${cy - s * 1.3} ${cx + s * 1.3},${cy} ${cx},${cy + s * 1.3} ${cx - s * 1.3},${cy}`} fill={fill} stroke={stroke} strokeWidth={1} />;
      default: // circle
        return <circle cx={cx} cy={cy} r={s} fill={fill} stroke={stroke} strokeWidth={1} />;
    }
  };
}

// ── Data format migration ──────────────────────────────────────────────────

function migrateToV2(raw) {
  if (!raw) return null;
  if (raw.version === 2) return raw;
  // v1 → v2
  return {
    version: 2,
    title:   '',
    xLabel:  'Time (h)',
    yLabel:  raw.unit || 'Value',
    time:    raw.time || [],
    series: [{
      id:        's0',
      name:      raw.unit || 'OD600',
      values:    raw.values || [],
      color:     SERIES_COLORS[0],
      marker:    'circle',
      showLine:  true,
      params:    raw.params || null,
    }],
  };
}

// ── Series card ────────────────────────────────────────────────────────────

function SeriesCard({ s, index, onUpdate, onDelete, time }) {
  const [open, setOpen] = useState(true);

  const parsedVals = parseNums(s.valuesInput);
  const params     = parsedVals && time?.length === parsedVals.length && parsedVals.length >= 3
    ? computeParams(time, parsedVals)
    : null;

  const inputCls = 'w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono';
  const labelCls = 'block text-xs text-gray-500 mb-0.5';

  return (
    <div className="border border-gray-200 rounded-lg mb-2 bg-white">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => setOpen(o => !o)} className="text-gray-400 hover:text-gray-600 text-xs">
          {open ? '▼' : '▶'}
        </button>
        {/* Color swatch */}
        <div className="relative w-5 h-5 shrink-0">
          <input
            type="color"
            value={s.color}
            onChange={e => onUpdate({ color: e.target.value })}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title="색상 변경"
          />
          <div className="w-5 h-5 rounded-sm border border-gray-300" style={{ background: s.color }} />
        </div>
        {/* Name */}
        <input
          type="text"
          value={s.name}
          onChange={e => onUpdate({ name: e.target.value })}
          className="flex-1 border-0 border-b border-gray-200 text-sm font-medium focus:outline-none focus:border-blue-400 bg-transparent px-1 py-0.5"
          placeholder="Series name"
        />
        {/* Line toggle */}
        <button
          onClick={() => onUpdate({ showLine: !s.showLine })}
          title={s.showLine ? '선 숨기기' : '선 표시'}
          className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
            s.showLine ? 'border-blue-300 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-400'
          }`}
        >
          ―
        </button>
        {/* Marker shape */}
        <select
          value={s.marker}
          onChange={e => onUpdate({ marker: e.target.value })}
          className="border border-gray-200 rounded text-xs px-1 py-0.5 focus:outline-none"
        >
          {MARKER_SHAPES.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {/* Delete */}
        <button
          onClick={onDelete}
          className="text-red-400 hover:text-red-600 text-xs p-0.5"
          title="시리즈 삭제"
        >
          ✕
        </button>
      </div>

      {/* Value input */}
      {open && (
        <div className="px-3 pb-3">
          <label className={labelCls}>값 (time과 같은 개수)</label>
          <textarea
            rows={2}
            className={inputCls}
            placeholder="0.05, 0.12, 0.34, ..."
            value={s.valuesInput}
            onChange={e => onUpdate({ valuesInput: e.target.value })}
          />
          {parseNums(s.valuesInput) === null && s.valuesInput.trim() && (
            <p className="text-xs text-red-500 mt-0.5">{ko.growthCurve.parseError}</p>
          )}
          {/* Parameters */}
          {params && (
            <div className="flex gap-2 mt-1.5">
              {[
                { label: `μmax ${params.muMax} h⁻¹`,          color: 'text-blue-600 bg-blue-50'    },
                { label: `lag ${params.lagPhase} h`,          color: 'text-amber-600 bg-amber-50'  },
                { label: `max ${params.maxValue}`,            color: 'text-emerald-600 bg-emerald-50' },
              ].map(({ label, color }) => (
                <span key={label} className={`text-xs px-1.5 py-0.5 rounded font-mono ${color}`}>{label}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Chart component (reused in normal + zoom view) ─────────────────────────

function GrowthChart({ chartData, config, height = 220 }) {
  if (!chartData?.length || !config.series?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="t"
          label={{ value: config.xLabel || 'Time (h)', position: 'insideBottom', offset: -14, fontSize: 11 }}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          label={{ value: config.yLabel || 'Value', angle: -90, position: 'insideLeft', offset: 14, fontSize: 11 }}
          tick={{ fontSize: 10 }}
        />
        <Tooltip
          formatter={(val, name) => [typeof val === 'number' ? val.toPrecision(4) : val, name]}
          labelFormatter={t => `${t} h`}
          contentStyle={{ fontSize: 11 }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        {config.series.map(s => {
          const parsedVals = parseNums(s.valuesInput);
          if (!parsedVals) return null;
          const DotComp = makeDot(s.marker);
          return (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              name={s.name}
              stroke={s.color}
              strokeWidth={s.showLine ? 2 : 0}
              dot={<DotComp fill={s.color} stroke={s.color} />}
              activeDot={{ r: 6 }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Zoom modal ─────────────────────────────────────────────────────────────

function ZoomModal({ chartData, config, title, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">{title || 'Growth Curve'}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >×</button>
        </div>
        <GrowthChart chartData={chartData} config={config} height={400} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

let seriesIdCounter = 1;
function newSeriesId() { return `s${Date.now()}_${seriesIdCounter++}`; }

export default function GrowthCurveBuilder({ experiments, results, onResultSaved }) {
  const [selectedExpId, setSelectedExpId] = useState('');
  const [config, setConfig]               = useState({
    version: 2,
    title:   '',
    xLabel:  'Time (h)',
    yLabel:  'Value',
    timeInput: '',
    series:  [],
  });
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [showZoom, setShowZoom] = useState(false);

  // ── Load saved data when experiment changes ──────────────────────────────
  useEffect(() => {
    if (!selectedExpId) { setConfig(c => ({ ...c, series: [], timeInput: '', title: '' })); return; }
    const r  = results[Number(selectedExpId)];
    const gd = migrateToV2(r?.growth_curve_data);
    if (gd) {
      setConfig({
        version:   2,
        title:     gd.title || '',
        xLabel:    gd.xLabel || 'Time (h)',
        yLabel:    gd.yLabel || 'Value',
        timeInput: gd.time?.join(', ') || '',
        series:    gd.series.map(s => ({ ...s, valuesInput: s.values?.join(', ') || '' })),
      });
    } else {
      setConfig({ version: 2, title: '', xLabel: 'Time (h)', yLabel: 'Value', timeInput: '', series: [] });
    }
    setError(''); setSavedMsg('');
  }, [selectedExpId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed values ──────────────────────────────────────────────────────
  const parsedTime = parseNums(config.timeInput);
  const chartData  = parsedTime
    ? parsedTime.map((t, i) => {
        const pt = { t };
        config.series.forEach(s => {
          const vals = parseNums(s.valuesInput);
          if (vals?.[i] !== undefined) pt[s.id] = vals[i];
        });
        return pt;
      })
    : [];

  const hasChart = chartData.length >= 2 && config.series.some(s => parseNums(s.valuesInput));

  // ── Handlers ─────────────────────────────────────────────────────────────
  function addSeries(preset) {
    const id    = newSeriesId();
    const color = preset?.color || SERIES_COLORS[config.series.length % SERIES_COLORS.length];
    setConfig(c => ({
      ...c,
      series: [...c.series, {
        id, name: preset?.name || 'Series', valuesInput: '',
        color, marker: 'circle', showLine: true,
      }],
    }));
  }

  function updateSeries(id, patch) {
    setConfig(c => ({ ...c, series: c.series.map(s => s.id === id ? { ...s, ...patch } : s) }));
  }

  function deleteSeries(id) {
    setConfig(c => ({ ...c, series: c.series.filter(s => s.id !== id) }));
  }

  const validate = useCallback(() => {
    if (!parsedTime) { setError(ko.growthCurve.parseError + ' (시간 입력)'); return false; }
    if (parsedTime.length < 3) { setError(ko.growthCurve.minPoints); return false; }
    for (const s of config.series) {
      const vals = parseNums(s.valuesInput);
      if (!vals) { setError(`"${s.name}": ${ko.growthCurve.parseError}`); return false; }
      if (vals.length !== parsedTime.length) { setError(`"${s.name}": ${ko.growthCurve.lengthMismatch}`); return false; }
    }
    setError('');
    return true;
  }, [parsedTime, config.series]);

  async function handleSave() {
    if (!selectedExpId || !validate()) return;
    setSaving(true); setSavedMsg('');
    try {
      // Compute params for each series
      const seriesWithParams = config.series.map(s => {
        const vals = parseNums(s.valuesInput);
        return { ...s, values: vals, params: vals ? computeParams(parsedTime, vals) : null };
      });

      const growthCurveData = {
        version:  2,
        title:    config.title,
        xLabel:   config.xLabel,
        yLabel:   config.yLabel,
        time:     parsedTime,
        series:   seriesWithParams.map(({ valuesInput: _vi, ...rest }) => rest), // drop input strings
      };

      const r = results[Number(selectedExpId)];
      const res = await fetch('/api/results', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          experiment_id:     Number(selectedExpId),
          raw_text:          r?.raw_text      || '',
          formal_text:       r?.formal_text   || '',
          figure_legend:     r?.figure_legend || '',
          growth_curve_data: growthCurveData,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || '저장 실패');
      const saved = await res.json();
      if (onResultSaved) onResultSaved(Number(selectedExpId), saved);
      setSavedMsg(ko.growthCurve.savedOk);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const inputCls = 'w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1';

  return (
    <div className="flex flex-col h-full overflow-y-auto sidebar-scroll p-4 space-y-3">

      {/* Experiment selector */}
      <div>
        <label className={labelCls}>{ko.growthCurve.selectExp}</label>
        <select
          className={inputCls}
          value={selectedExpId}
          onChange={e => setSelectedExpId(e.target.value)}
        >
          <option value="">— {ko.growthCurve.selectExp} —</option>
          {experiments.map(exp => (
            <option key={exp.id} value={String(exp.id)}>{exp.name}</option>
          ))}
        </select>
      </div>

      {!selectedExpId && (
        <p className="text-sm text-gray-400 italic text-center py-4">{ko.growthCurve.noExpSelected}</p>
      )}

      {selectedExpId && (
        <>
          {/* Chart meta */}
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className={labelCls}>차트 제목</label>
              <input type="text" className={inputCls} placeholder="예: Growth curve of Exp A"
                value={config.title} onChange={e => setConfig(c => ({ ...c, title: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>X축 이름</label>
              <input type="text" className={inputCls}
                value={config.xLabel} onChange={e => setConfig(c => ({ ...c, xLabel: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Y축 이름</label>
              <input type="text" className={inputCls}
                value={config.yLabel} onChange={e => setConfig(c => ({ ...c, yLabel: e.target.value }))} />
            </div>
          </div>

          {/* Time input */}
          <div>
            <label className={labelCls}>{ko.growthCurve.timeLabel}</label>
            <textarea rows={2}
              className={`${inputCls} font-mono`}
              placeholder={ko.growthCurve.timePlaceholder}
              value={config.timeInput}
              onChange={e => setConfig(c => ({ ...c, timeInput: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-0.5">{ko.growthCurve.parseHint}</p>
            {parsedTime && <p className="text-xs text-emerald-600 mt-0.5">{parsedTime.length}개 시간 포인트</p>}
          </div>

          {/* Series */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + ' mb-0'}>데이터 시리즈</label>
              <div className="relative group">
                <button className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded px-2 py-0.5">
                  + 추가
                </button>
                {/* Dropdown on hover */}
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px] hidden group-hover:block">
                  {PRESET_SERIES.map(p => (
                    <button
                      key={p.name}
                      onClick={() => addSeries(p)}
                      className="block w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color }} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {config.series.length === 0 && (
              <p className="text-xs text-gray-400 italic py-2 text-center">
                + 추가 버튼으로 데이터 시리즈를 추가하세요
              </p>
            )}

            {config.series.map((s, i) => (
              <SeriesCard
                key={s.id}
                s={s}
                index={i}
                time={parsedTime}
                onUpdate={patch => updateSeries(s.id, patch)}
                onDelete={() => deleteSeries(s.id)}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          {/* Chart preview */}
          {hasChart && (
            <div>
              {config.title && (
                <p className="text-xs font-semibold text-gray-600 text-center mb-1">{config.title}</p>
              )}
              <div className="bg-white border border-gray-200 rounded-lg p-2 relative">
                <GrowthChart chartData={chartData} config={config} height={200} />
                {/* Zoom button */}
                <button
                  onClick={() => setShowZoom(true)}
                  className="absolute top-2 right-2 text-xs text-gray-400 hover:text-gray-700 bg-white/80 border border-gray-200 rounded px-1.5 py-0.5"
                  title="확대 보기"
                >
                  ⛶
                </button>
              </div>
            </div>
          )}

          {/* Save */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || config.series.length === 0}
              className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-sm font-semibold py-2 px-4 rounded-md transition-colors"
            >
              {saving ? ko.growthCurve.saving : ko.growthCurve.saveBtn}
            </button>
            {savedMsg && <span className="text-sm text-emerald-600 font-medium">{savedMsg}</span>}
          </div>
        </>
      )}

      {/* Zoom modal */}
      {showZoom && (
        <ZoomModal
          chartData={chartData}
          config={config}
          title={config.title || experiments.find(e => String(e.id) === String(selectedExpId))?.name}
          onClose={() => setShowZoom(false)}
        />
      )}
    </div>
  );
}
