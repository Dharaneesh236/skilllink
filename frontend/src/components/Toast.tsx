import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { Bell, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage, clearToast } = useWebSocket();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-slate-700/60 flex items-start space-x-3 animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-2 rounded-xl bg-brand-600 text-white shrink-0 mt-0.5">
        <Bell className="w-4 h-4 animate-bounce" />
      </div>
      <div className="flex-1">
        <h5 className="text-xs font-semibold text-brand-300 uppercase tracking-wider">
          Realtime Live Update
        </h5>
        <p className="text-xs text-slate-100 mt-0.5 leading-relaxed">{toastMessage}</p>
      </div>
      <button
        onClick={clearToast}
        className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
