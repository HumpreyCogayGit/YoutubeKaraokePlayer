// Generate a secure random session secret
import crypto from 'crypto';

const secret = crypto.randomBytes(32).toString('hex');
console.log('\n🔑 Your SESSION_SECRET:');
console.log(secret);
console.log('\nCopy this to your Railway environment variables!\n');
