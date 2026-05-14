import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import type { Notification } from '../types';

let globalSocket: Socket | null = null;

export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const incrementUnread = useNotificationStore((s) => s.incrementUnread);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
      return;
    }

    if (globalSocket?.connected) {
      socketRef.current = globalSocket;
      return;
    }

    const SOCKET_URL = import.meta.env.VITE_API_URL || '/';

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    globalSocket = socket;
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('notification', (notification: Notification) => {
      addNotification(notification);
      incrementUnread();
    });

    socket.on('new_post', (_post: unknown) => {
      // Could invalidate feed query here if desired
    });

    return () => {
      // Don't disconnect on unmount — keep a global connection
    };
  }, [isAuthenticated, token, addNotification, incrementUnread]);

  return socketRef.current ?? globalSocket;
}
