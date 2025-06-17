import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (!email || !password) {
          throw new Error("Missing email or password");
        }

        // Step 1: Supabase Auth sign-in
        const { data: authData, error: authError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (authError || !authData?.user) {
          throw new Error("Invalid email or password");
        }

        const userId = authData.user.id;

        // Step 2: Check for user in `users` table (roles, quota, etc.)
        let { data: userMeta, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();

        if (!userMeta) {
          // Step 3: Create user entry if not exists
          const insertResult = await supabase.from("users").insert({
            id: userId,
            email,
            role: "user", // default role
            quota: 1000,
          });

          if (insertResult.error) {
            throw new Error("Failed to sync user metadata");
          }

          userMeta = {
            id: userId,
            email,
            role: "user",
            quota: 1000,
          };
        }

        return {
          id: userId,
          email,
          role: userMeta.role,
          quota: userMeta.quota,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login", // Custom login page if needed
  },
  callbacks: {
    async jwt({ token, user }) {
      // First time login
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.quota = user.quota;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.role = token.role;
        session.user.quota = token.quota;
      }
      return session;
    },
  },
});
export { handler as GET, handler as POST };
