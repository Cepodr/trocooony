import NextAuth from "next-auth"
import Discord from "next-auth/providers/discord"
import Google from "next-auth/providers/google"

const providers = []
if (process.env.AUTH_DISCORD_ID) providers.push(Discord)
if (process.env.AUTH_GOOGLE_ID) providers.push(Google)

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  trustHost: true,
})
