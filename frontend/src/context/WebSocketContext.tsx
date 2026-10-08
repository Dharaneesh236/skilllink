import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from '../api/client';
import { NotificationItem } from '../types';

type EventHandler = (data: any) => void;

interface WebSocketContextType {
  isConnected: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  on: (event: string, handler: EventHandler) => () => void;
  toastMessage: string | null;
  clearToast: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<EventHandler>>>(new Map());

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const data = await apiFetch<NotificationItem[]>('/notifications');
      setNotifications(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl = apiBase.replace(/^http/, 'ws') + `/ws?token=${token}`;

    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let pingInterval: any = null;

    const connect = () => {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        pingInterval = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send('ping');
          }
        }, 20000);
      };

      socket.onmessage = (event) => {
        try {
          if (event.data === 'pong') return;
          const msg = JSON.parse(event.data);
          const { type, data } = msg;

          // Dispatch to subscribers
          const handlers = listenersRef.current.get(type);
          if (handlers) {
            handlers.forEach((h) => h(data));
          }

          // Trigger notifications refresh and toast notification
          fetchNotifications();

          if (type === 'NEW_JOB_AVAILABLE') {
            setToastMessage(`New Job Available: "${data.title}" (₹${data.budget})`);
          } else if (type === 'NEW_APPLICATION') {
            setToastMessage(`New applicant "${data.worker_name}" applied for your job!`);
          } else if (type === 'APPLICATION_ACCEPTED') {
            setToastMessage(`Congratulations! Your application for "${data.job_title}" was ACCEPTED!`);
          } else if (type === 'APPLICATION_REJECTED') {
            setToastMessage(`Application update: "${data.job_title}" was filled.`);
          } else if (type === 'JOB_STARTED') {
            setToastMessage(`Job is now in progress!`);
          } else if (type === 'JOB_COMPLETED') {
            setToastMessage(`Job marked completed!`);
          }
        } catch {
          // ignore non-json
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        clearInterval(pingInterval);
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    // Fallback polling every 8s in case socket drops
    const fallbackPoll = setInterval(() => {
      fetchNotifications();
    }, 8000);

    return () => {
      clearInterval(fallbackPoll);
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [token, user]);

  const on = (event: string, handler: EventHandler) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(handler);

    return () => {
      listenersRef.current.get(event)?.delete(handler);
    };
  };

  const markAsRead = async (id: number) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const clearToast = () => setToastMessage(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        on,
        toastMessage,
        clearToast,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
