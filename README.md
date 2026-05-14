# Echo — Voice-Only Social Media

Echo is a mobile-first voice social media platform where all content (posts, comments, reactions) is exclusively audio. Think Twitter meets Clubhouse — but everything is a voice note.

## Features

- **Voice Posts** — Record up to 30 seconds of audio with mood tags
- **Echo Chain** — Overlay your voice on someone else's post (like a duet)
- **Voice Comments** — Audio-only comment threads
- **Anonymous Posts** — Post anonymously, optionally reveal identity later (Ghost Reveal)
- **Live Rooms** — Real-time audio rooms (Clubhouse-style)
- **Challenges** — Weekly voice prompt challenges with leaderboards
- **Voice Fingerprint** — Unique animated SVG avatar generated from your vocal profile
- **Streaks** — Daily posting streaks with milestone badges
- **Moderation** — Report system with admin dashboard and AI moderation queue

## Tech Stack

**Frontend:** React + Vite, TypeScript, Tailwind CSS, Zustand, TanStack Query, Wavesurfer.js, Framer Motion

**Backend:** Node.js + Express, TypeScript, PostgreSQL (Prisma ORM), Redis, Socket.io, AWS S3, Twilio, ffmpeg

## Local Development Setup

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- ffmpeg installed locally (`brew install ffmpeg` on Mac)

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL on port 5432 and Redis on port 6379.

### 2. Set up the server

```bash
cd server
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section)

npm install
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Run migrations
npm run db:seed       # Seed sample data (optional)
npm run dev           # Start dev server on port 3001
```

### 3. Set up the client

```bash
cd client
npm install
npm run dev           # Start Vite dev server on port 5173
```

Open http://localhost:5173 in your browser.

## Environment Variables

Copy `server/.env.example` to `server/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | 256-bit secret for JWT signing |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `AWS_ACCESS_KEY_ID` | AWS credentials for S3 |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for S3 |
| `AWS_REGION` | S3 bucket region (e.g. `us-east-1`) |
| `AWS_S3_BUCKET` | S3 bucket name for audio files |
| `TWILIO_ACCOUNT_SID` | Twilio account SID for SMS |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number (E.164 format) |
| `ADMIN_PHONE_NUMBERS` | Comma-separated admin phone numbers |
| `CLIENT_URL` | Frontend URL for CORS (e.g. `http://localhost:5173`) |
| `PORT` | Server port (default: 3001) |
| `NODE_ENV` | `development` or `production` |

### Development Mode Stubs

When `NODE_ENV=development`:
- **Twilio SMS**: OTP codes are printed to console instead of sent via SMS
- **AI Moderation**: Always returns `{ flagged: false }` (no API calls)
- **Transcription**: Saved as a placeholder string

## Project Structure

```
echo/
├── docker-compose.yml          # Local Postgres + Redis
├── client/                     # React Vite frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── ui/             # Reusable UI (Button, WaveformPlayer, etc.)
│   │   │   ├── auth/           # Auth flow screens
│   │   │   ├── feed/           # Feed cards + recorder
│   │   │   ├── profile/        # User profiles
│   │   │   ├── explore/        # Discover + challenges
│   │   │   ├── rooms/          # Live audio rooms
│   │   │   └── moderation/     # Report modal
│   │   ├── hooks/              # Custom React hooks
│   │   ├── stores/             # Zustand stores
│   │   ├── api/                # Typed API client
│   │   ├── utils/              # Helpers
│   │   ├── types/              # TypeScript interfaces
│   │   └── pages/              # Page-level components
└── server/                     # Express backend
    ├── prisma/
    │   ├── schema.prisma        # Database schema
    │   └── seed.ts             # Seed data
    └── src/
        ├── routes/             # API route handlers
        ├── middleware/         # Auth, rate limiting, validation
        ├── services/           # Business logic (OTP, S3, audio, etc.)
        ├── socket/             # Socket.io event handlers
        ├── jobs/               # Background jobs (streak, challenges)
        └── utils/              # Logger, errors, pagination, JWT
```

## API Overview

All API responses follow: `{ success: boolean, data?: T, error?: string, meta?: object }`

All pagination is cursor-based (never offset).

### Auth
- `POST /api/auth/send-otp` — Send OTP to phone number
- `POST /api/auth/verify-otp` — Verify OTP, get JWT
- `POST /api/auth/complete-profile` — Set username after signup

### Posts
- `GET /api/feed` — Home feed (cursor paginated)
- `POST /api/posts` — Create a voice post
- `GET /api/posts/trending` — Trending posts (cached 5min)
- `GET /api/posts/:id` — Single post
- `POST /api/posts/:id/echo` — Echo (overlay your voice)
- `POST /api/posts/:id/comments` — Voice comment
- `POST /api/posts/:id/reactions` — React (FIRE/HEART/LAUGH/WOW/SAD)
- `POST /api/posts/:id/reveal` — Ghost reveal (anonymous → public)

### Users
- `GET /api/users/:username` — Public profile
- `POST /api/users/:username/follow` — Follow user
- `GET /api/users/me/notifications` — Notifications

### Audio
- `POST /api/audio/upload-audio` — Upload and process audio file
- `GET /api/audio/:key/url` — Get fresh presigned S3 URL

### Rooms
- `POST /api/rooms` — Create live room
- `GET /api/rooms/live` — Active rooms list

## Design System

Dark-mode first. Brand color: `#7C5CFF` (purple).

Key colors:
- Background: `#0A0A0F`
- Card: `#111118`
- Accent: `#7C5CFF`
- Reactions: `#FF5C8A`

Mood tag colors: CALM=blue, EXCITED=orange, FUNNY=yellow, VULNERABLE=pink, SERIOUS=grey, CURIOUS=green

## Deployment

1. Provision PostgreSQL and Redis (AWS RDS + ElastiCache recommended)
2. Create S3 bucket with appropriate CORS policy for audio uploads
3. Set all environment variables
4. Run `npm run build` in both client/ and server/
5. Deploy server with `npm start` (Node.js)
6. Deploy client's `dist/` to CDN (Vercel, Cloudflare Pages, S3+CloudFront)

## Contributing

Echo is built mobile-first. Test on mobile viewport (375px width) at all times. All audio features require HTTPS in production (microphone permissions).
