import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from './db.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, emails, displayName, photos } = profile;
        const email = emails?.[0]?.value;
        const profilePicture = photos?.[0]?.value;

        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        // Check if user exists
        const userResult = await pool.query(
          'SELECT * FROM users WHERE google_id = $1',
          [id]
        );

        let user;
        if (userResult.rows.length > 0) {
          // Update existing user
          const updateResult = await pool.query(
            'UPDATE users SET name = $1, profile_picture = $2, updated_at = CURRENT_TIMESTAMP WHERE google_id = $3 RETURNING *',
            [displayName, profilePicture, id]
          );
          user = updateResult.rows[0];
        } else {
          // Create new user
          const insertResult = await pool.query(
            'INSERT INTO users (google_id, email, name, profile_picture) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, email, displayName, profilePicture]
          );
          user = insertResult.rows[0];
        }

        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error);
  }
});

export default passport;
