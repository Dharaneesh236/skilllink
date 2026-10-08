import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { apiFetch, SKILL_CATEGORIES, formatCurrency } from '../api/client';
import { useWebSocket } from '../context/WebSocketContext';
import { Job, Application } from '../types';
import { DirectionsLink } from '../components/DirectionsLink';
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Clock,
  Briefcase,
  List,
  Map as MapIcon,
  Loader2,
  CheckCircle2,
  Send,
  AlertCircle
} from 'lucide-react';

export const FindJobsPage: React.FC = () => {
  const { on } = useWebSocket();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    loadJobs();

    const unsubJob = on('NEW_JOB_AVAILABLE', () => loadJobs());
    const unsubStatus = on('JOB_STATUS_UPDATED', () => loadJobs());

    const onFocus = () => loadJobs();
    window.addEventListener('focus', onFocus);

    return () => {
      unsubJob();
      unsubStatus();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const [allJobsRes, myAppsRes] = await Promise.allSettled([
        apiFetch<Job[]>('/jobs'),
        apiFetch<Application[]>('/applications'),
      ]);
      if (allJobsRes.status === 'fulfilled') {
        setJobs(allJobsRes.value);
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

  const handleApply = async (jobId: number, title: string) => {
    setApplyingJobId(jobId);
    try {
      await apiFetch('/apply', {
        method: 'POST',
        body: JSON.stringify({ job_id: jobId }),
      });
      setAppliedJobIds((prev) => new Set([...prev, jobId]));
      setToast(`Application submitted for "${title}"!`);
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit application');
    } finally {
      setApplyingJobId(null);
    }
  };

  // Filter jobs
  const filteredJobs = jobs.filter((j) => {
    const matchesSkill = selectedSkill === 'all' || j.required_skill === selectedSkill;
    const matchesSearch =
      searchQuery === '' ||
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.location_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.required_skill.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSkill && matchesSearch;
  });

  // Setup Leaflet map when viewMode is 'map'
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.5946],
        zoom: 11,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);

    filteredJobs.forEach((job) => {
      if (job.lat && job.lng && mapInstanceRef.current) {
        const marker = L.marker([job.lat, job.lng]).addTo(mapInstanceRef.current);
        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; padding: 4px;">
            <strong style="display: block; font-size: 13px; color: #1e293b;">${job.title}</strong>
            <span style="font-size: 11px; color: #6366f1; text-transform: uppercase; font-weight: bold;">${job.required_skill}</span>
            <div style="font-size: 12px; font-weight: bold; margin-top: 4px; color: #059669;">₹${job.budget}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${job.location_text}</div>
          </div>
        `);
        markersRef.current.push(marker);
        bounds.extend([job.lat, job.lng]);
      }
    });

    if (markersRef.current.length > 0 && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

    return () => {
      if (viewMode !== 'map' && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [viewMode, filteredJobs]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {toast && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center space-x-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Find Micro-Jobs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Explore all available tasks in your local area with live updates
          </p>
        </div>

        {/* List / Map View Toggle */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              viewMode === 'map'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Interactive Map</span>
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by keyword, area or title..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>

        <select
          value={selectedSkill}
          onChange={(e) => setSelectedSkill(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 capitalize"
        >
          <option value="all">All Skills</option>
          {SKILL_CATEGORIES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No jobs match your filter</h3>
          <p className="text-xs text-slate-500 mt-1">Try clearing filters or search terms.</p>
        </div>
      ) : viewMode === 'map' ? (
        <div className="relative h-[650px] w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const hasApplied = appliedJobIds.has(job.id);
            const isApplying = applyingJobId === job.id;

            return (
              <div
                key={job.id}
                className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                      {job.required_skill}
                    </span>
                    <span className="text-lg font-black text-emerald-600">
                      {formatCurrency(job.budget)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                    {job.title}
                  </h3>

                  {job.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
                  )}

                  <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="line-clamp-1">{job.location_text}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{job.date} ({job.start_time} - {job.end_time})</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <DirectionsLink lat={job.lat} lng={job.lng} />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleApply(job.id, job.title)}
                    disabled={hasApplied || isApplying}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-sm ${
                      hasApplied
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25'
                    }`}
                  >
                    {isApplying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{hasApplied ? 'Applied' : 'Apply for Job'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
