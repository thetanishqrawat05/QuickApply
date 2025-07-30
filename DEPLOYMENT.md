# 🚀 Auto Job Applier - Complete Deployment Guide

This guide ensures your Auto Job Applier works automatically on any deployment or clone without manual configuration.

## 🔧 Automated Setup

### For Replit (Recommended)
1. **Fork/Clone** this repository to Replit
2. **Add Secrets** in Replit Secrets panel:
   ```
   DATABASE_URL=postgresql://username:password@host:port/database
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   GEMINI_API_KEY=your-gemini-api-key
   ```
3. **Optional WhatsApp Secrets**:
   ```
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=+1234567890
   ```
4. **Start Application** - Everything auto-configures on first run!

### For Other Platforms
1. **Clone Repository**: `git clone <repo-url>`
2. **Install Dependencies**: `npm install` (auto-runs setup)
3. **Configure Environment**: Copy `.env.example` to `.env` and fill values
4. **Start Application**: `npm run dev`

## 📋 Required API Keys & Setup

### 1. PostgreSQL Database
**Replit**: Automatically provided via Database service
**Other**: Set up PostgreSQL and add connection string to `DATABASE_URL`

### 2. Gmail Configuration
1. Enable 2-factor authentication on Gmail
2. Generate App Password: [Google Account Settings](https://myaccount.google.com/apppasswords)
3. Add `EMAIL_USER` (your Gmail) and `EMAIL_PASS` (app password)

### 3. Gemini AI API Key
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create new API key
3. Add to `GEMINI_API_KEY` secret

### 4. WhatsApp (Optional)
1. Sign up for [Twilio](https://www.twilio.com/)
2. Get WhatsApp sandbox or approved number
3. Add Twilio credentials to secrets

## 🔄 Automatic Features

### On Every Startup
✅ **Database Initialization**: Creates tables, indexes, and relations
✅ **Directory Setup**: Creates uploads and screenshots folders
✅ **Browser Installation**: Installs Playwright Chromium automatically
✅ **Session Cleanup**: Removes expired login sessions
✅ **Environment Validation**: Checks for required secrets

### On Every Deployment
✅ **Dependency Installation**: All packages installed automatically
✅ **Database Migration**: Schema changes applied automatically
✅ **File System Setup**: Required directories created
✅ **Service Configuration**: All services auto-configured

## 🛠️ Manual Commands (If Needed)

```bash
# Run full setup (automatically runs on npm install)
npm run setup

# Initialize database manually
npm run init-db

# Push database schema changes
npm run db:push

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🔍 Troubleshooting

### Missing Database
```
⚠️ DATABASE_URL not configured
```
**Solution**: Add PostgreSQL connection string to Replit Secrets

### Email Not Working
```
❌ Email service failed
```
**Solutions**:
- Check Gmail app password is correct
- Ensure 2FA is enabled on Gmail
- Verify EMAIL_USER and EMAIL_PASS in secrets

### AI Cover Letters Not Working
```
❌ Gemini service failed
```
**Solution**: Add valid GEMINI_API_KEY to Replit Secrets

### Browser Automation Issues
```
⚠️ Playwright browser installation skipped
```
**Normal**: App runs in simulation mode if browser installation fails

## 📱 Features Available

### Core Features (Always Available)
- ✅ Job application form automation
- ✅ File upload handling
- ✅ Application history tracking
- ✅ Dashboard with statistics

### With Full Configuration
- ✅ **AI Cover Letters** (requires GEMINI_API_KEY)
- ✅ **Email Notifications** (requires EMAIL_USER/EMAIL_PASS)
- ✅ **WhatsApp Notifications** (requires Twilio credentials)
- ✅ **Secure Login Links** (JWT auto-generated)
- ✅ **Real Browser Automation** (Playwright auto-installed)

## 🔒 Security Features

### Automatic Security Setup
- **JWT Secrets**: Auto-generated if not provided
- **Session Expiration**: 24-hour automatic cleanup
- **Secure Tokens**: Cryptographically secure login links
- **Environment Isolation**: Secrets never logged or exposed

### Database Security
- **Encrypted Credentials**: Login credentials stored with AES-256-CBC
- **Index Optimization**: Performance indexes auto-created
- **Session Management**: Automatic cleanup of expired sessions

## 🎯 Quick Start Checklist

For immediate deployment:

1. **Fork to Replit** ✅
2. **Add DATABASE_URL secret** ✅
3. **Add EMAIL_USER secret** ✅
4. **Add EMAIL_PASS secret** ✅
5. **Add GEMINI_API_KEY secret** ✅
6. **Click Run** ✅

Everything else is automatic!

## 🆘 Need Help?

### Check Application Status
Visit `/secure-login-demo` to test all system components

### View Initialization Logs
Check console on startup for detailed initialization status

### Common Issues
- **Database**: Usually auto-provided in Replit
- **Email**: Requires Gmail app password (not regular password)
- **AI**: Free tier available at [Google AI Studio](https://aistudio.google.com/)
- **WhatsApp**: Optional feature, app works without it

---

**Ready for Production**: This setup ensures your Auto Job Applier works immediately on any deployment without manual configuration!