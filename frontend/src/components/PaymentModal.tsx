import React, { useState } from 'react';
import { X, DollarSign, Loader2, Info } from 'lucide-react';
import { apiFetch, formatCurrency } from '../api/client';

interface PaymentModalProps {
  jobId: number;
  jobTitle: string;
  defaultAmount: number;
  onSuccess: () => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  jobId,
  jobTitle,
  defaultAmount,
  onSuccess,
  onClose,
}) => {
  const [amount, setAmount] = useState(defaultAmount || 0);
  const [method, setMethod] = useState('upi');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Amount must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
          job_id: jobId,
          amount: Number(amount),
          method,
        }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Record Job Payment</h3>
            <p className="text-xs text-slate-500 line-clamp-1">{jobTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Honest Simulation Notice */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start space-x-2 text-xs text-amber-800">
            <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              <strong>Payment simulation notice:</strong> In accordance with our zero-cost policy, this records payment on-platform without charging external gateway fees. Status will be marked <em>"payment recorded (simulated)"</em>.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount Paid (Rs)
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none text-slate-900 font-semibold"
                required
              />
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method Settled
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="upi">Direct UPI (PhonePe / GPay / Paytm)</option>
              <option value="cash">Direct Cash Handover</option>
              <option value="bank_transfer">Direct Bank Transfer</option>
              <option value="other">Other Settlement</option>
            </select>
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
              className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center space-x-1.5"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Record Payment (Simulated)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
