import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { BottomNav } from './components/ui/BottomNav';
import { useNotificationStore } from './stores/notificationStore';

import { PhoneEntry } from './components/auth/PhoneEntry';
import { OTPVerify } from './components/auth/OTPVerify';
import { ProfileSetup } from './components/auth/ProfileSetup';
import { FeedScreen } from './components/feed/FeedScreen';
import { ExploreScreen } from './components/explore/ExploreScreen';
import { RoomsScreen } from './components/rooms/RoomsScreen';
import { RoomScreen } from './components/rooms/RoomScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import PostDetailScreen from './pages/PostDetailScreen';
import NotificationsScreen from './pages/NotificationsScreen';
import SettingsScreen from './pages/SettingsScreen';
import RecordScreen from './pages/RecordScreen';
import AdminScreen from './pages/AdminScreen';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth/phone" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/auth/phone" replace />;
  if (!(user as { isAdmin?: boolean }).isAdmin) return <Navigate to="/feed" replace />;
  return <>{children}</>;
}

/* Top bar shown inside the app shell */
function TopBar({ title }: { title?: string }) {
  const navigate = useNavigate();
  const unread = useNotificationStore((s) => s.unreadCount);

  return (
    <header className="flex-shrink-0 flex items-center justify-between px-5 h-14 border-b border-white/[0.05]">
      {title ? (
        <span className="text-echo-primary font-semibold text-base">{title}</span>
      ) : (
        <span className="text-gradient font-bold text-xl tracking-tight">echo</span>
      )}
      <button
        onClick={() => navigate('/notifications')}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-echo-elevated transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="#8888AA" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-echo-accent-secondary rounded-full" />
        )}
      </button>
    </header>
  );
}

/* The main scrollable app shell */
function AppLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="flex flex-col h-full max-w-[480px] mx-auto">
      <TopBar title={title} />
      <main className="flex-1 scrollable min-h-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Routes>
      <Route path="/auth/phone"  element={<PhoneEntry />} />
      <Route path="/auth/verify" element={<OTPVerify />} />
      <Route path="/auth/setup"  element={<ProfileSetup />} />

      <Route path="/" element={<Navigate to={isAuthenticated ? '/feed' : '/auth/phone'} replace />} />

      <Route path="/feed" element={<ProtectedRoute><AppLayout><FeedScreen /></AppLayout></ProtectedRoute>} />
      <Route path="/explore" element={<ProtectedRoute><AppLayout title="Explore"><ExploreScreen /></AppLayout></ProtectedRoute>} />
      <Route path="/record" element={<ProtectedRoute><AppLayout title="New Post"><RecordScreen /></AppLayout></ProtectedRoute>} />
      <Route path="/rooms" element={<ProtectedRoute><AppLayout title="Live Rooms"><RoomsScreen /></AppLayout></ProtectedRoute>} />
      <Route path="/rooms/:id" element={<ProtectedRoute><AppLayout><RoomScreen /></AppLayout></ProtectedRoute>} />
      <Route path="/profile/me" element={<ProtectedRoute><AppLayout><ProfileScreen /></AppLayout></ProtectedRoute>} />
      <Route path="/profile/:username" element={<ProtectedRoute><AppLayout><ProfileScreen /></AppLayout></ProtectedRoute>} />
      <Route path="/post/:id" element={<ProtectedRoute><AppLayout title="Post"><PostDetailScreen /></AppLayout></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><AppLayout title="Notifications"><NotificationsScreen /></AppLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppLayout title="Settings"><SettingsScreen /></AppLayout></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminScreen /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
