import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch, formatCurrency } from '../api/client';
import { Job, Payment, Review } from '../types';
import { PaymentModal } from '../components/PaymentModal';
import { ReviewModal } from '../components/ReviewModal';
import { DirectionsLink } from '../components/DirectionsLink';
import {
  KeyRound,
  CheckCircle2,
  Clock,
  DollarSign,
  Star,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Copy,
  Info
} from 'lucide-react';

export const JobManagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadJobDetails();
  }, [id]);

  const loadJobDetails = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const jobData = await apiFetch<Job>(`/jobs/${id}`);
      setJob(jobData);

      if (jobData.status === 'completed') {
        try {
          const payData = await apiFetch<Payment>(`/payments/job/${id}`);
          setPayment(payData);
        } catch {
          // payment not yet recorded
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyStartCode = () => {
    if (job?.start_code) {
      navigator.clipboard.writeText(job.start_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleMarkCompleted = async () => {
    if (!window.confirm('Mark this job as completed? Both you and the worker will then be able to leave reviews and record payment.')) {
      return;
    }

    setIsCompleting(true);
    try {
      await apiFetch(`/jobs/${id}/complete`, { method: 'POST' });
      setToast('Job marked as completed!');
      await loadJobDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to complete job');
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <h3 className="text-base font-bold text-slate-800">Job not found</h3>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link
        to="/customer/jobs"
        className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to My Jobs</span>
      </Link>

      {toast && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Main Card */}
      <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                {job.required_skill}
              </span>
              <span className="text-xs font-bold capitalize px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {job.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">{job.title}</h1>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block">Agreed Budget</span>
            <span className="text-2xl font-black text-emerald-600">
              {formatCurrency(job.budget)}
            </span>
          </div>
        </div>

        {/* Assigned Worker Details & Contact */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Assigned Worker</span>
            <h3 className="text-base font-bold text-slate-900">{job.assigned_worker_name || 'Worker'}</h3>
          </div>

          {job.assigned_worker_phone && (
            <a
              href={`tel:${job.assigned_worker_phone}`}
              className="px-4 py-2 bg-white text-brand-700 hover:bg-brand-50 border border-brand-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call: {job.assigned_worker_phone}</span>
            </a>
          )}
        </div>

        {/* 1. START CODE SECTION (OTP Handshake) */}
        {job.status === 'assigned' && job.start_code && (
          <div className="p-6 bg-gradient-to-br from-indigo-50 to-brand-50 rounded-2xl border border-brand-200 space-y-3">
            <div className="flex items-center space-x-2 text-brand-900 font-bold text-sm">
              <KeyRound className="w-5 h-5 text-brand-600" />
              <span>Physical Arrival Verification Code</span>
            </div>

            <p className="text-xs text-brand-950 leading-relaxed">
              When the worker arrives in person at the location, share this <strong>4-digit code</strong> with them.
              Entering this code verifies physical presence and officially starts the job.
            </p>

            <div className="flex items-center space-x-3 pt-1">
              <div className="font-mono text-3xl font-black tracking-widest bg-white px-6 py-2.5 rounded-xl border border-brand-300 text-brand-900 shadow-inner">
                {job.start_code}
              </div>

              <button
                type="button"
                onClick={handleCopyStartCode}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center space-x-1.5 shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. IN PROGRESS SECTION */}
        {job.status === 'in_progress' && (
          <div className="p-6 bg-purple-50 rounded-2xl border border-purple-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>Job is Currently In Progress</span>
              </span>
              <p className="text-xs text-purple-900">
                Worker verified with start code. Once the work is successfully finished, mark the job as completed.
              </p>
            </div>

            <button
              type="button"
              onClick={handleMarkCompleted}
              disabled={isCompleting}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 shrink-0"
            >
              {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Mark Job as Completed</span>
            </button>
          </div>
        )}

        {/* 3. COMPLETED SECTION */}
        {job.status === 'completed' && (
          <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-4">
            <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Job Completed Successfully</span>
            </div>

            <p className="text-xs text-emerald-800 leading-relaxed">
              Work has concluded. Record the settlement payment and leave a rating for the worker to update their dynamic profile score.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                disabled={Boolean(payment)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm ${
                  payment
                    ? 'bg-emerald-200 text-emerald-800 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>{payment ? 'Payment Recorded (Simulated)' : 'Record Payment (Simulated)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReviewModal(true)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <Star className="w-3.5 h-3.5 fill-white text-white" />
                <span>Rate & Review Worker</span>
              </button>
            </div>
          </div>
        )}

        {/* Job metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>{job.location_text}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{job.date} ({job.start_time} - {job.end_time})</span>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          jobId={job.id}
          jobTitle={job.title}
          defaultAmount={job.budget}
          onSuccess={() => {
            setShowPaymentModal(false);
            setToast('Payment recorded (simulated)!');
            loadJobDetails();
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && job.assigned_worker_id && (
        <ReviewModal
          jobId={job.id}
          revieweeId={job.assigned_worker_id}
          revieweeName={job.assigned_worker_name || 'Worker'}
          onSuccess={() => {
            setShowReviewModal(false);
            setToast('Review submitted! Worker rating updated.');
            loadJobDetails();
          }}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
};
