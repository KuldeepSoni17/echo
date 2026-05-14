import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { RoomCard } from './RoomCard';
import { Button } from '../ui/Button';
import { ListSkeleton } from '../ui/LoadingSkeleton';
import api from '../../api/client';
import type { Room } from '../../types';

export function RoomsScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roomTitle, setRoomTitle] = useState('');

  const { data: rooms, isLoading } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: () => api.get<Room[]>('/rooms').then((r) => r.data),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      api.post<Room>('/rooms', { title }).then((r) => r.data),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      navigate(`/rooms/${room.id}`);
    },
  });

  const handleCreate = () => {
    if (!roomTitle.trim()) return;
    createMutation.mutate(roomTitle.trim());
  };

  return (
    <div className="flex flex-col h-full bg-echo-bg overflow-y-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-echo-bg/95 backdrop-blur-md z-10 px-4 py-4 pt-safe border-b border-echo-elevated/40">
        <div className="flex items-center justify-between">
          <h1 className="text-echo-primary font-bold text-xl">Live Rooms</h1>
          <Button size="sm" variant="primary" onClick={() => setShowCreateForm(!showCreateForm)}>
            + Create
          </Button>
        </div>

        {/* Create room form */}
        {showCreateForm && (
          <div className="mt-4 flex gap-2 animate-slide-up">
            <input
              type="text"
              placeholder="Room topic..."
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              maxLength={80}
              className="flex-1 bg-echo-elevated border border-echo-muted/30 text-echo-primary
                placeholder:text-echo-muted rounded-xl px-4 py-2.5 text-sm focus:outline-none
                focus:border-echo-accent"
              autoFocus
            />
            <Button
              size="sm"
              variant="primary"
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={!roomTitle.trim()}
            >
              Go Live
            </Button>
          </div>
        )}
      </div>

      {/* Rooms list */}
      <div className="flex-1 px-4 mt-4">
        {isLoading ? (
          <ListSkeleton count={4} />
        ) : !rooms || rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-5xl mb-4">🎙️</span>
            <p className="text-echo-primary font-semibold mb-2">No live rooms right now</p>
            <p className="text-echo-secondary text-sm mb-6">
              Be the first to start a conversation
            </p>
            <Button variant="primary" onClick={() => setShowCreateForm(true)}>
              Create a Room
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onClick={() => navigate(`/rooms/${room.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
