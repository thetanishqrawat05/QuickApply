#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Auto Job Applier...\n');

// 1. Install dependencies if not already installed
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed\n');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// 2. Set up database schema
console.log('🗄️  Setting up database schema...');
try {
  execSync('npm run db:push', { stdio: 'inherit' });
  console.log('✅ Database schema updated\n');
} catch (error) {
  console.warn('⚠️  Database setup failed (this is normal if DATABASE_URL is not set)');
  console.log('   You can run "npm run db:push" manually after setting up your database\n');
}

// 3. Create uploads directory
console.log('📁 Creating uploads directory...');
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Uploads directory created\n');
} else {
  console.log('✅ Uploads directory already exists\n');
}

// 4. Create screenshots directory
console.log('📸 Creating screenshots directory...');
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
  console.log('✅ Screenshots directory created\n');
} else {
  console.log('✅ Screenshots directory already exists\n');
}

// 5. Install Playwright browsers
console.log('🎭 Installing Playwright browsers...');
try {
  execSync('npx playwright install chromium', { stdio: 'inherit' });
  console.log('✅ Playwright browsers installed\n');
} catch (error) {
  console.warn('⚠️  Playwright browser installation failed');
  console.log('   The app will still work in simulation mode\n');
}

// 6. Create example environment file
console.log('🔧 Setting up environment configuration...');
const exampleEnvPath = path.join(__dirname, '..', '.env.example');
const envContent = `# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/autojobapplier

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key

# Twilio Configuration (for WhatsApp)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# JWT Secret for secure login links
JWT_SECRET=your-secure-jwt-secret-change-in-production

# Replit Domain (auto-configured in Replit)
REPLIT_DEV_DOMAIN=your-app-name.replit.dev
`;

if (!fs.existsSync(exampleEnvPath)) {
  fs.writeFileSync(exampleEnvPath, envContent);
  console.log('✅ Created .env.example file\n');
} else {
  console.log('✅ .env.example already exists\n');
}

// 7. Check for required environment variables
console.log('🔍 Checking environment configuration...');
const requiredVars = ['DATABASE_URL', 'EMAIL_USER', 'EMAIL_PASS', 'GEMINI_API_KEY'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('⚠️  Missing environment variables:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('   Add these to your Replit Secrets or .env file\n');
} else {
  console.log('✅ All required environment variables are set\n');
}

console.log('🎉 Setup complete!');
console.log('\nNext steps:');
console.log('1. Configure your environment variables in Replit Secrets');
console.log('2. Run "npm run dev" to start the application');
console.log('3. Visit the app to test the secure login system');

if (missingVars.length > 0) {
  console.log('\n📋 Required secrets to add in Replit:');
  console.log('   - DATABASE_URL: PostgreSQL connection string');
  console.log('   - EMAIL_USER: Gmail address for notifications');
  console.log('   - EMAIL_PASS: Gmail app password');
  console.log('   - GEMINI_API_KEY: Google AI API key');
  console.log('   - TWILIO_ACCOUNT_SID: Twilio account ID (optional)');
  console.log('   - TWILIO_AUTH_TOKEN: Twilio auth token (optional)');
  console.log('   - TWILIO_PHONE_NUMBER: Twilio WhatsApp number (optional)');
}