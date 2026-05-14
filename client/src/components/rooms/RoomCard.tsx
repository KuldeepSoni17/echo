import { Avatar } from '../ui/Avatar';
import type { Room } from '../../types';

interface RoomCardProps {
  room: Room;
  onClick?: () => void;
}

export function RoomCard({ room, onClick }: RoomCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 bg-echo-card rounded-2xl p-4
        hover:bg-echo-elevated active:scale-98 transition-all border border-echo-elevated/60"
    >
      {/* Live indicator */}
      <div className="flex-shrink-0 relative">
        <div className="w-12 h-12 rounded-2xl bg-accent-gradient flex items-center justify-center">
          <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
            <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
            <path d="M17 11a1 1 0 00-2 0 3 3 0 01-6 0 1 1 0 00-2 0 5 5 0 0010 0z" />
          </svg>
        </div>
        {room.isLive && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-echo-success rounded-full border-2 border-echo-bg animate-pulse" />
        )}
      </div>

      {/* Room info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <p className="text-echo-primary font-semibold text-sm truncate">{room.title}</p>
          {room.isLive && (
            <span className="flex-shrink-0 text-[10px] font-bold text-echo-success bg-echo-success/10 px-1.5 py-0.5 rounded-full">
              LIVE
            </span>
          )}
        </div>
        <p className="text-echo-secondary text-xs mt-0.5">
          {room.host.displayName} · {room.listenerCount} listening
        </p>

        {/* Speaker avatars */}
        {room.speakers && room.speakers.length > 0 && (
          <div className="flex items-center mt-2 -space-x-2">
            {room.speakers.slice(0, 3).map((speaker) => (
              <Avatar key={speaker.id} user={speaker} size={22} className="ring-2 ring-echo-bg" />
            ))}
            {room.speakers.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-echo-elevated ring-2 ring-echo-bg
                flex items-center justify-center text-[9px] text-echo-secondary">
                +{room.speakers.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Listener count */}
      <div className="flex-shrink-0 flex items-center gap-1 text-echo-muted">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
        <span className="text-xs">{room.listenerCount}</span>
      </div>
    </button>
  );
}
