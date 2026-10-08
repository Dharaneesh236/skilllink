import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, formatCurrency } from '../api/client';
import { useWebSocket } from '../context/WebSocketContext';
import { WorkerStats, MatchEvaluation } from '../types';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
  Target,
  Sparkles,
  ArrowRight,
  MapPin,
  Calendar,
  AlertCircle,
  Coins
} from 'lucide-react';

export const WorkerDashboardPage: React.FC = () => {
  const { on } = useWebSocket();
  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [recommendations, setRecommendations] = useState<MatchEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [statsRes, recsRes] = await Promise.allSettled([
        apiFetch<WorkerStats>('/stats/worker'),
        apiFetch<MatchEvaluation[]>('/recommend-jobs'),
      ]);
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
      if (recsRes.status === 'fulfilled') {
        setRecommendations(recsRes.value.slice(0, 3));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Listen for real-time WebSocket events to update dashboard live automatically
    const unsubJob = on('NEW_JOB_AVAILABLE', () => loadDashboardData());
    const unsubApp = on('APPLICATION_ACCEPTED', () => loadDashboardData());
    const unsubComp = on('JOB_COMPLETED', () => loadDashboardData());
    const unsubStatus = on('JOB_STATUS_UPDATED', () => loadDashboardData());
    const unsubPay = on('PAYMENT_RECORDED', () => loadDashboardData());

    // Auto-refresh when tab regains focus
    const onFocus = () => loadDashboardData();
    window.addEventListener('focus', onFocus);

    // Periodic sync interval (every 10s) to keep numbers 100% current
    const interval = setInterval(() => loadDashboardData(), 10000);

    return () => {
      unsubJob();
      unsubApp();
      unsubComp();
      unsubStatus();
      unsubPay();
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 text-brand-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Worker Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Opportunities & Earnings
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Real-time algorithmic job matching based on your active profile.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/worker/recommended"
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommended Jobs</span>
          </Link>
          <Link
            to="/worker/earning-plan"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
          >
            <Coins className="w-3.5 h-3.5 text-amber-300" />
            <span>View Earning Plan</span>
          </Link>
        </div>
      </div>

      {/* Dynamic Statistics Cards (Rule #2: Real computed numbers, 0 when empty) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Jobs Available */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Jobs Available</span>
            <Briefcase className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats ? stats.jobs_available : 0}
          </div>
          <p className="text-[11px] text-slate-400">Open micro-jobs nearby</p>
        </div>

        {/* Jobs Applied */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Jobs Applied</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats ? stats.jobs_applied : 0}
          </div>
          <p className="text-[11px] text-slate-400">Submissions pending review</p>
        </div>

        {/* Jobs Accepted */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Jobs Accepted</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats ? stats.jobs_accepted : 0}
          </div>
          <p className="text-[11px] text-slate-400">Ready for OTP start</p>
        </div>

        {/* Jobs Completed */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Jobs Completed</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats ? stats.jobs_completed : 0}
          </div>
          <p className="text-[11px] text-slate-400">Verified and reviewed</p>
        </div>
      </div>

      {/* Financial Overview & Daily Goal Progress */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Daily Earning Goal Tracker</h3>
            <p className="text-xs text-slate-500">
              Live earnings from completed tasks compared against your target goal
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Total Earned</span>
            <span className="text-xl font-black text-emerald-600">
              {formatCurrency(stats?.total_earned || 0)}
            </span>
          </div>
        </div>

        {/* Goal Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-600">
              Progress:{' '}
              <strong className="text-slate-900">
                {stats?.goal_progress_percent ? stats.goal_progress_percent.toFixed(1) : '0.0'}%
              </strong>
            </span>
            <span className="text-slate-500">
              Goal: {stats?.daily_goal ? formatCurrency(stats.daily_goal) : 'Not set'}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, stats?.goal_progress_percent || 0)}%`,
              }}
            />
          </div>
          {(!stats?.daily_goal || stats.daily_goal === 0) && (
            <p className="text-[11px] text-slate-400 italic">
              Set a daily earning goal in{' '}
              <Link to="/worker/profile" className="text-brand-600 underline">
                your profile
              </Link>{' '}
              to track your goal progress.
            </p>
          )}
        </div>
      </div>

      {/* Quick Recommended Jobs (Worker -> Opportunities) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Top Matched Opportunities
            </h3>
            <p className="text-xs text-slate-500">
              Ranked dynamically by the five-factor matching engine
            </p>
          </div>
          <Link
            to="/worker/recommended"
            className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recommendations.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No jobs posted yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              When customers post jobs that match your skills and location, they will appear here live.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.job_id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                      {rec.job_summary?.required_skill}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {rec.total_score.toFixed(1)} pts
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">
                    {rec.job_summary?.title}
                  </h4>
                  <div className="text-xs text-slate-500 mt-2 space-y-1">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="line-clamp-1">{rec.job_summary?.location_text}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{rec.job_summary?.date} ({rec.job_summary?.start_time} - {rec.job_summary?.end_time})</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900">
                    {formatCurrency(rec.job_summary?.budget || 0)}
                  </span>
                  <Link
                    to="/worker/recommended"
                    className="text-xs font-bold text-brand-600 hover:text-brand-800"
                  >
                    View Breakdown &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
