import {
  DEMO_USER, DEMO_POSTS, DEMO_TRENDING,
  DEMO_NOTIFICATIONS, DEMO_CHALLENGE, DEMO_ROOMS, DEMO_USERS,
} from './data';
import type { Post } from '../types';

export const DEMO_TOKEN = 'demo-mode-token';

// Simple in-memory state so interactions feel real within the session
const state = {
  posts: [...DEMO_POSTS],
  notifications: [...DEMO_NOTIFICATIONS],
  reactions: new Map<string, { type: string } | null>( // postId → reaction
    DEMO_POSTS.map(p => [p.id, p.userHasReacted ? { type: p.userHasReacted } : null])
  ),
  followed: new Set<string>(),
};

function delay(ms = 300): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function paginated<T>(items: T[], cursor?: string, limit = 20) {
  const start = cursor ? items.findIndex((_i, idx) => String(idx) === cursor) + 1 : 0;
  const slice = items.slice(start, start + limit);
  const nextCursor = start + limit < items.length ? String(start + limit) : undefined;
  return { items: slice, nextCursor, hasMore: !!nextCursor };
}

// Route table: method+path pattern → handler
type Handler = (params: Record<string, string>, body: unknown, query: Record<string, string>) => unknown;

const routes: Array<{ method: string; pattern: RegExp; keys: string[]; handler: Handler }> = [];

