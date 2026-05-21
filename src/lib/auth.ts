import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        const isBanned = user.banned && (!user.bannedUntil || new Date(user.bannedUntil) > new Date());

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar,
          banned: isBanned,
          bannedUntil: user.bannedUntil?.toISOString() || null,
          banReason: user.banReason || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { role: string; id: string; banned: boolean; bannedUntil: string | null; banReason: string | null };
        token.role = u.role;
        token.id = u.id;
        token.banned = u.banned;
        token.bannedUntil = u.bannedUntil;
        token.banReason = u.banReason;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { role: string; id: string; banned: boolean; bannedUntil: string | null; banReason: string | null };
        u.role = token.role as string;
        u.id = token.id as string;
        u.banned = token.banned as boolean;
        u.bannedUntil = token.bannedUntil as string | null;
        u.banReason = token.banReason as string | null;
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
