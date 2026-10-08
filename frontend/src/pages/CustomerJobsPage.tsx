import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, formatCurrency } from '../api/client';
import { useWebSocket } from '../context/WebSocketContext';
import { Job } from '../types';
import {
  Briefcase,
  Users,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Loader2,
  Filter,
  ArrowRight
} from 'lucide-react';

export const CustomerJobsPage: React.FC = () => {
  const { on } = useWebSocket();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadJobs();

    const unsubApp = on('NEW_APPLICATION', () => loadJobs());
    const unsubStart = on('JOB_STARTED', () => loadJobs());
    const unsubComp = on('JOB_COMPLETED', () => loadJobs());
    const unsubStatus = on('JOB_STATUS_UPDATED', () => loadJobs());

    const onFocus = () => loadJobs();
    window.addEventListener('focus', onFocus);

    return () => {
      unsubApp();
      unsubStart();
      unsubComp();
      unsubStatus();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<Job[]>('/jobs/my');
      setJobs(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (statusFilter === 'all') return true;
    return j.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Accepting Applicants
          </span>
        );
      case 'assigned':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Worker Assigned
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Completed
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header and Post CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">My Posted Jobs</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track applicants, manage assigned workers, and complete jobs
          </p>
        </div>

        <Link
          to="/customer/post-job"
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center space-x-1.5 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Post Another Job</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {['all', 'available', 'assigned', 'in_progress', 'completed'].map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              statusFilter === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No jobs found in this category</h3>
          <p className="text-xs text-slate-500 mt-1">
            {jobs.length === 0 ? 'You have not posted any micro-jobs yet.' : 'Try selecting another status tab.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:border-brand-200 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                      {job.required_skill}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Posted on {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {job.title}
                  </h3>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-lg font-black text-emerald-600">
                    {formatCurrency(job.budget)}
                  </span>
                  {getStatusBadge(job.status)}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="line-clamp-1">{job.location_text}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{job.date} ({job.start_time} - {job.end_time})</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-brand-500 shrink-0" />
                  <span className="font-semibold text-slate-800">
                    {job.applications_count || 0} Worker Applicants
                  </span>
                </div>
              </div>

              {/* Assigned worker info if assigned */}
              {job.assigned_worker_name && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                  <span>
                    Assigned Worker: <strong className="text-slate-900">{job.assigned_worker_name}</strong>
                  </span>
                  {job.status === 'assigned' && job.start_code && (
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800">
                      Start Code: <strong>{job.start_code}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end space-x-3 border-t border-slate-100">
                <Link
                  to={`/customer/jobs/${job.id}/applicants`}
                  className="px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Review Applicants ({job.applications_count || 0})</span>
                </Link>

                {['assigned', 'in_progress', 'completed'].includes(job.status) && (
                  <Link
                    to={`/customer/jobs/${job.id}/manage`}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center space-x-1"
                  >
                    <span>Manage Execution</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
