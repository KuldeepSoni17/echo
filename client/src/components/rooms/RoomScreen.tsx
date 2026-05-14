import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useSocket } from '../../hooks/useSocket';
import api from '../../api/client';
import type { Room } from '../../types';

export function RoomScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const socket = useSocket();
  const [hasRaisedHand, setHasRaisedHand] = useState(false);

  const { data: room, isLoading } = useQuery<Room>({
    queryKey: ['room', id],
    queryFn: () => api.get<Room>(`/rooms/${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 10_000,
  });

  // Join room on mount, leave on unmount
  useEffect(() => {
    if (!id) return;
    api.post(`/rooms/${id}/join`).catch(() => {});
    return () => {
      api.post(`/rooms/${id}/leave`).catch(() => {});
    };
  }, [id]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('join_room', id);

    socket.on('room_updated', (updatedRoom: Room) => {
      queryClient.setQueryData(['room', id], updatedRoom);
    });

    socket.on('room_ended', () => {
      navigate('/rooms');
    });

    return () => {
      socket.emit('leave_room', id);
      socket.off('room_updated');
      socket.off('room_ended');
    };
  }, [socket, id, navigate, queryClient]);

  const raiseHandMutation = useMutation({
    mutationFn: () =>
      hasRaisedHand
        ? api.post(`/rooms/${id}/lower-hand`)
        : api.post(`/rooms/${id}/raise-hand`),
    onSuccess: () => setHasRaisedHand(!hasRaisedHand),
  });

  const endRoomMutation = useMutation({
    mutationFn: () => api.post(`/rooms/${id}/end`),
    onSuccess: () => navigate('/rooms'),
  });

  const grantSpeakerMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/rooms/${id}/grant-speaker`, { userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', id] }),
  });

  const revokeSpeakerMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/rooms/${id}/revoke-speaker`, { userId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room', id] }),
  });

  const isHost = room?.host.id === currentUser?.id;
  const isSpeaker = room?.speakers.some((s) => s.id === currentUser?.id);

  if (isLoading || !room) {
    return (
      <div className="flex-1 flex items-center justify-center bg-echo-bg">
        <svg className="animate-spin w-8 h-8 text-echo-accent" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-echo-bg overflow-y-auto pb-28">
      {/* Header */}
      <div className="px-4 py-4 pt-safe border-b border-echo-elevated/40 flex items-center gap-3">
        <button onClick={() => navigate('/rooms')} className="text-echo-secondary p-1">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-echo-primary font-bold text-base line-clamp-1">{room.title}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-echo-success animate-pulse" />
            <span className="text-echo-success text-xs font-medium">LIVE</span>
            <span className="text-echo-muted text-xs">· {room.listenerCount} listening</span>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-8 mt-6">
        {/* Host */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar user={room.host} size={80} animated isPlaying />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-echo-accent text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
              HOST
            </span>
          </div>
          <div className="text-center">
            <p className="text-echo-primary font-semibold">{room.host.displayName}</p>
            <p className="text-echo-secondary text-xs">@{room.host.username}</p>
          </div>
        </div>

        {/* Speakers */}
        {room.speakers.length > 0 && (
          <div>
            <p className="text-echo-secondary text-xs font-semibold uppercase tracking-wider mb-3">
              Speakers ({room.speakers.length})
            </p>
            <div className="grid grid-cols-3 gap-4">
              {room.speakers.map((speaker) => (
                <div key={speaker.id} className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <Avatar user={speaker} size={56} animated isPlaying />
                    {isHost && (
                      <button
                        onClick={() => revokeSpeakerMutation.mutate(speaker.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-echo-danger rounded-full
                          flex items-center justify-center text-white text-[10px]"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <p className="text-echo-primary text-xs truncate max-w-[72px] text-center">
                    {speaker.displayName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Speaker queue (host only) */}
        {isHost && room.speakerQueue.length > 0 && (
          <div>
            <p className="text-echo-secondary text-xs font-semibold uppercase tracking-wider mb-3">
              Hand raised ({room.speakerQueue.length})
            </p>
            <div className="space-y-2">
              {room.speakerQueue.map((userId) => {
                const listener = room.listeners.find((l) => l.id === userId);
                return (
                  <div key={userId} className="flex items-center gap-3 bg-echo-elevated rounded-xl p-3">
                    <Avatar user={listener} size={36} />
                    <span className="flex-1 text-echo-primary text-sm">
                      {listener?.displayName ?? 'Unknown'}
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => grantSpeakerMutation.mutate(userId)}
                    >
                      Add
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Listeners */}
        {room.listeners.length > 0 && (
          <div>
            <p className="text-echo-secondary text-xs font-semibold uppercase tracking-wider mb-3">
              Listeners ({room.listeners.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {room.listeners.map((listener) => (
                <div key={listener.id} className="flex flex-col items-center gap-1">
                  <Avatar user={listener} size={36} />
                  <p className="text-echo-muted text-[9px] max-w-[40px] truncate text-center">
                    {listener.username}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-echo-card/95 backdrop-blur-md border-t border-echo-elevated px-4 py-4 pb-safe z-30">
        <div className="max-w-mobile mx-auto flex items-center gap-3">
          {isHost ? (
            <>
              <Button
                variant="danger"
                fullWidth
                loading={endRoomMutation.isPending}
                onClick={() => endRoomMutation.mutate()}
              >
                End Room
              </Button>
            </>
          ) : isSpeaker ? (
            <div className="flex items-center gap-2 flex-1">
              <span className="w-3 h-3 rounded-full bg-echo-success animate-pulse" />
              <span className="text-echo-success text-sm font-medium">You're speaking</span>
            </div>
          ) : (
            <Button
              variant={hasRaisedHand ? 'secondary' : 'primary'}
              fullWidth
              loading={raiseHandMutation.isPending}
              onClick={() => raiseHandMutation.mutate()}
            >
              {hasRaisedHand ? '✋ Lower Hand' : '✋ Raise Hand'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
