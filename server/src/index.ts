import 'express-async-errors';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { logger } from './utils/logger';
import { setIo } from './utils/socketRef';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { postRoutes } from './routes/posts';
import { userRoutes } from './routes/users';
import { audioRoutes } from './routes/audio';
import { roomRoutes } from './routes/rooms';
import { challengeRoutes } from './routes/challenges';
import { reportRoutes } from './routes/reports';
import { adminRoutes } from './routes/admin';
import { setupSocketHandlers } from './socket/handlers';
import { generalRateLimit } from './middleware/rateLimit';
import { startStreakReminderScheduler } from './jobs/streakReminder';
import { startChallengeRotationScheduler } from './jobs/challengeRotation';

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Register io globally so services/routes can access it without circular imports
setIo(io);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(generalRateLimit);

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use(errorHandler);

setupSocketHandlers(io);

// Start background jobs
startStreakReminderScheduler();
startChallengeRotationScheduler();

const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'Echo server listening');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  httpServer.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down');
  httpServer.close(() => process.exit(0));
});

export default app;
