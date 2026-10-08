import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, formatCurrency } from '../api/client';
import { useWebSocket } from '../context/WebSocketContext';
import { CustomerStats, Job } from '../types';
import {
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  PlusCircle,
  ArrowRight,
  MapPin,
  Calendar,
  AlertCircle,
  Coins
} from 'lucide-react';

export const CustomerDashboardPage: React.FC = () => {
  const { on } = useWebSocket();
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [statsRes, jobsRes] = await Promise.allSettled([
        apiFetch<CustomerStats>('/stats/customer'),
        apiFetch<Job[]>('/jobs/my'),
      ]);
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
      if (jobsRes.status === 'fulfilled') {
        setRecentJobs(jobsRes.value.slice(0, 4));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Listen for live socket events to update customer dashboard automatically
    const unsubApp = on('NEW_APPLICATION', () => loadDashboardData());
    const unsubStart = on('JOB_STARTED', () => loadDashboardData());
    const unsubComp = on('JOB_COMPLETED', () => loadDashboardData());
    const unsubStatus = on('JOB_STATUS_UPDATED', () => loadDashboardData());
    const unsubPay = on('PAYMENT_RECORDED', () => loadDashboardData());

    // Auto-refresh when tab regains focus
    const onFocus = () => loadDashboardData();
    window.addEventListener('focus', onFocus);

    // Periodic sync interval (every 10s)
    const interval = setInterval(() => loadDashboardData(), 10000);

    return () => {
      unsubApp();
      unsubStart();
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-brand-300 text-xs font-semibold">
            Customer Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Micro-Employment Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Post local tasks and review verified, algorithmically ranked applicant profiles.
          </p>
        </div>

        <Link
          to="/customer/post-job"
          className="px-6 py-3.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/25 transition-all flex items-center space-x-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Post a New Job</span>
        </Link>
      </div>

      {/* Dynamic Statistics Cards (Rule #2: Zero hardcoding, computed from DB) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Jobs Posted */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Jobs Posted</span>
            <Briefcase className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats ? stats.jobs_posted : 0}
          </div>
          <p className="text-[11px] text-slate-400">Total tasks initiated</p>
        </div>

        {/* Applications Received */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Applications Received</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats ? stats.applications_received : 0}
          </div>
          <p className="text-[11px] text-slate-400">Worker submissions</p>
        </div>

        {/* Jobs Assigned */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Active & Assigned</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats ? stats.jobs_assigned : 0}
          </div>
          <p className="text-[11px] text-slate-400">In progress / OTP pending</p>
        </div>

        {/* Total Spent */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Completed Spend</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {formatCurrency(stats?.total_spent || 0)}
          </div>
          <p className="text-[11px] text-slate-400">Simulated recorded payouts</p>
        </div>
      </div>

      {/* Recent Posted Jobs */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">My Posted Jobs</h3>
            <p className="text-xs text-slate-500">
              Review applicant queues and manage live progress
            </p>
          </div>
          <Link
            to="/customer/jobs"
            className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center space-x-1"
          >
            <span>View All Jobs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800">No jobs posted yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
              Need assistance with cleaning, packing, gardening or local chores? Post your first micro-job!
            </p>
            <Link
              to="/customer/post-job"
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow transition-all inline-flex items-center space-x-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post a Job Now</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-brand-300 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                      {job.required_skill}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold capitalize bg-slate-100 text-slate-700">
                      {job.status}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 line-clamp-1">
                    {job.title}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500 pt-1">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="line-clamp-1">{job.location_text}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{job.date}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Budget</span>
                    <span className="text-base font-black text-slate-900">
                      {formatCurrency(job.budget)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/customer/jobs/${job.id}/applicants`}
                      className="px-3.5 py-2 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors flex items-center space-x-1"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Applicants ({job.applications_count || 0})</span>
                    </Link>

                    {['assigned', 'in_progress', 'completed'].includes(job.status) && (
                      <Link
                        to={`/customer/jobs/${job.id}/manage`}
                        className="px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        Manage
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
