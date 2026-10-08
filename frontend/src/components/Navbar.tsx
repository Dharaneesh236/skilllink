import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
  Briefcase,
  Cpu,
  User as UserIcon,
  Bell,
  LogOut,
  Sparkles,
  Search,
  Calendar,
  CheckCircle2,
  PlusCircle,
  Menu,
  X,
  Radio
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { unreadCount, isConnected } = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Platform Tagline */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-accent-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-brand-900 to-indigo-800 bg-clip-text text-transparent">
                  SkillLink
                </span>
                <span className="text-[10px] font-medium text-slate-500 tracking-wider -mt-1 hidden sm:block">
                  Connecting Skills to Opportunities
                </span>
              </div>
            </Link>

            {/* Live Socket Status Pill */}
            {user && (
              <span
                className={`hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
                title={isConnected ? 'Real-time WebSocket connected' : 'Connecting to live server...'}
              >
                <Radio className={`w-3 h-3 mr-1 ${isConnected ? 'animate-pulse text-emerald-500' : 'text-amber-500'}`} />
                {isConnected ? 'Live' : 'Polling'}
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {/* Live Engine is always prominent for judges & users */}
            <Link
              to="/live-engine"
              className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center space-x-1.5 transition-all ${
                isActive('/live-engine')
                  ? 'bg-brand-50 text-brand-700 shadow-sm'
                  : 'text-indigo-600 hover:bg-indigo-50/70'
              }`}
            >
              <Cpu className="w-4 h-4 text-brand-600 animate-pulse" />
              <span>Live Engine</span>
              <span className="bg-brand-100 text-brand-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                Demo
              </span>
            </Link>

            {user?.role === 'worker' && (
              <>
                <Link
                  to="/worker/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/worker/dashboard') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/worker/recommended"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/worker/recommended') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Recommended Jobs
                </Link>
                <Link
                  to="/worker/jobs"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/worker/jobs') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Find Jobs
                </Link>
                <Link
                  to="/worker/earning-plan"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/worker/earning-plan') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Earning Plan
                </Link>
                <Link
                  to="/worker/applications"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/worker/applications') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Applications
                </Link>
              </>
            )}

            {user?.role === 'customer' && (
              <>
                <Link
                  to="/customer/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/customer/dashboard') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/customer/post-job"
                  className={`px-3 py-2 rounded-lg text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors flex items-center space-x-1`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Post Job</span>
                </Link>
                <Link
                  to="/customer/jobs"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/customer/jobs') ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  My Jobs
                </Link>
              </>
            )}
          </nav>

          {/* User Controls / Auth CTAs */}
          <div className="flex items-center space-x-2">
            {user ? (
              <>
                {/* Notifications Bell */}
                <Link
                  to="/notifications"
                  className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                {/* Worker Profile Button */}
                {user.role === 'worker' && (
                  <Link
                    to="/worker/profile"
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit Profile"
                  >
                    <UserIcon className="w-5 h-5" />
                  </Link>
                )}

                {/* Role Badge and User Name */}
                <div className="hidden sm:flex flex-col text-right pl-2 border-l border-slate-200">
                  <span className="text-sm font-semibold text-slate-900 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 capitalize">
                    {user.role} Account
                  </span>
                </div>

                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 px-2 border-t border-slate-200 space-y-1">
            <Link
              to="/live-engine"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-semibold text-brand-600 bg-brand-50"
            >
              <Cpu className="w-4 h-4" />
              <span>Live Matching Engine (Demo)</span>
            </Link>

            {user?.role === 'worker' && (
              <>
                <Link
                  to="/worker/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  Dashboard
                </Link>
                <Link
                  to="/worker/recommended"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  Recommended Jobs
                </Link>
                <Link
                  to="/worker/jobs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  Find Jobs
                </Link>
                <Link
                  to="/worker/earning-plan"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  Earning Plan
                </Link>
                <Link
                  to="/worker/applications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  My Applications
                </Link>
                <Link
                  to="/worker/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  My Profile
                </Link>
              </>
            )}

            {user?.role === 'customer' && (
              <>
                <Link
                  to="/customer/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  Dashboard
                </Link>
                <Link
                  to="/customer/post-job"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-semibold text-brand-600 hover:bg-brand-50"
                >
                  Post a Job
                </Link>
                <Link
                  to="/customer/jobs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  My Jobs
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
