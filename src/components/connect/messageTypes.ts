export interface MessageUser {
  id: string;
  name: string;
  username?: string;
  avatar: string | null;
  role: string;
  avatarGlowEnabled?: boolean;
  avatarGlowColors?: string | null;
}

export interface Attachment {
  url: string;
  name: string;
  size: number;
  type: string;
  isImage: boolean;
  isVoice?: boolean;
  duration?: number;
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: { id: string; name: string };
}

export interface ReplyTo {
  id: string;
  content: string;
  user: { id: string; name: string };
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  edited?: boolean;
  editedAt?: string | null;
  deleted?: boolean;
  pinned?: boolean;
  attachments?: string | null;
  reactions?: Reaction[];
  replyTo?: ReplyTo | null;
  reads?: { userId: string }[];
  threadId?: string | null;
  threadCount?: number;
  _count?: { threadReplies: number };
  user: MessageUser;
}

export interface ForwardTarget {
  type: "channel" | "dm";
  id: string;
  name: string;
  icon?: string | null;
}
