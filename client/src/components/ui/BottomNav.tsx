
import { NavLink, useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../stores/notificationStore';


function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#7C5CFF' : 'none'}
      stroke={active ? '#7C5CFF' : '#8888AA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ExploreIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#7C5CFF' : '#8888AA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function RoomsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#7C5CFF' : '#8888AA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 013 3v6a3 3 0 01-6 0V5a3 3 0 013-3z" />
      <path d="M19 10a7 7 0 01-14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#7C5CFF' : 'none'}
      stroke={active ? '#7C5CFF' : '#8888AA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function BottomNav() {
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-echo-card/95 backdrop-blur-md border-t border-echo-elevated/60"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-mobile mx-auto flex items-center justify-around h-16 px-2">
        {/* Home */}
        <NavLink to="/feed" className="flex flex-col items-center gap-0.5 flex-1 py-2">
          {({ isActive }) => (
            <>
              <HomeIcon active={isActive} />
              <span className={`text-[10px] ${isActive ? 'text-echo-accent' : 'text-echo-secondary'}`}>Home</span>
            </>
          )}
        </NavLink>

        {/* Explore */}
        <NavLink to="/explore" className="flex flex-col items-center gap-0.5 flex-1 py-2">
          {({ isActive }) => (
            <>
              <ExploreIcon active={isActive} />
              <span className={`text-[10px] ${isActive ? 'text-echo-accent' : 'text-echo-secondary'}`}>Explore</span>
            </>
          )}
        </NavLink>

        {/* Record (center big button) */}
        <div className="flex flex-col items-center flex-1">
          <button
            onClick={() => navigate('/record')}
            className="w-14 h-14 rounded-full bg-accent-gradient flex items-center justify-center
              shadow-lg shadow-purple-500/40 active:scale-95 transition-transform duration-150 -mt-5"
            aria-label="Record"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
              <path d="M17 11a1 1 0 00-2 0 3 3 0 01-6 0 1 1 0 00-2 0 5 5 0 0010 0z" />
              <line x1="12" y1="19" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Rooms */}
        <NavLink to="/rooms" className="flex flex-col items-center gap-0.5 flex-1 py-2">
          {({ isActive }) => (
            <>
              <RoomsIcon active={isActive} />
              <span className={`text-[10px] ${isActive ? 'text-echo-accent' : 'text-echo-secondary'}`}>Rooms</span>
            </>
          )}
        </NavLink>

        {/* Profile */}
        <NavLink to="/profile/me" className="flex flex-col items-center gap-0.5 flex-1 py-2 relative">
          {({ isActive }) => (
            <>
              <ProfileIcon active={isActive} />
              <span className={`text-[10px] ${isActive ? 'text-echo-accent' : 'text-echo-secondary'}`}>Me</span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-4 min-w-[16px] h-4 bg-echo-accent-secondary
                  rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
