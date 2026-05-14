import type { Server } from 'socket.io';

/**
 * Global socket.io server reference.
 * Avoids circular imports between routes/services and src/index.ts.
 * Must be set during server startup before routes are used.
 */
let _io: Server | null = null;

export function setIo(io: Server): void {
  _io = io;
}

export function getIo(): Server {
  if (!_io) {
    throw new Error('Socket.io server not initialized. Call setIo() first.');
  }
  return _io;
}
