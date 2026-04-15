import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import Spotify from "next-auth/providers/spotify";
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: process.env.NODE_ENV === "development",
  providers: [
    Google,
    MicrosoftEntraId,
    Spotify,
  ],
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose user ID from the provider
      if (token.sub) {
        session.user.id = token.sub;
      }

      // Create a short-lived HS256 JWT for the Go backend
      session.bearerToken = await new SignJWT({
        sub: token.sub,
        name: token.name,
        email: token.email,
        picture: token.picture,
        provider: token.provider,
        provider_account_id: token.providerAccountId,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(secret);

      return session;
    },
  },
});
