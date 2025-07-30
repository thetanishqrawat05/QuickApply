# 🤖 Auto Job Applier

**The world's most advanced job application automation tool with AI-powered cover letters and secure login handling.**

[![Deployment Status](https://img.shields.io/badge/deployment-automated-green)](DEPLOYMENT.md)
[![Demo Available](https://img.shields.io/badge/demo-live-blue)](/secure-login-demo)
[![Security](https://img.shields.io/badge/security-JWT%20%2B%20AES256-yellow)](#security)

## ✨ Features

### 🚀 **Automated Job Applications**
- **One-Click Applications**: Paste any job URL and automatically apply
- **Multi-Platform Support**: Works with Greenhouse, Lever, Workday, BambooHR, and more
- **Form Auto-Fill**: Intelligent detection and filling of application forms
- **File Upload Automation**: Automatic resume and cover letter uploads

### 🧠 **AI-Powered Intelligence**
- **Smart Cover Letters**: AI-generated, job-specific cover letters using Gemini AI
- **Job Description Analysis**: Automatic extraction and analysis of job requirements
- **Intelligent Form Mapping**: AI-powered field detection and form completion

### 🔐 **Secure Login Management**
- **Secure Login Links**: JWT-based authentication for job portals requiring login
- **Multi-Channel Notifications**: Email and WhatsApp notifications for login approvals
- **Session Management**: Automatic session cleanup and security token expiration
- **No Password Storage**: Secure workflow without storing user credentials

### 📱 **Multi-Channel Notifications**
- **Email Alerts**: HTML email notifications with approval links
- **WhatsApp Integration**: Instant mobile notifications via Twilio
- **Real-Time Updates**: Live status updates and application tracking

### 📊 **Comprehensive Dashboard**
- **Application History**: Complete tracking of all job applications
- **Success Analytics**: Detailed statistics and success rates
- **System Monitoring**: Real-time system health and configuration status
- **Login Management**: Dashboard for secure login session monitoring

## 🚀 Quick Start

### For Replit (Recommended)
1. **Fork** this repository to Replit
2. **Add Secrets** in Replit Secrets panel (see [DEPLOYMENT.md](DEPLOYMENT.md))
3. **Click Run** - Everything is automated!

### For Local Development
```bash
git clone <repo-url>
cd auto-job-applier
npm install  # Auto-runs setup
npm run dev  # Start development server
```

## 📋 Required Setup

### Core Requirements
- **Database**: PostgreSQL (auto-provided in Replit)
- **Email**: Gmail with app password
- **AI**: Gemini API key (free at Google AI Studio)

### Optional Features
- **WhatsApp**: Twilio credentials for mobile notifications

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed setup instructions.

## 🛠️ Technology Stack

### Frontend
- **React** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Radix UI** with shadcn/ui for accessible components
- **Tailwind CSS** for styling with dark mode support
- **TanStack Query** for efficient data fetching

### Backend
- **Node.js** with Express.js framework
- **PostgreSQL** with Drizzle ORM for data persistence
- **Playwright** for browser automation
- **JWT** for secure authentication tokens
- **Multer** for file upload handling

### AI & Automation
- **Gemini AI** for cover letter generation
- **Playwright** for web automation and form filling
- **Twilio** for WhatsApp notifications
- **Nodemailer** for email services

## 🔒 Security

### Automatic Security Features
- **JWT Authentication**: Secure login links with 24-hour expiration
- **AES-256-CBC Encryption**: Secure storage of sensitive data
- **Session Management**: Automatic cleanup of expired sessions
- **Environment Isolation**: Secrets never logged or exposed
- **Token Validation**: Cryptographically secure authentication

### Privacy Protection
- **No Credential Storage**: Secure workflow without password storage
- **Local Data Management**: User data stored client-side
- **Automatic Cleanup**: Temporary files removed after processing
- **Secure Communications**: All API calls use HTTPS

## 📖 API Documentation

### Core Endpoints
- `GET /api/health` - System health check
- `GET /api/system-info` - Configuration status
- `POST /api/create-secure-login` - Create secure login session
- `GET /secure-login/:token` - Process secure login

### Demo Interface
- `/secure-login-demo` - Interactive demo and system monitoring
- `/apply` - Main application dashboard (requires login)

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run setup        # Run full system setup
npm run init-db      # Initialize database
npm run db:push      # Push schema changes
```

### Architecture
- **Auto-Initialization**: System configures itself on startup
- **Graceful Fallbacks**: Works with partial configuration
- **Error Recovery**: Automatic retry and fallback mechanisms
- **Performance Optimization**: Database indexing and query optimization

## 📱 Demo

Visit `/secure-login-demo` to:
- Monitor system health and configuration
- Test secure login link creation
- View login session dashboard
- Test email and WhatsApp notifications

## 🆘 Support

### System Status
Check `/api/system-info` for real-time configuration status

### Troubleshooting
1. **Database Issues**: Ensure DATABASE_URL is configured
2. **Email Problems**: Verify Gmail app password setup
3. **AI Features**: Check GEMINI_API_KEY validity
4. **WhatsApp**: Verify Twilio credentials (optional)

### Getting Help
- See [DEPLOYMENT.md](DEPLOYMENT.md) for setup instructions
- Check system status in the demo interface
- Review console logs for detailed error information

## 🌟 Key Benefits

### For Job Seekers
- **Save Hours**: Automate repetitive application processes
- **Increase Applications**: Apply to more jobs in less time
- **Professional Quality**: AI-generated, tailored cover letters
- **Mobile Friendly**: Approve applications via WhatsApp

### For Developers
- **Production Ready**: Complete deployment automation
- **Secure by Default**: Built-in security best practices
- **Scalable Architecture**: Modern tech stack with TypeScript
- **Easy Deployment**: One-click setup on Replit

---

**Ready to automate your job search? Fork this repository and start applying to jobs in seconds!**

[![Deploy to Replit](https://img.shields.io/badge/Deploy-Replit-blue?logo=replit)](https://replit.com/@yourusername/auto-job-applier)
[![View Demo](https://img.shields.io/badge/View-Demo-green)](/secure-login-demo)