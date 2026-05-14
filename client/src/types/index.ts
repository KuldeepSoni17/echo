export interface User {
  id: string;
  phoneNumber?: string;
  username: string;
  displayName: string;
  avatarColor: string;
  voiceFingerprint?: number[];
  isVerified: boolean;
  isAdmin?: boolean;
  isBanned?: boolean;
  streakCount: number;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  isFollowing?: boolean;
  isBlocked?: boolean;
  createdAt: string;
}

export interface Post {
  id: string;
  author?: User | null; // null if anonymous and not revealed
  audioUrl: string;
  audioDuration: number;
  waveformPeaks: number[];
  presignedAudioUrl?: string;
  transcription?: string;
  moodTag: MoodTag;
  isAnonymous: boolean;
  isGhostRevealed: boolean;
  parentEchoId?: string;
  challengeId?: string;
  playCount: number;
  echoCount: number;
  replyCount: number;
  reactionCounts?: ReactionCounts;
  userHasReacted?: ReactionType | null;
  topReply?: Comment;
  createdAt: string;
}

export type MoodTag = 'CALM' | 'EXCITED' | 'FUNNY' | 'VULNERABLE' | 'SERIOUS' | 'CURIOUS';
export type ReactionType = 'FIRE' | 'HEART' | 'LAUGH' | 'WOW' | 'SAD';

export interface ReactionCounts {
  FIRE: number;
  HEART: number;
  LAUGH: number;
  WOW: number;
  SAD: number;
}

export interface Comment {
  id: string;
  author?: User | null;
  audioUrl: string;
  audioDuration: number;
  waveformPeaks: number[];
  presignedAudioUrl?: string;
  isAnonymous: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  actor?: User;
  post?: Post;
  isRead: boolean;
  createdAt: string;
}

export type NotificationType =
  | 'NEW_ECHO'
  | 'NEW_REPLY'
  | 'NEW_FOLLOWER'
  | 'CHALLENGE_LIVE'
  | 'GHOST_REVEAL'
  | 'STREAK_REMINDER'
  | 'ROOM_STARTED';

export interface Room {
  id: string;
  host: User;
  title: string;
  isLive: boolean;
  listenerCount: number;
  speakers: User[];
  speakerQueue: string[];
  listeners: User[];
  createdAt: string;
}

export interface Challenge {
  id: string;
  title: string;
  promptAudioUrl: string;
  promptWaveformPeaks?: number[];
  startsAt: string;
  endsAt: string;
  entryCount: number;
  topEntries?: Post[];
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface Report {
  id: string;
  reporter: User;
  targetType: 'POST' | 'COMMENT' | 'USER';
  targetId: string;
  reason: ReportReason;
  description?: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  post?: Post;
  targetUser?: User;
  createdAt: string;
}

export type ReportReason =
  | 'HATE_SPEECH'
  | 'HARASSMENT'
  | 'SPAM'
  | 'MISINFORMATION'
  | 'EXPLICIT_CONTENT'
  | 'VIOLENCE'
  | 'OTHER';

export interface AudioUploadResponse {
  audioUrl: string;
  waveformPeaks: number[];
  duration: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  audioUrl: string;
}
