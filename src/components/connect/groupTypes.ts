export interface Group {
  id: string;
  name: string;
  icon: string | null;
  description: string;
  ownerId: string;
  isMain?: boolean;
  _count: { members: number; channels: number };
}

export interface Channel {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  groupId: string;
  serviceId?: string | null;
  _count: { members: number; messages: number };
}

export interface GroupMember {
  id: string;
  role: string;
  user: { id: string; name: string; username: string; avatar: string | null; role: string; lastSeen?: string | null; avatarGlowEnabled?: boolean; avatarGlowColors?: string | null };
}

export interface GroupDetail extends Group {
  myRole: string;
  rules: string;
  rulesAccepted: boolean;
  createdAt: string;
  owner: { id: string; name: string; username: string };
  channels: Channel[];
  members: GroupMember[];
  invites?: { code: string; uses: number; maxUses: number; expiresAt: string | null }[];
}
