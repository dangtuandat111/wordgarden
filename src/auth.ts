import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  trustHost: true,
  callbacks: {
    async signIn({ user, profile }) {
      const allowed = (process.env.ALLOWED_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      return !!user.email && (profile as { email_verified?: boolean })?.email_verified === true && allowed.includes(user.email.toLowerCase());
    },
  },
});
