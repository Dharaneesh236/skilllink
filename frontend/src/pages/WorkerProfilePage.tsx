import React, { useEffect, useState } from 'react';
import { apiFetch, SKILL_CATEGORIES, formatCurrency } from '../api/client';
import { WorkerProfile } from '../types';
import { LocationPicker } from '../components/LocationPicker';
import {
  Save,
  Loader2,
  CheckCircle2,
  Star,
  MapPin,
  Clock,
  Target,
  DollarSign,
  Plus,
  X,
  Sparkles
} from 'lucide-react';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const WorkerProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [locationText, setLocationText] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [availStart, setAvailStart] = useState('08:00');
  const [availEnd, setAvailEnd] = useState('18:00');
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [expectedPayment, setExpectedPayment] = useState<number>(0);
  const [dailyGoal, setDailyGoal] = useState<number>(0);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(20);
  const [bio, setBio] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<WorkerProfile>('/profile');
      setProfile(data);
      setSkills(data.skills || []);
      setLocationText(data.location_text || '');
      setLat(data.lat);
      setLng(data.lng);
      setAvailStart(data.availability_start || '08:00');
      setAvailEnd(data.availability_end || '18:00');
      setAvailableDays(data.available_days || []);
      setExpectedPayment(data.expected_payment || 0);
      setDailyGoal(data.daily_goal || 0);
      setMaxDistanceKm(data.max_distance_km || 20);
      setBio(data.bio || '');
    } catch {
      setStatusMessage({ text: 'Failed to load profile', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSkill = (skill: string) => {
    const s = skill.toLowerCase().trim();
    if (skills.includes(s)) {
      setSkills(skills.filter((x) => x !== s));
    } else {
      setSkills([...skills, s]);
    }
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const s = customSkill.toLowerCase().trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
      setCustomSkill('');
    }
  };

  const handleToggleDay = (day: string) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter((d) => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updated = await apiFetch<WorkerProfile>('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          skills,
          location_text: locationText,
          lat,
          lng,
          availability_start: availStart,
          availability_end: availEnd,
          available_days: availableDays,
          expected_payment: Number(expectedPayment),
          daily_goal: Number(dailyGoal),
          max_distance_km: Number(maxDistanceKm),
          bio,
        }),
      });
      setProfile(updated);
      setStatusMessage({ text: 'Worker profile updated successfully!', type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to save profile', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header and Rating Overview */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
            Worker Onboarding & Settings
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
            {profile?.user_name || 'My Worker Profile'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure your skills and working preferences so our matching engine can recommend optimal jobs.
          </p>
        </div>

        {/* Dynamic Computed Rating (honest, review-based per Rule #2) */}
        <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
            <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <span className="text-lg font-black text-slate-900">
                {profile?.review_count === 0 ? 'New Worker' : profile?.average_rating.toFixed(1)}
              </span>
              {profile && profile.review_count > 0 && (
                <span className="text-xs text-slate-400">/ 5.0</span>
              )}
            </div>
            <span className="text-[11px] text-slate-500">
              {profile?.review_count === 0
                ? 'Neutral 0.5 baseline (No reviews yet)'
                : `Based on ${profile?.review_count} verified reviews`}
            </span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center space-x-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Skills Category Selection */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">1. My Skills & Offerings</h3>
            <p className="text-xs text-slate-500">
              Select the tasks you can perform. Our engine gives 100% points for exact matches and 50% for related skills.
            </p>
          </div>

          {/* Quick toggle chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {SKILL_CATEGORIES.map((cat) => {
              const selected = skills.includes(cat);
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => handleToggleSkill(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize transition-all flex items-center space-x-1.5 ${
                    selected
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat}</span>
                  {selected && <X className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>

          {/* Custom skill adder */}
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="text"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              placeholder="Add another skill..."
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={handleAddCustomSkill}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {skills.length === 0 && (
            <p className="text-xs text-amber-600 italic">
              No skills selected yet. Select at least one to receive recommendations.
            </p>
          )}
        </div>

        {/* 2. Location & Travel Radius Picker */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">2. Base Location & Travel Radius</h3>
            <p className="text-xs text-slate-500">
              Set where you live or start from. We compute spherical distances using pure Python Haversine and respect your max radius.
            </p>
          </div>

          <LocationPicker
            locationText={locationText}
            lat={lat}
            lng={lng}
            radiusKm={maxDistanceKm}
            onChange={(loc) => {
              setLocationText(loc.locationText);
              setLat(loc.lat);
              setLng(loc.lng);
            }}
            placeholder="Search your town, locality, or landmark..."
          />

          <div className="pt-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
              <span>Maximum Travel Radius</span>
              <span className="text-brand-600 font-bold">{maxDistanceKm} km</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer"
            />
          </div>
        </div>

        {/* 3. Availability Window & Days */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">3. Working Hours & Available Days</h3>
            <p className="text-xs text-slate-500">
              Our engine checks availability overlap and prevents double-booking schedule conflicts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={availStart}
                onChange={(e) => setAvailStart(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={availEnd}
                onChange={(e) => setAvailEnd(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Available Days of Week (Leave blank if available all days)
            </label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const isSelected = availableDays.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => handleToggleDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. Earnings & Daily Goal */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">4. Financial Preferences</h3>
            <p className="text-xs text-slate-500">
              Used by our Weighted Interval Scheduling algorithm to generate your optimal daily earning plan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Payment per Job (Rs)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={expectedPayment}
                  onChange={(e) => setExpectedPayment(Number(e.target.value))}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-slate-900"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Daily Earning Goal (Rs)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(Number(e.target.value))}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-slate-900"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Short Bio (Optional)
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief summary of your work experience..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3.5 rounded-2xl font-bold text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 shadow-lg shadow-brand-500/25 transition-all flex items-center space-x-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Profile Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
