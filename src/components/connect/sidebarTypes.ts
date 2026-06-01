export interface Channel {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  groupId: string;
  serviceId?: string | null;
  parentId?: string | null;
  postAccess?: string;
  _count: { members: number; messages: number };
}

export interface VoiceUser {
  socketId: string;
  userId: string;
  userName: string;
  muted: boolean;
}

export interface GroupDetail {
  id: string;
  name: string;
  icon: string | null;
  description: string;
  myRole: string;
  channels: Channel[];
  members: { user: { id: string; name: string; username: string; avatar: string | null; role: string }; role: string }[];
}

export interface VoiceState {
  isConnected: boolean;
  voiceStatus: "idle" | "connecting" | "connected" | "reconnecting" | "error";
  channelId: string | null;
  channelName: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  users: VoiceUser[];
  speakingUsers: Set<string>;
  localSpeaking: boolean;
  nsEnabled: boolean;
  nsStatus: string;
  isSharingScreen: boolean;
  screenSharerId: string | null;
  userVolumes: Map<string, number>;
  connectionQuality: Map<string, "good" | "medium" | "poor" | "unknown">;
  localPing: number | null;
}

export interface VoiceActions {
  joinVoice: (channelId: string, channelName: string) => Promise<void>;
  leaveVoice: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleNS: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  setUserVolume: (socketId: string, volume: number) => void;
}
