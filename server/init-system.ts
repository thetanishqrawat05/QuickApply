import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pool } from './db';

export class AutoInitSystem {
  private static initialized = false;

  static async initialize() {
    if (this.initialized) return;

    console.log('🚀 Auto-initializing system...');

    try {
      // 1. Create required directories
      await this.createDirectories();
      
      // 2. Initialize database if available
      await this.initializeDatabase();
      
      // 3. Install Playwright browsers if needed
      await this.installPlaywrightBrowsers();
      
      // 4. Setup environment configuration
      await this.setupEnvironment();

      this.initialized = true;
      console.log('✅ Auto-initialization complete\n');
    } catch (error: any) {
      console.warn('⚠️  Auto-initialization failed:', error.message);
      console.log('   App will continue with limited functionality\n');
    }
  }

  private static async createDirectories() {
    const dirs = ['uploads', 'screenshots'];
    
    for (const dir of dirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created ${dir} directory`);
      }
    }
  }

  private static async initializeDatabase() {
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL not configured, skipping database initialization');
      return;
    }

    try {
      console.log('🗄️  Initializing database...');

      // Create indexes for better performance
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
        } catch (error: any) {
          // Index might already exist, ignore
        }
      }

      // Clean up expired sessions
      await pool.query('DELETE FROM login_sessions WHERE expires_at < NOW();');
      await pool.query('DELETE FROM application_sessions WHERE expires_at < NOW();');

      console.log('✅ Database initialized');
    } catch (error: any) {
      console.warn('⚠️  Database initialization failed:', error.message);
    }
  }

  private static async installPlaywrightBrowsers() {
    try {
      // Check if Chromium is already installed
      const { execSync } = require('child_process');
      execSync('npx playwright install chromium --dry-run', { stdio: 'pipe' });
      
      console.log('🎭 Installing Playwright browsers...');
      execSync('npx playwright install chromium', { stdio: 'pipe' });
      console.log('✅ Playwright browsers installed');
    } catch (error: any) {
      console.warn('⚠️  Playwright browser installation skipped (will use simulation mode)');
    }
  }

  private static async setupEnvironment() {
    // Check for required environment variables
    const requiredVars = ['DATABASE_URL', 'EMAIL_USER', 'EMAIL_PASS', 'GEMINI_API_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.log('⚠️  Missing environment variables:');
      missingVars.forEach(varName => {
        console.log(`   - ${varName}`);
      });
      console.log('   Add these to your Replit Secrets for full functionality');
    } else {
      console.log('✅ All required environment variables configured');
    }

    // Generate JWT secret if not provided
    if (!process.env.JWT_SECRET) {
      const crypto = require('crypto');
      const jwtSecret = crypto.randomBytes(32).toString('hex');
      process.env.JWT_SECRET = jwtSecret;
      console.log('✅ Generated JWT secret for this session');
    }
  }

  static getRequiredSecrets() {
    return {
      required: [
        { key: 'DATABASE_URL', description: 'PostgreSQL connection string' },
        { key: 'EMAIL_USER', description: 'Gmail address for notifications' },
        { key: 'EMAIL_PASS', description: 'Gmail app password' },
        { key: 'GEMINI_API_KEY', description: 'Google AI API key for cover letters' }
      ],
      optional: [
        { key: 'TWILIO_ACCOUNT_SID', description: 'Twilio account ID for WhatsApp' },
        { key: 'TWILIO_AUTH_TOKEN', description: 'Twilio auth token for WhatsApp' },
        { key: 'TWILIO_PHONE_NUMBER', description: 'Twilio WhatsApp number' },
        { key: 'JWT_SECRET', description: 'Secret for secure login tokens (auto-generated)' }
      ]
    };
  }
}