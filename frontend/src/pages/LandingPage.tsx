import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Target,
  Compass,
  Zap,
  CheckCircle,
  Users,
  MapPin,
  Clock,
  Coins
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200/80 text-brand-700 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <span>Worker-Centric Flexible Micro-Employment</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Connecting Skills to{' '}
            <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-600 bg-clip-text text-transparent">
              Opportunities
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Turn your unused skills and available hours into immediate income.
            SkillLink ranks the best jobs for workers and matches verified workers for local tasks using an explainable, multi-factor engine.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            {user ? (
              <Link
                to={user.role === 'worker' ? '/worker/dashboard' : '/customer/dashboard'}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all"
              >
                <span>Go to Your Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register?role=worker"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all"
                >
                  <span>Earn as a Worker</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/register?role=customer"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm flex items-center justify-center space-x-2 transition-all"
                >
                  <span>Hire Local Skills</span>
                </Link>
              </>
            )}
            <Link
              to="/live-engine"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 flex items-center justify-center space-x-2 transition-all"
            >
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>Interactive Engine Demo</span>
            </Link>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[600px] h-[600px] bg-gradient-to-tr from-brand-300/20 via-purple-300/20 to-sky-300/20 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Core Differentiator: Worker -> Opportunities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="max-w-3xl space-y-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
              The Platform Differentiator
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Worker &rarr; Opportunities is First-Class
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Unlike traditional gig boards where workers endlessly scroll through irrelevant listings, SkillLink is fundamentally <strong>worker-centric</strong>. We analyze each worker's unique skillset, exact travel radius, time availability window, and daily earning goal to compute an optimal schedule of non-overlapping, high-paying jobs.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <Target className="w-5 h-5 text-brand-400 mb-2" />
                <h4 className="text-sm font-bold">Dynamic Scoring</h4>
                <p className="text-xs text-slate-400 mt-1">Multi-factor engine evaluating skill, location, availability, rating, and budget.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <Coins className="w-5 h-5 text-emerald-400 mb-2" />
                <h4 className="text-sm font-bold">Earning Plan (DP)</h4>
                <p className="text-xs text-slate-400 mt-1">Weighted interval scheduling maximizes daily income without schedule overlaps.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <ShieldCheck className="w-5 h-5 text-sky-400 mb-2" />
                <h4 className="text-sm font-bold">Trust OTP Handshake</h4>
                <p className="text-xs text-slate-400 mt-1">4-digit physical start code verification ensures safety and transparent tracking.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Factor Matching System Explanation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Transparent, Explainable Matching Engine
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Every match score is mathematically computed and fully explainable with deterministic numbers. No hidden black-box randomness.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-brand-300 transition-all">
            <span className="text-2xl font-black text-brand-600 block mb-1">40%</span>
            <h4 className="text-sm font-bold text-slate-900">Skill Alignment</h4>
            <p className="text-xs text-slate-500 mt-1.5">Exact required skill matches earn 1.0; related skills from taxonomy earn 0.5.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-brand-300 transition-all">
            <span className="text-2xl font-black text-sky-600 block mb-1">20%</span>
            <h4 className="text-sm font-bold text-slate-900">Proximity (Haversine)</h4>
            <p className="text-xs text-slate-500 mt-1.5">Pure Python spherical distance formula measured against worker travel radius.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-brand-300 transition-all">
            <span className="text-2xl font-black text-emerald-600 block mb-1">20%</span>
            <h4 className="text-sm font-bold text-slate-900">Availability Overlap</h4>
            <p className="text-xs text-slate-500 mt-1.5">Fraction of job time window covered. Active job conflicts return 0 and are flagged.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-brand-300 transition-all">
            <span className="text-2xl font-black text-amber-500 block mb-1">10%</span>
            <h4 className="text-sm font-bold text-slate-900">Real Reviews</h4>
            <p className="text-xs text-slate-500 mt-1.5">Derived dynamically from customer reviews. New workers receive neutral 0.5.</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-brand-300 transition-all">
            <span className="text-2xl font-black text-violet-600 block mb-1">10%</span>
            <h4 className="text-sm font-bold text-slate-900">Payment Fit</h4>
            <p className="text-xs text-slate-500 mt-1.5">Full points when budget meets expected pay; proportional ratio otherwise.</p>
          </div>
        </div>
      </section>

      {/* Social Impact / Supported Skills */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Supported Micro-Employment Categories</h3>
            <p className="text-xs text-slate-600 mt-1">
              Cleaning, Gardening, Packing, Delivery, Grocery Pickup, Cooking Assistance, Household Assistance, Elderly Assistance.
            </p>
          </div>
          <Link
            to="/live-engine"
            className="shrink-0 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition-colors flex items-center space-x-1.5"
          >
            <span>Launch Live Engine Demo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
};