function route(method: string, path: string, handler: Handler) {
  const keys: string[] = [];
  const pattern = new RegExp(
    '^' + path.replace(/:([^/]+)/g, (_: string, k: string) => { keys.push(k); return '([^/]+)'; }) + '$'
  );
  routes.push({ method, pattern, keys, handler });
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
route('POST', '/auth/send-otp', async () => {
  await delay();
  return { expiresIn: 300, maskedPhone: '+** ****0000' };
});

route('POST', '/auth/verify-otp', async () => {
  await delay();
  return { token: DEMO_TOKEN, user: DEMO_USER };
});

// ── FEED ──────────────────────────────────────────────────────────────────────
route('GET', '/feed', async (_p, _b, q) => {
  await delay();
  return paginated(state.posts, q.cursor, 5);
});

route('GET', '/posts/trending', async () => {
  await delay();
  return { items: DEMO_TRENDING };
});

// ── POSTS ─────────────────────────────────────────────────────────────────────
route('GET', '/posts/:id', async (p) => {
  await delay(150);
  return state.posts.find(post => post.id === p.id) ?? state.posts[0];
});

route('POST', '/posts/:id/play', async () => { await delay(50); return {}; });

route('POST', '/posts/:id/reactions', async (p, body) => {
  await delay(100);
  const b = body as { type: string };
  const post = state.posts.find(post => post.id === p.id);
  if (post?.reactionCounts) {
    const prev = state.reactions.get(p.id);
    if (prev) post.reactionCounts[prev.type as keyof typeof post.reactionCounts]--;
    post.reactionCounts[b.type as keyof typeof post.reactionCounts]++;
    state.reactions.set(p.id, { type: b.type });
    post.userHasReacted = b.type as Post['userHasReacted'];
  }
  return post?.reactionCounts ?? {};
});

route('DELETE', '/posts/:id/reactions', async (p) => {
  await delay(100);
  const post = state.posts.find(post => post.id === p.id);
  const prev = state.reactions.get(p.id);
  if (post?.reactionCounts && prev) {
    post.reactionCounts[prev.type as keyof typeof post.reactionCounts]--;
    state.reactions.set(p.id, null);
    post.userHasReacted = null;
  }
  return post?.reactionCounts ?? {};
});

route('GET', '/posts/:id/comments', async () => {
  await delay();
  return { items: [], nextCursor: undefined, hasMore: false };
});

route('POST', '/posts', async (_p, body) => {
  await delay(500);
  const b = body as Partial<Post>;
  const newPost: Post = {
    id: `demo-${Date.now()}`, author: DEMO_USER,
    audioUrl: '', audioDuration: b.audioDuration ?? 10,
    waveformPeaks: b.waveformPeaks ?? [],
    moodTag: b.moodTag ?? 'CALM',
    isAnonymous: b.isAnonymous ?? false, isGhostRevealed: false,
    playCount: 0, echoCount: 0, replyCount: 0,
    reactionCounts: { FIRE: 0, HEART: 0, LAUGH: 0, WOW: 0, SAD: 0 },
    userHasReacted: null,
    createdAt: new Date().toISOString(),
  };
  state.posts.unshift(newPost);
  return newPost;
});

// ── USERS ─────────────────────────────────────────────────────────────────────
route('GET', '/users/me', async () => {
  await delay(150);
  return DEMO_USER;
});

route('PATCH', '/users/me', async (_p, body) => {
  await delay(300);
  return { ...DEMO_USER, ...(body as object) };
});

route('GET', '/users/me/notifications', async (_p, _b, q) => {
  await delay();
  return paginated(state.notifications, q.cursor, 20);
});

route('POST', '/users/me/notifications/read-all', async () => {
  await delay(100);
  state.notifications.forEach(n => { n.isRead = true; });
  return {};
});

route('GET', '/users/:username', async (p) => {
  await delay(200);
  const found = DEMO_USERS.find(u => u.username === p.username);
  const user = found ?? DEMO_USER;
  return { ...user, recentPosts: state.posts.filter(post => post.author?.id === user.id).slice(0, 6) };
});

route('POST', '/users/:username/follow', async (p) => {
  await delay(200);
  state.followed.add(p.username);
  return { following: true };
});

route('DELETE', '/users/:username/follow', async (p) => {
  await delay(200);
  state.followed.delete(p.username);
  return { following: false };
});

route('GET', '/users/:username/followers', async () => {
  await delay();
  return paginated(DEMO_USERS, undefined, 10);
});

route('GET', '/users/:username/following', async () => {
  await delay();
  return paginated(DEMO_USERS.slice(0, 3), undefined, 10);
});

// ── SEARCH ────────────────────────────────────────────────────────────────────
route('GET', '/search', async (_p, _b, q) => {
  await delay(200);
  const term = (q.q ?? '').toLowerCase();
  if (!term) return { users: [], posts: [] };
  return {
    users: DEMO_USERS.filter(u =>
      u.username.includes(term) || u.displayName.toLowerCase().includes(term)
    ),
    posts: state.posts.filter(p =>
      p.transcription?.toLowerCase().includes(term)
    ),
  };
});

// ── CHALLENGES ────────────────────────────────────────────────────────────────
route('GET', '/challenges/active', async () => {
  await delay(200);
  return DEMO_CHALLENGE;
});

route('GET', '/challenges/:id/entries', async (_p, _b, q) => {
  await delay();
  return paginated(DEMO_CHALLENGE.topEntries ?? [], q.cursor, 10);
});

// ── ROOMS ─────────────────────────────────────────────────────────────────────
route('GET', '/rooms/live', async () => {
  await delay();
  return { items: DEMO_ROOMS };
});

route('GET', '/rooms/:id', async (p) => {
  await delay(150);
  return DEMO_ROOMS.find(r => r.id === p.id) ?? DEMO_ROOMS[0];
});

route('POST', '/rooms', async (_p, body) => {
  await delay(400);
  const b = body as { title: string };
  return { id: `demo-room-${Date.now()}`, host: DEMO_USER, title: b.title, isLive: true, listenerCount: 1, speakers: [], speakerQueue: [], listeners: [DEMO_USER], createdAt: new Date().toISOString() };
});

route('POST', '/rooms/:id/join', async () => { await delay(200); return {}; });
route('POST', '/rooms/:id/raise-hand', async () => { await delay(200); return {}; });
route('POST', '/rooms/:id/end', async () => { await delay(200); return {}; });

// ── AUDIO ─────────────────────────────────────────────────────────────────────
route('POST', '/audio/upload-audio', async () => {
  await delay(800);
  const fakePeaks = Array.from({ length: 100 }, (_, i) =>
    Math.abs(Math.sin(i * 0.3) * 0.6 + Math.random() * 0.3)
  );
  return {
    audioKey: `demo/audio/${Date.now()}.m4a`,
    audioDuration: 8 + Math.random() * 15,
    waveformPeaks: fakePeaks,
    presignedUrl: '',
  };
});

// ── REPORTS ───────────────────────────────────────────────────────────────────
route('POST', '/reports', async () => { await delay(300); return { id: `demo-report-${Date.now()}` }; });

// ── DISPATCHER ───────────────────────────────────────────────────────────────

export async function dispatchMock(
  method: string,
  path: string,
  body: unknown,
  query: Record<string, string>
): Promise<{ data: unknown; status: number }> {
  // Strip /api prefix if present
  const cleanPath = path.replace(/^\/api/, '');

  for (const r of routes) {
    if (r.method !== method.toUpperCase()) continue;
    const match = cleanPath.match(r.pattern);
    if (!match) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, match[i + 1]]));
    const data = await (r.handler as (p: Record<string, string>, b: unknown, q: Record<string, string>) => Promise<unknown>)(params, body, query);
    return { data, status: 200 };
  }

  console.warn('[Demo] Unhandled route:', method, cleanPath);
  return { data: {}, status: 200 };
}
