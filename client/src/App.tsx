import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { BottomNav } from './components/ui/BottomNav';

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

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-full flex flex-col max-w-[480px] mx-auto">
      <main className="flex-1 overflow-hidden">{children}</main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/auth/phone" element={<PhoneEntry />} />
      <Route path="/auth/verify" element={<OTPVerify />} />
      <Route path="/auth/setup" element={<ProfileSetup />} />

      {/* Root redirect */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/feed' : '/auth/phone'} replace />}
      />

      {/* Protected app routes */}
      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <AppLayout>
              <FeedScreen />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/explore"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ExploreScreen />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/record"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RecordScreen />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rooms"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RoomsScreen />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rooms/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <RoomScreen />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/me"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProfileScreen />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:username"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProfileScreen />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/post/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PostDetailScreen />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <AppLayout>
              <NotificationsScreen />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SettingsScreen />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminScreen />
          </AdminRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
