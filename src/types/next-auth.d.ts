import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: string;
      banned: boolean;
      bannedUntil: string | null;
      banReason: string | null;
    };
  }

  interface User {
    role: string;
    banned: boolean;
    bannedUntil: string | null;
    banReason: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    id: string;
    banned: boolean;
    bannedUntil: string | null;
    banReason: string | null;
  }
}
