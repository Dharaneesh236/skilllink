import React from 'react';
import { MatchEvaluation } from '../types';
import { X, CheckCircle2, AlertTriangle, Sparkles, MapPin, Clock, Star, DollarSign, Award } from 'lucide-react';

interface MatchBreakdownModalProps {
  match: MatchEvaluation | null;
  onClose: () => void;
  onApply?: () => void;
  isApplying?: boolean;
  hasApplied?: boolean;
}

export const MatchBreakdownModal: React.FC<MatchBreakdownModalProps> = ({
  match,
  onClose,
  onApply,
  isApplying,
  hasApplied,
}) => {
  if (!match) return null;

  const { breakdown, total_score, flags, reasons, ai_explanation, job_summary, worker_summary } = match;

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (score >= 60) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (score >= 40) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-indigo-50/30 to-brand-50/40">
          <div>
            <span className="text-xs font-semibold text-brand-600 tracking-wider uppercase">
              Match Engine Breakdown
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {job_summary ? job_summary.title : worker_summary?.name || 'Evaluation Details'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Total Score Banner */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Overall Dynamic Compatibility</span>
              <span className="text-sm font-semibold text-slate-800">
                {flags.not_eligible ? 'Not Eligible Candidate' : 'Algorithmic Match Score'}
              </span>
            </div>
            <div className={`px-4 py-2 rounded-xl text-2xl font-extrabold border ${getScoreBadgeColor(total_score)}`}>
              {total_score.toFixed(1)} <span className="text-xs font-semibold">/ 100</span>
            </div>
          </div>

          {/* Optional AI Explanation (Explicitly labeled per Rule #4) */}
          {ai_explanation && (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/60">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-700 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI-Generated Match Summary</span>
              </div>
              <p className="text-xs text-indigo-950 leading-relaxed">{ai_explanation}</p>
            </div>
          )}

          {/* Factor Breakdown Bars */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Five-Factor Mathematical Contribution
            </h4>

            {/* 1. Skill */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Skill Alignment (40 pts)</span>
                </span>
                <span className="font-bold text-indigo-600">
                  +{breakdown.skill.points.toFixed(1)} pts
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${(breakdown.skill.points / breakdown.skill.weight) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">{breakdown.skill.reason}</p>
            </div>

            {/* 2. Location */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  <span>Geographic Proximity (20 pts)</span>
                </span>
                <span className="font-bold text-sky-600">
                  +{breakdown.location.points.toFixed(1)} pts
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${(breakdown.location.points / breakdown.location.weight) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">{breakdown.location.reason}</p>
            </div>

            {/* 3. Availability */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Time Availability (20 pts)</span>
                </span>
                <span className="font-bold text-emerald-600">
                  +{breakdown.availability.points.toFixed(1)} pts
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(breakdown.availability.points / breakdown.availability.weight) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">{breakdown.availability.reason}</p>
            </div>

            {/* 4. Rating */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span>Rating & Reviews (10 pts)</span>
                </span>
                <span className="font-bold text-amber-600">
                  +{breakdown.rating.points.toFixed(1)} pts
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${(breakdown.rating.points / breakdown.rating.weight) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">{breakdown.rating.reason}</p>
            </div>

            {/* 5. Payment */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-violet-600" />
                  <span>Budget / Payment Fit (10 pts)</span>
                </span>
                <span className="font-bold text-violet-600">
                  +{breakdown.payment.points.toFixed(1)} pts
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${(breakdown.payment.points / breakdown.payment.weight) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">{breakdown.payment.reason}</p>
            </div>
          </div>

          {/* Deterministic Explanation Reasons */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              System Computation Notes
            </h4>
            <ul className="space-y-1.5">
              {reasons.map((r, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          {onApply && (
            <button
              onClick={onApply}
              disabled={isApplying || hasApplied || flags.not_eligible}
              className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow transition-all ${
                hasApplied
                  ? 'bg-slate-400 cursor-not-allowed'
                  : flags.not_eligible
                  ? 'bg-rose-400 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/25'
              }`}
            >
              {hasApplied ? 'Already Applied' : flags.not_eligible ? 'Not Eligible' : isApplying ? 'Submitting...' : 'Apply Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
