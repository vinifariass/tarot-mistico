import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) token.id = user.id;

      // Atualiza subscription no token APENAS no login ou quando forçado via update()
      // IMPORTANTE: A spec mostra uma query incondicional no pseudocódigo, mas isso
      // chamaria o banco em TODA renderização de página via JWT callback.
      // O guard `user || trigger === 'update'` é a implementação correta e intencional.
      if (user || trigger === 'update') {
        const userId = token.id as string | undefined ?? token.sub;
        if (userId) {
          const sub = await prisma.subscription.findUnique({
            where: { userId },
            select: { status: true, expiresAt: true },
          });
          token.subscriptionStatus = sub?.status ?? 'inactive';
          token.subscriptionExpiresAt = sub?.expiresAt?.toISOString() ?? null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      session.subscriptionStatus = (token.subscriptionStatus as string) ?? 'inactive';
      session.subscriptionExpiresAt = (token.subscriptionExpiresAt as string | null) ?? null;
      return session;
    },
  },
};
