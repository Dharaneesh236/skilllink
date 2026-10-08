import React, { useEffect, useState } from 'react';
import { apiFetch, formatCurrency } from '../api/client';
import { useWebSocket } from '../context/WebSocketContext';
import { MatchEvaluation, Application } from '../types';
import { MatchBreakdownModal } from '../components/MatchBreakdownModal';
import { DirectionsLink } from '../components/DirectionsLink';
import {
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  Eye,
  Send,
  Layers
} from 'lucide-react';

export const RecommendedJobsPage: React.FC = () => {
  const { on } = useWebSocket();
  const [recommendations, setRecommendations] = useState<MatchEvaluation[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showIneligible, setShowIneligible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchEvaluation | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();

    const unsubJob = on('NEW_JOB_AVAILABLE', () => loadRecommendations());
    const unsubStatus = on('JOB_STATUS_UPDATED', () => loadRecommendations());
    const unsubApp = on('APPLICATION_ACCEPTED', () => loadRecommendations());

    const onFocus = () => loadRecommendations();
    window.addEventListener('focus', onFocus);

    return () => {
      unsubJob();
      unsubStatus();
      unsubApp();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const [recsRes, myAppsRes] = await Promise.allSettled([
        apiFetch<MatchEvaluation[]>('/recommend-jobs'),
        apiFetch<Application[]>('/applications'),
      ]);
      if (recsRes.status === 'fulfilled') {
        setRecommendations(recsRes.value);
      }
      if (myAppsRes.status === 'fulfilled') {
        setAppliedJobIds(new Set(myAppsRes.value.map((a) => a.job_id)));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async (match: MatchEvaluation) => {
    setApplyingJobId(match.job_id);
    try {
      await apiFetch('/apply', {
        method: 'POST',
        body: JSON.stringify({ job_id: match.job_id }),
      });
      setAppliedJobIds((prev) => new Set([...prev, match.job_id]));
      setToast(`Successfully applied for "${match.job_summary?.title}"! Customer has been notified.`);
      setTimeout(() => setToast(null), 4000);
      if (selectedMatch?.job_id === match.job_id) {
        setSelectedMatch(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit application');
    } finally {
      setApplyingJobId(null);
    }
  };

  const visibleJobs = recommendations.filter((r) => {
    if (showIneligible) return true;
    return !r.flags.not_eligible;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Worker &rarr; Opportunities Experience</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Recommended Opportunities For You
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Jobs ranked dynamically based on your skillset, travel distance, availability overlap, rating, and expected payment.
          </p>
        </div>

        {/* Ineligible Filter Toggle */}
        <button
          onClick={() => setShowIneligible(!showIneligible)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border ${
            showIneligible
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>{showIneligible ? 'Showing Ineligible' : 'Hide Ineligible (0 Skill/Conflict)'}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : visibleJobs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No matching jobs available right now</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Try adjusting your skills or travel radius in your profile settings, or check back soon as customers post new tasks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleJobs.map((item, index) => {
            const hasApplied = appliedJobIds.has(item.job_id);
            const isApplying = applyingJobId === item.job_id;

            return (
              <div
                key={item.job_id}
                className={`p-6 rounded-3xl bg-white border transition-all space-y-4 flex flex-col justify-between ${
                  item.flags.not_eligible
                    ? 'border-slate-200 opacity-60 bg-slate-50/50'
                    : index === 0
                    ? 'border-brand-300 shadow-md ring-2 ring-brand-500/10'
                    : 'border-slate-200 hover:border-brand-200 shadow-sm'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Skill tag, rank badge, score */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                        {item.job_summary?.required_skill}
                      </span>
                      {index === 0 && !item.flags.not_eligible && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200 flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Top Match</span>
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="px-3 py-1 rounded-xl bg-slate-900 text-white font-mono text-base font-black">
                        {item.total_score.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">/ 100</span>
                      </div>
                    </div>
                  </div>

                  {/* Title and Budget */}
                  <div className="flex justify-between items-baseline gap-2">
                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {item.job_summary?.title}
                    </h3>
                    <span className="text-lg font-black text-emerald-600 shrink-0">
                      {formatCurrency(item.job_summary?.budget || 0)}
                    </span>
                  </div>

                  {/* Location, Timing, Distance */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="line-clamp-1">{item.job_summary?.location_text}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{item.job_summary?.date} ({item.job_summary?.start_time} - {item.job_summary?.end_time})</span>
                    </div>
                  </div>

                  {/* Directions & Distance */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <div className="text-slate-500 font-medium">
                      {item.distance_km !== null ? (
                        <span>Distance: <strong>{item.distance_km} km</strong> away</span>
                      ) : (
                        <span>Approximate location</span>
                      )}
                    </div>
                    {/* Zero-Cost link buttons */}
                    <DirectionsLink
                      lat={(item as any).job_summary?.lat}
                      lng={(item as any).job_summary?.lng}
                    />
                  </div>

                  {/* 5-Factor Score Bar */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                      <span>Algorithm Breakdown</span>
                      <span>Skill ({item.breakdown.skill.points.toFixed(0)}) • Loc ({item.breakdown.location.points.toFixed(0)}) • Avail ({item.breakdown.availability.points.toFixed(0)}) • Rate ({item.breakdown.rating.points.toFixed(0)}) • Pay ({item.breakdown.payment.points.toFixed(0)})</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                      <div style={{ width: `${(item.breakdown.skill.points / 100) * 100}%` }} className="h-full bg-indigo-600" title="Skill match" />
                      <div style={{ width: `${(item.breakdown.location.points / 100) * 100}%` }} className="h-full bg-sky-500" title="Location proximity" />
                      <div style={{ width: `${(item.breakdown.availability.points / 100) * 100}%` }} className="h-full bg-emerald-500" title="Availability overlap" />
                      <div style={{ width: `${(item.breakdown.rating.points / 100) * 100}%` }} className="h-full bg-amber-500" title="Rating score" />
                      <div style={{ width: `${(item.breakdown.payment.points / 100) * 100}%` }} className="h-full bg-violet-500" title="Payment fit" />
                    </div>
                  </div>

                  {/* Top Deterministic Reasons */}
                  <div className="space-y-1 text-xs text-slate-600">
                    {item.reasons.slice(0, 2).map((r, i) => (
                      <div key={i} className="flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                        <span className="line-clamp-1">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMatch(item)}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center space-x-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Explain Score</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApply(item)}
                    disabled={hasApplied || isApplying || item.flags.not_eligible}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm ${
                      hasApplied
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : item.flags.not_eligible
                        ? 'bg-rose-100 text-rose-700 cursor-not-allowed'
                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25'
                    }`}
                  >
                    {isApplying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{hasApplied ? 'Applied' : item.flags.not_eligible ? 'Ineligible' : 'Apply Now'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Breakdown Inspection Modal */}
      {selectedMatch && (
        <MatchBreakdownModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onApply={() => handleApply(selectedMatch)}
          hasApplied={appliedJobIds.has(selectedMatch.job_id)}
          isApplying={applyingJobId === selectedMatch.job_id}
        />
      )}
    </div>
  );
};
