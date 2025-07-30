#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🗄️  Initializing database...\n');

// Function to run database operations
async function initializeDatabase() {
  try {
    // 1. Push schema changes
    console.log('📋 Pushing database schema...');
    execSync('npm run db:push', { stdio: 'inherit' });
    console.log('✅ Database schema updated\n');

    // 2. Create indexes for better performance
    console.log('⚡ Creating database indexes...');
    
    const { Pool } = require('@neondatabase/serverless');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Create indexes for better query performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      'CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_application_sessions_user_id ON application_sessions(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_application_sessions_status ON application_sessions(status);',
      'CREATE INDEX IF NOT EXISTS idx_application_logs_user_id ON application_logs(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_application_logs_session_id ON application_logs(session_id);',
      'CREATE INDEX IF NOT EXISTS idx_login_sessions_user_id ON login_sessions(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_login_sessions_session_id ON login_sessions(session_id);',
      'CREATE INDEX IF NOT EXISTS idx_login_sessions_secure_token ON login_sessions(secure_token);',
      'CREATE INDEX IF NOT EXISTS idx_login_sessions_status ON login_sessions(login_status);',
      'CREATE INDEX IF NOT EXISTS idx_login_sessions_expires_at ON login_sessions(expires_at);'
    ];

    for (const indexQuery of indexes) {
      try {
        await pool.query(indexQuery);
      } catch (error) {
        console.log(`   Index already exists or error: ${error.message}`);
      }
    }

    console.log('✅ Database indexes created\n');

    // 3. Clean up expired sessions
    console.log('🧹 Cleaning up expired sessions...');
    await pool.query('DELETE FROM login_sessions WHERE expires_at < NOW();');
    await pool.query('DELETE FROM application_sessions WHERE expires_at < NOW();');
    console.log('✅ Expired sessions cleaned up\n');

    await pool.end();

    console.log('🎉 Database initialization complete!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    
    if (error.message.includes('DATABASE_URL')) {
      console.log('\n💡 To fix this:');
      console.log('1. Set up a PostgreSQL database (Replit provides this automatically)');
      console.log('2. Add DATABASE_URL to your Replit Secrets');
      console.log('3. Run this script again');
    }
    
    process.exit(1);
  }
}

// Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.log('⚠️  DATABASE_URL not found in environment variables');
  console.log('   Skipping database initialization');
  console.log('   Add DATABASE_URL to Replit Secrets and run: npm run init-db');
  process.exit(0);
}

initializeDatabase();