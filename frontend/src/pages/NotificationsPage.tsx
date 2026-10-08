import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Sparkles,
  Clock,
  Briefcase,
  AlertCircle
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead } = useWebSocket();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Notifications</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time updates regarding new matched jobs, applications, and task progress
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No notifications yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            You're all caught up! New job alerts and applicant updates will appear here live.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isUnread = !n.read;
            const payload = n.payload || {};

            return (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3.5 ${
                  isUnread
                    ? 'bg-brand-50/40 border-brand-200 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    isUnread ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-baseline gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      {n.type === 'job_posted' && `New Matching Job: "${payload.title || 'Micro-Job'}"`}
                      {n.type === 'job_applied' && `New Applicant for "${payload.job_title || 'Your Job'}"`}
                      {n.type === 'application_accepted' && `Hired for "${payload.job_title || 'Job'}"!`}
                      {n.type === 'application_rejected' && `Application Update: "${payload.job_title || 'Job'}"`}
                      {n.type === 'job_started' && `Job Started: "${payload.title || 'Job'}"`}
                      {n.type === 'job_completed' && `Job Completed: "${payload.title || 'Job'}"`}
                      {n.type === 'review_received' && `New Review Received! (${payload.stars} Stars)`}
                      {n.type === 'payment_recorded' && `Payment Recorded: ₹${payload.amount}`}
                    </h4>

                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {n.type === 'job_posted' &&
                      `A customer posted a job with required skill ${payload.skill || 'relevant to your profile'}. Total budget: ₹${payload.budget}.`}
                    {n.type === 'job_applied' &&
                      `Worker ${payload.worker_name} applied with a compatibility score of ${payload.match_score?.toFixed(1) || 'high'} pts.`}
                    {n.type === 'application_accepted' &&
                      `Customer ${payload.customer_name || ''} accepted your application. Arrive on time to share your start code.`}
                    {n.type === 'application_rejected' &&
                      `${payload.reason || 'Job has been filled by another applicant.'}`}
                    {n.type === 'job_started' &&
                      `Start code verified. Worker is actively performing the requested tasks.`}
                    {n.type === 'job_completed' &&
                      `The customer has marked the job complete. You may now submit your review.`}
                    {n.type === 'review_received' &&
                      `"${payload.comment || 'Feedback received'}" - Rated by ${payload.reviewer_name}.`}
                    {n.type === 'payment_recorded' &&
                      `Customer recorded simulated payment of ₹${payload.amount}.`}
                  </p>
                </div>

                {isUnread && (
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-600 shrink-0 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
