import type { User, Post, Comment, Notification, Room, Challenge } from '../types';

// Deterministic fake waveform — varies by seed so each post looks different
function peaks(seed: number, count = 100): number[] {
  return Array.from({ length: count }, (_, i) => {
    const t = i / count;
    return Math.abs(
      0.3 * Math.sin(seed * 3.14 + t * 20) +
      0.2 * Math.sin(seed * 1.7 + t * 35) +
      0.15 * Math.sin(seed * 5.1 + t * 12) +
      0.1
    );
  });
}

function fingerprint(seed: number): number[] {
  return Array.from({ length: 32 }, (_, i) =>
    Math.abs(Math.sin(seed * 2.718 + i * 0.7)) * 0.8 + 0.1
  );
}

export const DEMO_USER: User = {
  id: 'demo-user',
  username: 'you',
  displayName: 'You (Demo)',
  avatarColor: '#7C5CFF',
  voiceFingerprint: fingerprint(42),
  isVerified: true,
  streakCount: 7,
  followerCount: 128,
  followingCount: 64,
  postCount: 12,
  createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
};

const USERS: User[] = [
  {
    id: 'u1', username: 'maya_speaks', displayName: 'Maya Chen',
    avatarColor: '#FF5C8A', voiceFingerprint: fingerprint(1),
    isVerified: true, streakCount: 30, followerCount: 4821,
    followingCount: 203, postCount: 89, createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
  },
  {
    id: 'u2', username: 'james_audio', displayName: 'James Wright',
    avatarColor: '#4FC3F7', voiceFingerprint: fingerprint(2),
    isVerified: true, streakCount: 14, followerCount: 923,
    followingCount: 411, postCount: 34, createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'u3', username: 'sana_v', displayName: 'Sana Verma',
    avatarColor: '#69F0AE', voiceFingerprint: fingerprint(3),
    isVerified: false, streakCount: 5, followerCount: 312,
    followingCount: 198, postCount: 21, createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: 'u4', username: 'echo_dev', displayName: 'Echo Dev',
    avatarColor: '#FFD93D', voiceFingerprint: fingerprint(4),
    isVerified: true, streakCount: 100, followerCount: 18200,
    followingCount: 91, postCount: 412, createdAt: new Date(Date.now() - 365 * 86400000).toISOString(),
  },
  {
    id: 'u5', username: 'kai_soundz', displayName: 'Kai Soundz',
    avatarColor: '#FF8C42', voiceFingerprint: fingerprint(5),
    isVerified: false, streakCount: 3, followerCount: 74,
    followingCount: 55, postCount: 8, createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

const makeComment = (id: string, user: User, seed: number): Comment => ({
  id,
  author: user,
  audioUrl: '',
  audioDuration: 4 + seed * 2,
  waveformPeaks: peaks(seed + 10, 100),
  isAnonymous: false,
  createdAt: new Date(Date.now() - seed * 3600000).toISOString(),
});

export const DEMO_POSTS: Post[] = [
  {
    id: 'p1', author: USERS[0],
    audioUrl: '', audioDuration: 18.4,
    waveformPeaks: peaks(1), moodTag: 'EXCITED',
    isAnonymous: false, isGhostRevealed: false,
    playCount: 3241, echoCount: 87, replyCount: 34,
    reactionCounts: { FIRE: 412, HEART: 198, LAUGH: 23, WOW: 56, SAD: 4 },
    userHasReacted: null,
    transcription: "I just discovered the most amazing coffee shop that plays jazz at 7am and honestly it changed my whole morning routine completely.",
    topReply: makeComment('c1', USERS[1], 2),
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'p2', author: USERS[3],
    audioUrl: '', audioDuration: 22.1,
    waveformPeaks: peaks(2), moodTag: 'SERIOUS',
    isAnonymous: false, isGhostRevealed: false,
    playCount: 12800, echoCount: 341, replyCount: 210,
    reactionCounts: { FIRE: 2100, HEART: 890, LAUGH: 45, WOW: 678, SAD: 12 },
    userHasReacted: 'FIRE',
    transcription: "Hot take: voice notes are the most authentic form of social media because you can't edit your tone. What you feel is what people hear.",
    topReply: makeComment('c2', USERS[2], 1),
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'p3', author: null,
    audioUrl: '', audioDuration: 14.7,
    waveformPeaks: peaks(3), moodTag: 'VULNERABLE',
    isAnonymous: true, isGhostRevealed: false,
    playCount: 891, echoCount: 12, replyCount: 56,
    reactionCounts: { FIRE: 34, HEART: 445, LAUGH: 2, WOW: 18, SAD: 201 },
    userHasReacted: 'HEART',
    transcription: "Sometimes I record voice notes to myself at 2am just to feel heard. Does anyone else do that?",
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: 'p4', author: USERS[1],
    audioUrl: '', audioDuration: 27.3,
    waveformPeaks: peaks(4), moodTag: 'FUNNY',
    isAnonymous: false, isGhostRevealed: false,
    playCount: 5612, echoCount: 203, replyCount: 98,
    reactionCounts: { FIRE: 234, HEART: 123, LAUGH: 1892, WOW: 67, SAD: 3 },
    userHasReacted: 'LAUGH',
    transcription: "My dog literally howled along when I was recording a voice post and now I have to include him as a co-author.",
    topReply: makeComment('c3', USERS[4], 3),
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 'p5', author: USERS[2],
    audioUrl: '', audioDuration: 11.9,
    waveformPeaks: peaks(5), moodTag: 'CURIOUS',
    isAnonymous: false, isGhostRevealed: false,
    playCount: 2109, echoCount: 44, replyCount: 31,
    reactionCounts: { FIRE: 89, HEART: 312, LAUGH: 56, WOW: 445, SAD: 8 },
    userHasReacted: null,
    transcription: "Question for everyone: if you could only listen to one genre of music for the rest of your life, what would it be and why?",
    createdAt: new Date(Date.now() - 18 * 3600000).toISOString(),
  },
  {
    id: 'p6', author: USERS[4],
    audioUrl: '', audioDuration: 9.2,
    waveformPeaks: peaks(6), moodTag: 'CALM',
    isAnonymous: false, isGhostRevealed: false,
    playCount: 445, echoCount: 7, replyCount: 12,
    reactionCounts: { FIRE: 23, HEART: 156, LAUGH: 11, WOW: 34, SAD: 5 },
    userHasReacted: null,
    transcription: "Just watched the sunrise from my rooftop. Some things don't need words but I wanted to share the silence with you.",
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

export const DEMO_TRENDING: Post[] = [DEMO_POSTS[1], DEMO_POSTS[3], DEMO_POSTS[0], DEMO_POSTS[4]];

export const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1', type: 'NEW_ECHO', isRead: false,
    actor: USERS[0], post: DEMO_POSTS[0],
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'n2', type: 'NEW_FOLLOWER', isRead: false,
    actor: USERS[3],
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'n3', type: 'NEW_REPLY', isRead: false,
    actor: USERS[1], post: DEMO_POSTS[1],
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'n4', type: 'STREAK_REMINDER', isRead: true,
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: 'n5', type: 'NEW_FOLLOWER', isRead: true,
    actor: USERS[2],
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

export const DEMO_CHALLENGE: Challenge = {
  id: 'ch1',
  title: '30-Second Story',
  promptAudioUrl: '',
  promptWaveformPeaks: peaks(99, 100),
  startsAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  endsAt: new Date(Date.now() + 4 * 86400000).toISOString(),
  entryCount: 1284,
  topEntries: [DEMO_POSTS[1], DEMO_POSTS[3], DEMO_POSTS[0]],
};

export const DEMO_ROOMS: Room[] = [
  {
    id: 'r1', title: 'Morning Musings ☀️',
    host: USERS[3], isLive: true, listenerCount: 89,
    speakers: [USERS[0], USERS[1]], speakerQueue: [],
    listeners: [USERS[2], USERS[4], DEMO_USER],
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 'r2', title: 'Tech Talk: AI & Creativity',
    host: USERS[1], isLive: true, listenerCount: 34,
    speakers: [USERS[3]], speakerQueue: [USERS[2].id],
    listeners: [USERS[4]],
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
  },
  {
    id: 'r3', title: 'Late Night Vibes 🌙',
    host: USERS[2], isLive: true, listenerCount: 12,
    speakers: [], speakerQueue: [],
    listeners: [USERS[0], USERS[4]],
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
  },
];

export const DEMO_USERS = USERS;
