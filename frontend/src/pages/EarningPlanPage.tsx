import React, { useEffect, useState } from 'react';
import { apiFetch, formatCurrency } from '../api/client';
import { EarningPlan, WorkerProfile } from '../types';
import {
  Calendar,
  Coins,
  Target,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

export const EarningPlanPage: React.FC = () => {
  // Format today's date as YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [plan, setPlan] = useState<EarningPlan | null>(null);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlan();
  }, [selectedDate]);

  const loadPlan = async () => {
    setIsLoading(true);
    try {
      const [planData, profileData] = await Promise.all([
        apiFetch<EarningPlan>(`/earning-plan?date=${selectedDate}`),
        apiFetch<WorkerProfile>('/profile'),
      ]);
      setPlan(planData);
      setProfile(profileData);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-brand-950 text-white shadow-xl space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-brand-300 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Algorithmic Optimization Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Optimal Daily Earning Plan
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          Powered by <strong>Weighted Interval Scheduling (Dynamic Programming)</strong>.
          Our engine mathematically identifies the highest-earning set of eligible jobs for your chosen date with <em>zero overlapping time conflicts</em>.
        </p>

        {/* Date Selector */}
        <div className="pt-3 flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
            <Calendar className="w-4 h-4 text-brand-400" />
            <span>Select Target Date:</span>
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold border border-white/20 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : !plan ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Could not calculate earning plan</h3>
        </div>
      ) : (
        <>
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Daily Goal */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1">
                <Target className="w-3.5 h-3.5 text-brand-600" />
                <span>Daily Earning Goal</span>
              </span>
              <div className="text-2xl font-black text-slate-900">
                {formatCurrency(plan.daily_goal)}
              </div>
              <p className="text-[11px] text-slate-400">Target for {selectedDate}</p>
            </div>

            {/* Total Potential Earnings */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Optimal Schedule Total</span>
              </span>
              <div className="text-2xl font-black text-emerald-600">
                {formatCurrency(plan.total_earnings)}
              </div>
              <p className="text-[11px] text-slate-400">
                {plan.chosen_jobs.length} non-overlapping jobs
              </p>
            </div>

            {/* Remaining Gap */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>Remaining Goal Gap</span>
              </span>
              <div className="text-2xl font-black text-slate-900">
                {formatCurrency(plan.remaining_gap)}
              </div>
              <p className="text-[11px] text-slate-400">
                {plan.goal_progress_percent >= 100 ? 'Goal fully satisfied!' : 'Remaining to reach goal'}
              </p>
            </div>
          </div>

          {/* Goal Progress Bar */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <span>Goal Fulfillment Progress</span>
              <span className="text-brand-600 text-sm">{plan.goal_progress_percent}%</span>
            </div>
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, plan.goal_progress_percent)}%` }}
              />
            </div>
          </div>

          {/* Non-overlapping Jobs Timeline */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Recommended Non-Overlapping Timeline
                </h3>
                <p className="text-xs text-slate-500">
                  Arranged chronologically with guaranteed zero time overlaps
                </p>
              </div>
            </div>

            {plan.chosen_jobs.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No eligible jobs found for {selectedDate}</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  There are either no open jobs matching your skills on this date, or existing jobs fall outside your availability window.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {plan.chosen_jobs.map((job, idx) => (
                  <div
                    key={job.job_id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 border border-brand-200">
                        #{idx + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {job.required_skill}
                          </span>
                          <span className="text-xs font-bold text-brand-600">
                            Match: {job.match_score.toFixed(1)} pts
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900">
                          {job.title}
                        </h4>
                        <p className="text-xs text-slate-500 flex items-center space-x-1.5">
                          <span>{job.location_text}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 gap-1">
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                        <Clock className="w-3.5 h-3.5 text-brand-500" />
                        <span>{job.start_time} - {job.end_time}</span>
                      </div>
                      <span className="text-base font-black text-emerald-600">
                        {formatCurrency(job.budget)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
