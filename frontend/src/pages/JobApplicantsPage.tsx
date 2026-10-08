import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { apiFetch, formatCurrency } from '../api/client';
import { Job, Application } from '../types';
import { MatchBreakdownModal } from '../components/MatchBreakdownModal';
import { ReportBlockModal } from '../components/ReportBlockModal';
import {
  Users,
  CheckCircle2,
  XCircle,
  Star,
  MapPin,
  Calendar,
  Clock,
  Briefcase,
  AlertCircle,
  Loader2,
  Layers,
  ShieldAlert,
  ArrowLeft,
  KeyRound
} from 'lucide-react';

export const JobApplicantsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<any | null>(null);
  const [reportModalUser, setReportModalUser] = useState<{ id: number; name: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Map
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    loadJobAndApplicants();
  }, [id]);

  const loadJobAndApplicants = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [jobData, appsData] = await Promise.all([
        apiFetch<Job>(`/jobs/${id}`),
        apiFetch<Application[]>(`/jobs/${id}/applications`),
      ]);
      setJob(jobData);
      setApplicants(appsData);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (app: Application) => {
    if (!window.confirm(`Hire ${app.worker_name} for this job? Other pending applications will be automatically notified that the job is filled.`)) {
      return;
    }

    setAcceptingId(app.id);
    try {
      await apiFetch('/accept-job', {
        method: 'POST',
        body: JSON.stringify({ application_id: app.id }),
      });
      setToast(`Hired ${app.worker_name}! A 4-digit start code has been generated.`);
      await loadJobAndApplicants();
      setTimeout(() => {
        navigate(`/customer/jobs/${id}/manage`);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to accept application');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (app: Application) => {
    setRejectingId(app.id);
    try {
      await apiFetch('/reject-job', {
        method: 'POST',
        body: JSON.stringify({ application_id: app.id }),
      });
      setToast(`Application rejected.`);
      await loadJobAndApplicants();
    } catch (err: any) {
      alert(err.message || 'Failed to reject application');
    } finally {
      setRejectingId(null);
    }
  };

  // Map display showing Job pin + Applicant approximate circles
  useEffect(() => {
    if (!mapContainerRef.current || !job || !job.lat || !job.lng) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [job.lat, job.lng],
        zoom: 12,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    // Job Pin
    const jobMarker = L.marker([job.lat, job.lng]).addTo(mapInstanceRef.current);
    jobMarker.bindPopup(`<strong>Job Location:</strong> ${job.title}`);

    // If job is already assigned, zoom in to job
    mapInstanceRef.current.setView([job.lat, job.lng], 12);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [job]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

      {/* Job Summary Banner */}
      {job && (
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                {job.required_skill}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold capitalize bg-slate-100 text-slate-700">
                Status: {job.status}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">{job.title}</h1>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{job.location_text}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{job.date} ({job.start_time} - {job.end_time})</span>
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block">Budget Offered</span>
            <span className="text-2xl font-black text-emerald-600">
              {formatCurrency(job.budget)}
            </span>
          </div>
        </div>
      )}

      {/* Main Content Layout: Applicants List + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applicants List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">
              Applicant Queue ({applicants.length})
            </h2>
            <span className="text-xs text-slate-400">
              Ranked by Matching Engine Total Score
            </span>
          </div>

          {isLoading ? (
            <div className="min-h-[30vh] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
          ) : applicants.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No applications received yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Matching eligible workers in your locality have been alerted and can apply to this task.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {applicants.map((app, index) => {
                const breakdown = app.score_breakdown || {};
                const isAccepted = app.status === 'accepted';
                const isRejected = app.status === 'rejected';

                return (
                  <div
                    key={app.id}
                    className={`p-6 rounded-3xl bg-white border transition-all space-y-4 ${
                      isAccepted
                        ? 'border-emerald-300 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/20'
                        : isRejected
                        ? 'border-slate-200 opacity-60'
                        : index === 0
                        ? 'border-brand-300 shadow-md ring-2 ring-brand-500/10'
                        : 'border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-bold text-slate-900">
                            {app.worker_name}
                          </h3>
                          {index === 0 && !isAccepted && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-brand-100 text-brand-800 border border-brand-200">
                              Highest Match
                            </span>
                          )}
                        </div>

                        {/* Rating Display */}
                        <div className="flex items-center space-x-2 mt-1 text-xs text-slate-500">
                          <div className="flex items-center space-x-1 text-amber-500 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>
                              {app.worker_review_count === 0 ? 'New Worker (0.5)' : (app.worker_rating || 0).toFixed(1)}
                            </span>
                          </div>
                          <span>•</span>
                          <span>{app.worker_review_count || 0} reviews</span>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className="text-right">
                        <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-mono font-black text-base">
                          {app.match_score.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">/ 100</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Engine Score</span>
                      </div>
                    </div>

                    {/* Skills list */}
                    {app.worker_skills && app.worker_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {app.worker_skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium capitalize"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Factor Points Breakdown Bar */}
                    {breakdown.skill && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                          <span>Match Breakdown</span>
                          <span>Skill (+{breakdown.skill.points.toFixed(0)}) • Loc (+{breakdown.location.points.toFixed(0)}) • Avail (+{breakdown.availability.points.toFixed(0)}) • Rate (+{breakdown.rating.points.toFixed(0)}) • Pay (+{breakdown.payment.points.toFixed(0)})</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                          <div style={{ width: `${(breakdown.skill.points / 100) * 100}%` }} className="h-full bg-indigo-600" />
                          <div style={{ width: `${(breakdown.location.points / 100) * 100}%` }} className="h-full bg-sky-500" />
                          <div style={{ width: `${(breakdown.availability.points / 100) * 100}%` }} className="h-full bg-emerald-500" />
                          <div style={{ width: `${(breakdown.rating.points / 100) * 100}%` }} className="h-full bg-amber-500" />
                          <div style={{ width: `${(breakdown.payment.points / 100) * 100}%` }} className="h-full bg-violet-500" />
                        </div>
                      </div>
                    )}

                    {/* Status & Actions */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        {isAccepted ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                            Worker Hired & Assigned
                          </span>
                        ) : isRejected ? (
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            Application Rejected
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Applied {new Date(app.applied_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Report button */}
                        <button
                          type="button"
                          onClick={() =>
                            setReportModalUser({
                              id: app.worker_id,
                              name: app.worker_name || 'Worker',
                            })
                          }
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                          title="Report user"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>

                        {!isAccepted && !isRejected && job?.status === 'available' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReject(app)}
                              disabled={rejectingId === app.id}
                              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                              Reject
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAccept(app)}
                              disabled={acceptingId === app.id}
                              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
                            >
                              {acceptingId === app.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>Accept & Hire</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Geographic Preview (1 Col) */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Job Location Map</h3>
          <div className="relative h-72 rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>
          <p className="text-[11px] text-slate-400 italic">
            Privacy protection: worker coordinates are obfuscated until hiring handshake is completed.
          </p>
        </div>
      </div>

      {/* Report Modal */}
      {reportModalUser && (
        <ReportBlockModal
          targetUserId={reportModalUser.id}
          targetUserName={reportModalUser.name}
          onSuccess={() => {
            setReportModalUser(null);
            setToast('Safety action recorded.');
            loadJobAndApplicants();
          }}
          onClose={() => setReportModalUser(null)}
        />
      )}
    </div>
  );
};
