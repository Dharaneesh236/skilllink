import React, { useEffect, useState } from 'react';
import { apiFetch, formatCurrency } from '../api/client';
import { useWebSocket } from '../context/WebSocketContext';
import { Application } from '../types';
import { StartCodeModal } from '../components/StartCodeModal';
import { ReviewModal } from '../components/ReviewModal';
import { ReportBlockModal } from '../components/ReportBlockModal';
import { DirectionsLink } from '../components/DirectionsLink';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Star,
  ShieldAlert,
  Loader2,
  Calendar,
  MapPin,
  Phone,
  AlertCircle
} from 'lucide-react';

export const WorkerApplicationsPage: React.FC = () => {
  const { on } = useWebSocket();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [startModalJob, setStartModalJob] = useState<{ id: number; title: string } | null>(null);
  const [reviewModalJob, setReviewModalJob] = useState<{ id: number; customerId: number; customerName: string } | null>(null);
  const [reportModalUser, setReportModalUser] = useState<{ id: number; name: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();

    const unsubAcc = on('APPLICATION_ACCEPTED', () => loadApplications());
    const unsubRej = on('APPLICATION_REJECTED', () => loadApplications());
    const unsubStart = on('JOB_STARTED', () => loadApplications());
    const unsubComp = on('JOB_COMPLETED', () => loadApplications());
    const unsubStatus = on('JOB_STATUS_UPDATED', () => loadApplications());

    const onFocus = () => loadApplications();
    window.addEventListener('focus', onFocus);

    return () => {
      unsubAcc();
      unsubRej();
      unsubStart();
      unsubComp();
      unsubStatus();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<Application[]>('/applications');
      setApplications(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Accepted & Assigned</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center space-x-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>Not Selected</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Under Review</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {toast && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">My Applications</h1>
        <p className="text-xs text-slate-500 mt-1">
          Track the live status of your job submissions, perform start code verification, and submit reviews
        </p>
      </div>

      {isLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : applications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No applications submitted yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Head to the Recommended Jobs page to discover high-matching tasks in your locality.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const job = app.job;
            const isAccepted = app.status === 'accepted';
            const isJobInProgress = job?.status === 'in_progress';
            const isJobCompleted = job?.status === 'completed';

            return (
              <div
                key={app.id}
                className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Applied on {new Date(app.applied_at).toLocaleDateString()}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      {job?.title || 'Job Posting'}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-base font-black text-emerald-600">
                      {formatCurrency(job?.budget || 0)}
                    </span>
                    {getStatusBadge(app.status)}
                  </div>
                </div>

                {/* Job Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="line-clamp-1">{job?.location_text}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{job?.date} ({job?.start_time} - {job?.end_time})</span>
                  </div>

                  <div>
                    <DirectionsLink lat={job?.lat} lng={job?.lng} />
                  </div>
                </div>

                {/* Accepted Details & Contact Revelation (Privacy rule: only revealed after acceptance) */}
                {isAccepted && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Hired by {job?.customer_name || 'Customer'}</span>
                      </span>
                      {job?.customer_phone && (
                        <a
                          href={`tel:${job.customer_phone}`}
                          className="text-xs font-bold text-emerald-700 bg-white px-3 py-1 rounded-lg border border-emerald-200 flex items-center space-x-1 hover:bg-emerald-50"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{job.customer_phone}</span>
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Please arrive at the scheduled time. When meeting the customer, request their <strong>4-digit start code</strong> and enter it below to begin the job.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    Calculated Match Score: <strong className="text-slate-800">{app.match_score.toFixed(1)} pts</strong>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Trust Report / Block */}
                    {job && (
                      <button
                        type="button"
                        onClick={() =>
                          setReportModalUser({
                            id: job.customer_id,
                            name: job.customer_name || 'Customer',
                          })
                        }
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors flex items-center space-x-1"
                        title="Report or block customer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Report</span>
                      </button>
                    )}

                    {/* Start Job Button (only if accepted and job status is 'assigned') */}
                    {isAccepted && job?.status === 'assigned' && (
                      <button
                        type="button"
                        onClick={() => setStartModalJob({ id: job.id, title: job.title })}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Enter Start Code</span>
                      </button>
                    )}

                    {/* In Progress Status */}
                    {isJobInProgress && (
                      <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-xl flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Job In Progress</span>
                      </span>
                    )}

                    {/* Completed & Review Button */}
                    {isJobCompleted && job && (
                      <button
                        type="button"
                        onClick={() =>
                          setReviewModalJob({
                            id: job.id,
                            customerId: job.customer_id,
                            customerName: job.customer_name || 'Customer',
                          })
                        }
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center space-x-1.5"
                      >
                        <Star className="w-3.5 h-3.5 fill-white text-white" />
                        <span>Rate & Review Customer</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Start Code Modal */}
      {startModalJob && (
        <StartCodeModal
          jobId={startModalJob.id}
          jobTitle={startModalJob.title}
          onSuccess={() => {
            setStartModalJob(null);
            setToast('Job successfully started! Status changed to In Progress.');
            loadApplications();
          }}
          onClose={() => setStartModalJob(null)}
        />
      )}

      {/* Review Modal */}
      {reviewModalJob && (
        <ReviewModal
          jobId={reviewModalJob.id}
          revieweeId={reviewModalJob.customerId}
          revieweeName={reviewModalJob.customerName}
          onSuccess={() => {
            setReviewModalJob(null);
            setToast('Review submitted successfully!');
            loadApplications();
          }}
          onClose={() => setReviewModalJob(null)}
        />
      )}

      {/* Report / Block Modal */}
      {reportModalUser && (
        <ReportBlockModal
          targetUserId={reportModalUser.id}
          targetUserName={reportModalUser.name}
          onSuccess={() => {
            setReportModalUser(null);
            setToast('Safety action recorded.');
            loadApplications();
          }}
          onClose={() => setReportModalUser(null)}
        />
      )}
    </div>
  );
};
