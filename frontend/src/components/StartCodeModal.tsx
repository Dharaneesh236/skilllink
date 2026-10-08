import React, { useState } from 'react';
import { X, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../api/client';

interface StartCodeModalProps {
  jobId: number;
  jobTitle: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const StartCodeModal: React.FC<StartCodeModalProps> = ({
  jobId,
  jobTitle,
  onSuccess,
  onClose,
}) => {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 4) {
      setError('Please enter a valid 4-digit numeric code');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch(`/jobs/${jobId}/start`, {
        method: 'POST',
        body: JSON.stringify({ start_code: code.trim() }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Incorrect start code. Please verify with the customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Start Job Handshake</h3>
              <p className="text-xs text-slate-500 line-clamp-1">{jobTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Upon physical arrival at the job location, ask the customer for their <strong className="text-slate-800">4-digit start code</strong>.
            This OTP handshake confirms your safe arrival and officially starts the job.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              4-Digit Start Code
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="w-full text-center tracking-widest text-2xl font-mono py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                autoFocus
              />
              <KeyRound className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            </div>
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
              disabled={isSubmitting || code.length !== 4}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center space-x-1.5"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Verify & Start Job</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
