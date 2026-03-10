// middlewares/passport.middleware.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import prisma from "../prismaClient.js";
import dotenv from "dotenv";
dotenv.config();

// Configure Passport strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(null, false);
        }

        // Find or create the user
        let user = await prisma.user.findUnique({ where: { email } });
        // console.log(user);
        console.log(profile);
        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName,
              profileImage: profile.photos?.[0]?.value,
              gender: profile.gender || null,
              provider: "GOOGLE",
              // isVerified: true,
              password: "", // optional: placeholder to prevent login via password
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Session handling
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  const user = await prisma.user.findUnique({ where: { id } });
  done(null, user);
});

export default passport;
