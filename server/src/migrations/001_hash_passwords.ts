import bcrypt from 'bcrypt';
import pool from '../db.js';

/**
 * Migration: Hash existing plaintext passwords
 * 
 * IMPORTANT: This migration will hash all existing party passwords.
 * After running this migration, old plaintext passwords will no longer work.
 * 
 * Run this migration ONCE before deploying the password hashing changes.
 */

export async function hashExistingPasswords() {
  console.log('Starting password hashing migration...');
  
  try {
    // Get all parties with passwords
    const result = await pool.query('SELECT id, password FROM parties');
    
    if (result.rows.length === 0) {
      console.log('No parties found. Migration complete.');
      return;
    }

    console.log(`Found ${result.rows.length} parties to migrate`);
    
    const saltRounds = 10;
    let migrated = 0;
    let skipped = 0;

    for (const party of result.rows) {
      try {
        // Check if password is already hashed (bcrypt hashes start with $2b$ or $2a$)
        if (party.password && party.password.startsWith('$2')) {
          console.log(`Party ${party.id}: Password already hashed, skipping`);
          skipped++;
          continue;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(party.password, saltRounds);
        
        // Update the party
        await pool.query(
          'UPDATE parties SET password = $1 WHERE id = $2',
          [hashedPassword, party.id]
        );
        
        migrated++;
        console.log(`Party ${party.id}: Password hashed successfully`);
      } catch (error) {
        console.error(`Party ${party.id}: Failed to hash password`, error);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total parties: ${result.rows.length}`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped (already hashed): ${skipped}`);
    console.log('=========================\n');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Allow running this migration standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  hashExistingPasswords()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
