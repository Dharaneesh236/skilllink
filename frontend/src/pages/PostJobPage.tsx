import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, SKILL_CATEGORIES } from '../api/client';
import { LocationPicker } from '../components/LocationPicker';
import { Job } from '../types';
import {
  PlusCircle,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';

export const PostJobPage: React.FC = () => {
  const navigate = useNavigate();
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Immutable Rule #7: Form initial values empty
  const [title, setTitle] = useState('');
  const [requiredSkill, setRequiredSkill] = useState<string>('cleaning');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [date, setDate] = useState(tomorrowStr);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [budget, setBudget] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !requiredSkill || !locationText || !date || !startTime || !endTime) {
      setError('Please fill all required fields');
      return;
    }

    if (budget <= 0) {
      setError('Budget must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await apiFetch<Job>('/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          required_skill: requiredSkill.toLowerCase().trim(),
          description: description.trim(),
          location_text: locationText.trim(),
          lat,
          lng,
          date,
          start_time: startTime,
          end_time: endTime,
          budget: Number(budget),
        }),
      });

      // Realtime alerts were pushed to matching workers automatically
      navigate(`/customer/jobs/${created.id}/applicants`);
    } catch (err: any) {
      setError(err.message || 'Failed to post job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
          Micro-Employment Request
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
          Post a New Micro-Job
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          When posted, our five-factor matching engine will immediately evaluate registered workers and send real-time notifications to eligible candidates.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Job Essentials */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Task Details</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2-Hour Apartment Deep Cleaning"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Required Skill Category *
              </label>
              <select
                value={requiredSkill}
                onChange={(e) => setRequiredSkill(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 capitalize"
                required
              >
                {SKILL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="capitalize">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Offered Budget (Rs) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={budget || ''}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-slate-900"
                  required
                />
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Description & Instructions (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tasks to complete, equipment available, or specific notes..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Schedule & Timing */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Date & Time Window</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Time *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Location Picker */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Job Location</h3>
          <LocationPicker
            locationText={locationText}
            lat={lat}
            lng={lng}
            onChange={(loc) => {
              setLocationText(loc.locationText);
              setLat(loc.lat);
              setLng(loc.lng);
            }}
            placeholder="Type your neighborhood, apartment, or address..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3.5 rounded-2xl font-bold text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 shadow-lg shadow-brand-500/25 transition-all flex items-center space-x-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
            <span>Publish Job & Alert Matching Workers</span>
          </button>
        </div>
      </form>
    </div>
  );
};
