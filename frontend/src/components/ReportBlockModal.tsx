import React, { useState } from 'react';
import { X, ShieldAlert, Ban, Loader2 } from 'lucide-react';
import { apiFetch } from '../api/client';

interface ReportBlockModalProps {
  targetUserId: number;
  targetUserName: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const ReportBlockModal: React.FC<ReportBlockModalProps> = ({
  targetUserId,
  targetUserName,
  onSuccess,
  onClose,
}) => {
  const [actionType, setActionType] = useState<'report' | 'block'>('report');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 3) {
      setError('Please provide a descriptive reason');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const endpoint = actionType === 'block' ? '/block' : '/report';
      await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          target_id: targetUserId,
          action_type: actionType,
          reason: reason.trim(),
        }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Trust & Safety Action</h3>
              <p className="text-xs text-slate-500">Regarding user: {targetUserName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex space-x-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActionType('report')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                actionType === 'report' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Report User
            </button>
            <button
              type="button"
              onClick={() => setActionType('block')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                actionType === 'block' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Block User
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {actionType === 'block'
              ? 'Blocking prevents this user from viewing your profile, posting jobs to you, or submitting applications.'
              : 'Reporting alerts moderators to violations of platform community standards and safety.'}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Details
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain the safety or behavioral concern..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none placeholder-slate-400"
              required
            />
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-md transition-all flex items-center space-x-1.5 ${
                actionType === 'block' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{actionType === 'block' ? 'Confirm Block' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
