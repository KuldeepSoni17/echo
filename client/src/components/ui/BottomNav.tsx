import { NavLink, useNavigate } from 'react-router-dom';

const NAV = [
  {
    to: '/feed', label: 'Home',
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? '#7C5CFF' : 'none'}
        stroke={a ? '#7C5CFF' : '#55556A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: '/explore', label: 'Explore',
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={a ? '#7C5CFF' : '#55556A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  null, // record button placeholder
  {
    to: '/rooms', label: 'Rooms',
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={a ? '#7C5CFF' : '#55556A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    to: '/profile/me', label: 'Me',
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? '#7C5CFF' : 'none'}
        stroke={a ? '#7C5CFF' : '#55556A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav
      className="flex-shrink-0 glass border-t border-white/[0.05] z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-[480px] mx-auto">
        {NAV.map((item) => {
          if (!item) {
            // Centre record button
            return (
              <div key="record" className="flex flex-col items-center flex-1">
                <button
                  onClick={() => navigate('/record')}
                  className="w-[52px] h-[52px] rounded-full flex items-center justify-center
                    glow-accent active:scale-90 transition-all duration-150 -mt-4"
                  style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #FF5C8A 100%)' }}
                  aria-label="Record"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M12 1a4 4 0 00-4 4v7a4 4 0 008 0V5a4 4 0 00-4-4z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" strokeWidth="2" stroke="white" fill="none"
                      strokeLinecap="round" />
                    <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          }

          return (
            <NavLink key={item.to} to={item.to} className="flex flex-col items-center gap-1 flex-1 py-2 relative group">
              {({ isActive }) => (
                <>
                  {item.icon(isActive)}
                  <span className={`text-[10px] font-medium transition-colors
                    ${isActive ? 'text-echo-accent' : 'text-echo-muted group-hover:text-echo-secondary'}`}>
                    {item.label}
                  </span>
                  {/* Active dot */}
                  {isActive && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1
                      rounded-full bg-echo-accent" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
