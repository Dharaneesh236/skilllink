import React, { useState } from 'react';
import { apiFetch, SKILL_CATEGORIES, formatCurrency } from '../api/client';
import { MatchEvaluation } from '../types';
import {
  Cpu,
  Sliders,
  Sparkles,
  RotateCcw,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Award,
  MapPin,
  Clock,
  Star,
  DollarSign,
  Filter,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface EngineWeightsState {
  skill: number;
  location: number;
  availability: number;
  rating: number;
  payment: number;
}

const DEFAULT_WEIGHTS: EngineWeightsState = {
  skill: 40,
  location: 20,
  availability: 20,
  rating: 10,
  payment: 10,
};

export const LiveEnginePage: React.FC = () => {
  // Mode: 'job_to_workers' or 'worker_to_jobs'
  const [mode, setMode] = useState<'job_to_workers' | 'worker_to_jobs'>('job_to_workers');

  // Stage 1: Input (Job Details) - Rule #7: initial values empty
  const [jobTitle, setJobTitle] = useState('');
  const [requiredSkill, setRequiredSkill] = useState('cleaning');
  const [locationText, setLocationText] = useState('');
  const [jobLat, setJobLat] = useState<number | null>(null);
  const [jobLng, setJobLng] = useState<number | null>(null);
  const [jobDate, setJobDate] = useState('2026-10-15');
  const [jobStart, setJobStart] = useState('09:00');
  const [jobEnd, setJobEnd] = useState('13:00');
  const [jobBudget, setJobBudget] = useState<number>(0);

  // Reverse Input (Worker Details)
  const [workerSkills, setWorkerSkills] = useState<string[]>(['cleaning']);
  const [workerLocation, setWorkerLocation] = useState('');
  const [workerLat, setWorkerLat] = useState<number | null>(null);
  const [workerLng, setWorkerLng] = useState<number | null>(null);
  const [workerExpected, setWorkerExpected] = useState<number>(0);
  const [workerRadius, setWorkerRadius] = useState<number>(20);

  // Stage 2: Weights Sliders
  const [weights, setWeights] = useState<EngineWeightsState>(DEFAULT_WEIGHTS);

  // Stage 3: Results
  const [results, setResults] = useState<MatchEvaluation[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const [hasComputed, setHasComputed] = useState(false);
  const [showIneligible, setShowIneligible] = useState(false);

  // Quick fill preset helper for judging ease
  const handleQuickPreset = (preset: 'cleaning' | 'delivery' | 'cooking') => {
    if (preset === 'cleaning') {
      setJobTitle('2-Hour Apartment Deep Cleaning');
      setRequiredSkill('cleaning');
      setLocationText('Indiranagar, Bengaluru');
      setJobLat(12.9784);
      setJobLng(77.6408);
      setJobDate('2026-10-15');
      setJobStart('09:00');
      setJobEnd('12:00');
      setJobBudget(500);
    } else if (preset === 'delivery') {
      setJobTitle('Urgent Package Pickup & Drop');
      setRequiredSkill('delivery');
      setLocationText('Koramangala, Bengaluru');
      setJobLat(12.9352);
      setJobLng(77.6245);
      setJobDate('2026-10-15');
      setJobStart('14:00');
      setJobEnd('16:00');
      setJobBudget(350);
    } else {
      setJobTitle('Family Dinner Cooking Prep');
      setRequiredSkill('cooking assistance');
      setLocationText('Domlur, Bengaluru');
      setJobLat(12.9609);
      setJobLng(77.6387);
      setJobDate('2026-10-15');
      setJobStart('17:00');
      setJobEnd('20:00');
      setJobBudget(600);
    }
  };

  const resetWeights = () => {
    setWeights(DEFAULT_WEIGHTS);
  };

  const handleRunEngine = async () => {
    setIsComputing(true);
    setHasComputed(true);

    try {
      if (mode === 'job_to_workers') {
        const data = await apiFetch<MatchEvaluation[]>('/match/preview', {
          method: 'POST',
          body: JSON.stringify({
            title: jobTitle || 'Ad-Hoc Evaluation Job',
            required_skill: requiredSkill,
            location_text: locationText,
            lat: jobLat,
            lng: jobLng,
            date: jobDate,
            start_time: jobStart,
            end_time: jobEnd,
            budget: Number(jobBudget),
            weights,
          }),
        });
        setResults(data);
      } else {
        const data = await apiFetch<MatchEvaluation[]>('/match/reverse-preview', {
          method: 'POST',
          body: JSON.stringify({
            skills: workerSkills,
            location_text: workerLocation,
            lat: workerLat,
            lng: workerLng,
            expected_payment: Number(workerExpected),
            max_distance_km: Number(workerRadius),
            weights,
          }),
        });
        setResults(data);
      }
    } catch (err: any) {
      alert(err.message || 'Engine computation failed');
    } finally {
      setIsComputing(false);
    }
  };

  const totalWeightsSum =
    weights.skill + weights.location + weights.availability + weights.rating + weights.payment;

  const visibleResults = results.filter((r) => {
    if (showIneligible) return true;
    return !r.flags.not_eligible;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-brand-950 text-white shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-brand-300 text-xs font-bold">
            <Cpu className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
            <span>Interactive Live Engine Demo</span>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-white/10 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('job_to_workers')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                mode === 'job_to_workers' ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              Mode: Job &rarr; Workers
            </button>
            <button
              type="button"
              onClick={() => setMode('worker_to_jobs')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                mode === 'worker_to_jobs' ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              Mode: Worker &rarr; Jobs
            </button>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Explainable Algorithmic Matching Simulator
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
          Test the pure-Python matching engine in real-time. Alter candidate attributes or tune the five factor weights to observe immediate changes in rank ordering and total scores.
        </p>
      </div>

      {/* 3-Stage Layout: Stage 1 (Input), Stage 2 (Processing), Stage 3 (Response) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* STAGE 1: INPUT (4 cols) */}
        <div className="lg:col-span-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-extrabold text-brand-600 uppercase tracking-wider block">
                Stage 1 of 3
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Candidate Parameters (Input)
              </h2>
            </div>

            {/* Quick Fill Presets for judging */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => handleQuickPreset('cleaning')}
                className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                title="Fill Cleaning preset"
              >
                Cleaning
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('delivery')}
                className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                title="Fill Delivery preset"
              >
                Delivery
              </button>
            </div>
          </div>

          {mode === 'job_to_workers' ? (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Living Room Cleaning"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Required Skill
                  </label>
                  <select
                    value={requiredSkill}
                    onChange={(e) => setRequiredSkill(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl capitalize focus:bg-white"
                  >
                    {SKILL_CATEGORIES.map((s) => (
                      <option key={s} value={s} className="capitalize">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Budget (Rs)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={jobBudget || ''}
                    onChange={(e) => setJobBudget(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location Area
                </label>
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="e.g. Indiranagar, Bengaluru"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={jobStart}
                    onChange={(e) => setJobStart(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={jobEnd}
                    onChange={(e) => setJobEnd(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Worker Skill
                </label>
                <select
                  value={workerSkills[0] || 'cleaning'}
                  onChange={(e) => setWorkerSkills([e.target.value])}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl capitalize"
                >
                  {SKILL_CATEGORIES.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Payment (Rs)
                </label>
                <input
                  type="number"
                  min={0}
                  value={workerExpected || ''}
                  onChange={(e) => setWorkerExpected(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Travel Radius (km)
                </label>
                <input
                  type="number"
                  min={1}
                  value={workerRadius}
                  onChange={(e) => setWorkerRadius(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleRunEngine}
            disabled={isComputing}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/25 transition-all flex items-center justify-center space-x-1.5"
          >
            {isComputing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            <span>Execute Matching Engine</span>
          </button>
        </div>

        {/* STAGE 2: PROCESSING (Weights & Formulas) (4 cols) */}
        <div className="lg:col-span-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">
                Stage 2 of 3
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Weight Normalizer & Formulas
              </h2>
            </div>
            <button
              type="button"
              onClick={resetWeights}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Normalized Weight Notice */}
          <div className="p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-100 text-[11px] text-indigo-900">
            Total Weight: <strong>{totalWeightsSum}</strong> (Normalized dynamically to 100%).
          </div>

          {/* Interactive Weight Sliders */}
          <div className="space-y-3.5">
            {/* Skill */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center space-x-1">
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Skill Weight</span>
                </span>
                <span className="text-indigo-600">{weights.skill}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weights.skill}
                onChange={(e) => setWeights({ ...weights, skill: Number(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Location */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  <span>Location Weight</span>
                </span>
                <span className="text-sky-600">{weights.location}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weights.location}
                onChange={(e) => setWeights({ ...weights, location: Number(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Availability */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Availability Weight</span>
                </span>
                <span className="text-emerald-600">{weights.availability}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weights.availability}
                onChange={(e) => setWeights({ ...weights, availability: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Rating */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center space-x-1">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span>Rating Weight</span>
                </span>
                <span className="text-amber-600">{weights.rating}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weights.rating}
                onChange={(e) => setWeights({ ...weights, rating: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Payment */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center space-x-1">
                  <DollarSign className="w-3.5 h-3.5 text-violet-600" />
                  <span>Payment Weight</span>
                </span>
                <span className="text-violet-600">{weights.payment}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weights.payment}
                onChange={(e) => setWeights({ ...weights, payment: Number(e.target.value) })}
                className="w-full accent-violet-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* STAGE 3: RESPONSE (Results & Dynamic Ranking) (4 cols) */}
        <div className="lg:col-span-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">
                Stage 3 of 3
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Ranked Candidates (Response)
              </h2>
            </div>

            {results.length > 0 && (
              <button
                type="button"
                onClick={() => setShowIneligible(!showIneligible)}
                className="text-[10px] font-bold text-slate-600 hover:text-slate-900"
              >
                {showIneligible ? 'Hide Ineligible' : 'Show Ineligible'}
              </button>
            )}
          </div>

          {isComputing ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
              <p className="text-xs text-slate-500 animate-pulse">
                Evaluating candidate vectors across 5 dimensions...
              </p>
            </div>
          ) : !hasComputed ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Cpu className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-medium">Click "Execute Matching Engine" to run calculations.</p>
            </div>
          ) : visibleResults.length === 0 ? (
            <div className="py-10 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No registered candidates match</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                No users found meeting eligibility in this mode. Register a candidate account to see real-time matches!
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {visibleResults.map((cand, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                    cand.flags.not_eligible
                      ? 'border-slate-200 bg-slate-50 opacity-60'
                      : idx === 0
                      ? 'border-brand-400 bg-brand-50/20 shadow-sm'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {cand.worker_summary?.name || cand.job_summary?.title || `Candidate #${idx + 1}`}
                        </span>
                        {idx === 0 && !cand.flags.not_eligible && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800">
                            #1 Rank
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {cand.distance_km !== null ? `${cand.distance_km} km away` : 'Location matched'}
                      </span>
                    </div>

                    <div className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs">
                      {cand.total_score.toFixed(1)} pts
                    </div>
                  </div>

                  {/* Factor Breakdown Bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
                    <div style={{ width: `${(cand.breakdown.skill.points / 100) * 100}%` }} className="h-full bg-indigo-600" />
                    <div style={{ width: `${(cand.breakdown.location.points / 100) * 100}%` }} className="h-full bg-sky-500" />
                    <div style={{ width: `${(cand.breakdown.availability.points / 100) * 100}%` }} className="h-full bg-emerald-500" />
                    <div style={{ width: `${(cand.breakdown.rating.points / 100) * 100}%` }} className="h-full bg-amber-500" />
                    <div style={{ width: `${(cand.breakdown.payment.points / 100) * 100}%` }} className="h-full bg-violet-500" />
                  </div>

                  {/* Reasons snippet */}
                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-0.5">
                    {cand.reasons.slice(0, 2).map((r, rIdx) => (
                      <div key={rIdx} className="line-clamp-1 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-brand-600 shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
