import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

const BAN_CACHE_TTL = 30_000; // 30 seconds
const banCache = new Map<string, { banned: boolean; bannedUntil: string | null; banReason: string | null; ts: number }>();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email или Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const login = credentials.email.trim();
        const isEmail = login.includes("@");

        const user = await prisma.user.findUnique({
          where: isEmail ? { email: login } : { username: login },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        const isBanned = user.banned && (!user.bannedUntil || new Date(user.bannedUntil) > new Date());

        if (isBanned) {
          throw new Error(user.banReason ? `Вы заблокированы: ${user.banReason}` : "Ваш аккаунт заблокирован");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role,
          image: user.avatar,
          banned: false,
          bannedUntil: user.bannedUntil?.toISOString() || null,
          banReason: user.banReason || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { role: string; id: string; username: string; banned: boolean; bannedUntil: string | null; banReason: string | null };
        token.role = u.role;
        token.id = u.id;
        token.username = u.username;
        token.banned = u.banned;
        token.bannedUntil = u.bannedUntil;
        token.banReason = u.banReason;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { role: string; id: string; username: string; banned: boolean; bannedUntil: string | null; banReason: string | null };
        u.role = token.role as string;
        u.id = token.id as string;
        u.username = token.username as string;

        // Fetch fresh ban status — use lightweight cache to avoid DB hit per request
        const cacheKey = `ban:${token.id}`;
        const cached = banCache.get(cacheKey);
        if (cached && Date.now() - cached.ts < BAN_CACHE_TTL) {
          u.banned = cached.banned;
          u.bannedUntil = cached.bannedUntil;
          u.banReason = cached.banReason;
        } else {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { banned: true, bannedUntil: true, banReason: true },
          });
          if (dbUser) {
            const isBanned = dbUser.banned && (!dbUser.bannedUntil || new Date(dbUser.bannedUntil) > new Date());
            u.banned = isBanned;
            u.bannedUntil = dbUser.bannedUntil?.toISOString() || null;
            u.banReason = dbUser.banReason || null;
            banCache.set(cacheKey, { banned: isBanned, bannedUntil: u.bannedUntil, banReason: u.banReason, ts: Date.now() });
          } else {
            u.banned = token.banned as boolean;
            u.bannedUntil = token.bannedUntil as string | null;
            u.banReason = token.banReason as string | null;
          }
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
