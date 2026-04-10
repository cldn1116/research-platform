import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ko } from '../lib/ko';

// ── Growth parameter calculation ───────────────────────────────────────────

/**
 * Compute growth curve parameters from parallel time/value arrays.
 *
 * @param {number[]} time   - time points (h)
 * @param {number[]} values - OD / CFU / etc.
 * @returns {{ muMax: string, lagPhase: string, maxValue: string }}
 */
function computeParams(time, values) {
  let muMax    = 0;
  let muMaxIdx = 1;

  for (let i = 1; i < time.length; i++) {
    const dt = time[i] - time[i - 1];
    if (dt <= 0 || values[i] <= 0 || values[i - 1] <= 0) continue;
    const slope = (Math.log(values[i]) - Math.log(values[i - 1])) / dt;
    if (slope > muMax) { muMax = slope; muMaxIdx = i; }
  }

  // Lag phase: x-intercept of the tangent at the max-slope interval
  let lagPhase = 0;
  if (muMax > 0) {
    const t_i = time[muMaxIdx - 1];
    const y_i = values[muMaxIdx - 1];
    const y_0 = values[0];
    if (y_0 > 0 && y_i > 0) {
      lagPhase = t_i + (Math.log(y_0) - Math.log(y_i)) / muMax;
      lagPhase = Math.max(0, lagPhase);
    }
  }

  const maxValue = Math.max(...values);

  return {
    muMax:    muMax.toFixed(3),
    lagPhase: lagPhase.toFixed(2),
    maxValue: maxValue.toPrecision(4),
  };
}

/**
 * Parse a text input (comma- or tab-separated, or newline-separated)
 * into an array of numbers. Returns null on error.
 *
 * @param {string} text
 * @returns {number[] | null}
 */
function parseNumbers(text) {
  const parts = text.trim().split(/[\s,;\t]+/).filter(Boolean);
  const nums  = parts.map(Number);
  if (nums.some(n => isNaN(n))) return null;
  return nums;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function GrowthCurveBuilder({ experiments, results, onResultSaved }) {
  const [selectedExpId, setSelectedExpId] = useState('');
  const [timeInput,     setTimeInput]     = useState('');
  const [valueInput,    setValueInput]    = useState('');
  const [unit,          setUnit]          = useState('OD600');
  const [chartData,     setChartData]     = useState(null);   // [{t, v}]
  const [params,        setParams]        = useState(null);   // {muMax, lagPhase, maxValue}
  const [error,         setError]         = useState('');
  const [saving,        setSaving]        = useState(false);
  const [savedMsg,      setSavedMsg]      = useState('');

  // When an experiment is selected, pre-fill from existing saved data
  useEffect(() => {
    if (!selectedExpId) { setChartData(null); setParams(null); setTimeInput(''); setValueInput(''); return; }
    const r = results[Number(selectedExpId)];
    const gd = r?.growth_curve_data;
    if (gd?.time?.length) {
      setTimeInput(gd.time.join(', '));
      setValueInput(gd.values.join(', '));
      setUnit(gd.unit || 'OD600');
      buildChart(gd.time, gd.values);
    } else {
      setTimeInput('');
      setValueInput('');
      setChartData(null);
      setParams(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExpId]);

  function buildChart(time, values) {
    const data = time.map((t, i) => ({ t, v: values[i] }));
    setChartData(data);
    if (time.length >= 3) setParams(computeParams(time, values));
  }

  function handleDraw() {
    setError('');
    setSavedMsg('');
    const time   = parseNumbers(timeInput);
    const values = parseNumbers(valueInput);
    if (!time)   { setError(ko.growthCurve.parseError); return; }
    if (!values) { setError(ko.growthCurve.parseError); return; }
    if (time.length !== values.length) { setError(ko.growthCurve.lengthMismatch); return; }
    if (time.length < 3) { setError(ko.growthCurve.minPoints); return; }
    buildChart(time, values);
  }

  async function handleSave() {
    if (!selectedExpId || !chartData) return;
    setSaving(true); setSavedMsg(''); setError('');
    try {
      const time   = parseNumbers(timeInput);
      const values = parseNumbers(valueInput);
      const growthCurveData = { time, values, unit, params };

      const r = results[Number(selectedExpId)];
      const body = {
        experiment_id:     Number(selectedExpId),
        raw_text:          r?.raw_text          || '',
        formal_text:       r?.formal_text       || '',
        figure_legend:     r?.figure_legend     || '',
        growth_curve_data: growthCurveData,
      };

      const res = await fetch('/api/results', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
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

  const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono';
  const labelCls = 'block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1';

  const selectedExp = experiments.find(e => String(e.id) === String(selectedExpId));

  return (
    <div className="flex flex-col h-full overflow-y-auto sidebar-scroll px-4 py-4 space-y-4">

      {/* Experiment selector */}
      <div>
        <label className={labelCls}>{ko.growthCurve.selectExp}</label>
        <select
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          {/* Unit */}
          <div>
            <label className={labelCls}>{ko.growthCurve.unitLabel}</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={ko.growthCurve.unitPlaceholder}
              value={unit}
              onChange={e => setUnit(e.target.value)}
            />
          </div>

          {/* Time input */}
          <div>
            <label className={labelCls}>{ko.growthCurve.timeLabel}</label>
            <textarea
              rows={2}
              className={inputCls}
              placeholder={ko.growthCurve.timePlaceholder}
              value={timeInput}
              onChange={e => { setTimeInput(e.target.value); setError(''); }}
            />
          </div>

          {/* Value input */}
          <div>
            <label className={labelCls}>{ko.growthCurve.valueLabel}</label>
            <textarea
              rows={2}
              className={inputCls}
              placeholder={ko.growthCurve.valuePlaceholder}
              value={valueInput}
              onChange={e => { setValueInput(e.target.value); setError(''); }}
            />
            <p className="text-xs text-gray-400 mt-1">{ko.growthCurve.parseHint}</p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          {/* Draw button */}
          <button
            onClick={handleDraw}
            disabled={!timeInput.trim() || !valueInput.trim()}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white text-sm font-semibold py-2 px-4 rounded-md transition-colors"
          >
            {ko.growthCurve.drawBtn}
          </button>

          {/* Chart */}
          {chartData && (
            <div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="t"
                      label={{ value: 'Time (h)', position: 'insideBottom', offset: -2, fontSize: 11 }}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      label={{ value: unit, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(val) => [val.toPrecision(4), unit]}
                      labelFormatter={(t) => `${t} h`}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#3b82f6' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Parameters */}
              {params && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: ko.growthCurve.muMax(params.muMax),    color: 'text-blue-700',   bg: 'bg-blue-50' },
                    { label: ko.growthCurve.lagPhase(params.lagPhase), color: 'text-amber-700', bg: 'bg-amber-50' },
                    { label: ko.growthCurve.maxValue(params.maxValue),  color: 'text-emerald-700', bg: 'bg-emerald-50' },
                  ].map(({ label, color, bg }) => (
                    <div key={label} className={`${bg} rounded-md px-2 py-1.5 text-center`}>
                      <p className={`text-xs font-semibold ${color}`}>{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Save */}
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold py-2 px-4 rounded-md transition-colors"
                >
                  {saving ? ko.growthCurve.saving : ko.growthCurve.saveBtn}
                </button>
                {savedMsg && (
                  <span className="text-sm text-emerald-600 font-medium">{savedMsg}</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
