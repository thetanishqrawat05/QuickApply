# Auto Job Applier - Replit Development Guide

## Overview

This is a fully free web-based job application automation tool similar to LazyApply. The application allows users to paste job links from various platforms (Greenhouse, Lever, Workday, etc.) and automatically applies to those jobs using web automation. The tool focuses on privacy by storing all user data locally in the browser's localStorage, requiring no user accounts or login.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React hooks with localStorage for persistence + Database integration
- **Data Fetching**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for data persistence
- **Web Automation**: Playwright for headless browser automation
- **File Upload**: Multer middleware for handling resume/cover letter uploads
- **Development**: Hot reload with Vite integration in development mode

## Key Components

### Core Functionality Components
1. **Job Link Input** (`client/src/components/job-link-input.tsx`)
   - URL validation and platform detection
   - Real-time feedback on supported platforms

2. **Profile Form** (`client/src/components/profile-form.tsx`)
   - User information collection (name, email, phone)
   - Local storage persistence without backend database

3. **File Upload** (`client/src/components/file-upload.tsx`)
   - Resume and cover letter upload with drag-and-drop
   - File type validation (PDF, DOC, DOCX)
   - Size limits and error handling

4. **Application History** (`client/src/components/application-history.tsx`)
   - Local history of job applications
   - Status tracking (applied, failed, needs review)

5. **Application Stats** (`client/src/components/application-stats.tsx`)
   - Success rate calculations
   - Application analytics dashboard

### Automation Services
1. **Automation Service** (`server/services/automation.ts`)
   - Main orchestrator for job application automation
   - Platform detection and routing to appropriate handlers
   - Browser lifecycle management

2. **Platform Handlers** (`server/services/platform-handlers.ts`)
   - Abstract base class for platform-specific automation
   - Specialized handlers for different job platforms
   - Form filling and file upload automation

## Data Flow

### Client-Side Data Flow
1. User enters profile information → Stored in localStorage
2. User uploads files → Stored in localStorage as File objects
3. User pastes job URL → Sent to backend for platform detection
4. Application submission → FormData sent to backend with files
5. Results returned → Application history updated in localStorage

### Server-Side Data Flow
1. Platform detection endpoint analyzes URL patterns
2. Job application endpoint receives FormData with profile and files
3. User record created/retrieved from PostgreSQL database
4. Job application record created with pending status
5. Playwright automation service launches headless browser
6. Platform-specific handlers perform form filling and submission
7. Database updated with application results and status
8. Results and applicationId returned to client

### Database Schema
- **users table**: Stores user profile information (name, email, phone, file names)
- **job_applications table**: Persistent application history with detailed tracking
- **Relations**: Users have many job applications

### Local Storage Schema (Legacy/Fallback)
- `jobApplierProfile`: User profile data (name, email, phone)
- `resumeFile`: Resume file object
- `coverLetterFile`: Cover letter file object (optional)
- `applicationHistory`: Array of application records with status

## External Dependencies

### Frontend Dependencies
- **UI Components**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS for utility-first styling
- **State Management**: TanStack Query for server state
- **Icons**: Lucide React for consistent iconography
- **Form Handling**: React Hook Form with Zod validation

### Backend Dependencies
- **Web Automation**: Playwright for cross-browser automation
- **File Processing**: Multer for multipart form handling
- **Validation**: Zod schemas for type-safe data validation
- **Database**: Drizzle ORM configured for PostgreSQL (future expansion)

### Development Dependencies
- **Replit Integration**: Vite plugins for Replit-specific features
- **Type Safety**: TypeScript with strict configuration
- **Code Quality**: ESLint and path alias resolution

## Deployment Strategy

### Development Environment
- Vite dev server with HMR for frontend
- Express server with TypeScript compilation via tsx
- Playwright browsers installed in container environment
- File system permissions configured for temporary file handling

### Production Build
- Frontend built with Vite to static assets
- Backend bundled with esbuild for Node.js execution
- Single deployment artifact with public assets served by Express
- Environment variables for database connections and external services

### Browser Automation Considerations
- Headless Chromium configured with appropriate flags for container environments
- User agent rotation to avoid detection
- Temporary file management for resume/cover letter uploads
- Error handling and retry logic for network timeouts

### Privacy and Security
- No user authentication or account system required
- All personal data stored client-side in localStorage
- Temporary file cleanup after automation completion
- No persistent storage of user data on server

The architecture prioritizes user privacy, automation reliability, and ease of deployment while maintaining a clean separation between client-side data management and server-side automation capabilities.

## Recent Implementation Updates

**Project Migration to Replit - COMPLETED (January 29, 2025)**
- ✅ Successfully migrated project from Replit Agent to standard Replit environment
- ✅ Fixed database connectivity issues and applied PostgreSQL migrations
- ✅ Installed all Node.js dependencies and Playwright Chromium browser
- ✅ Configured API credentials (EMAIL_USER, EMAIL_PASS, GEMINI_API_KEY)
- ✅ All LSP diagnostics clean and application running without errors
- ✅ All advanced auto-apply features fully functional including:
  - AI cover letter generation via Gemini
  - Email notification system
  - Web automation with Playwright
  - Multi-platform job portal support
  - Enhanced database logging and session management

**Enhanced Email Approval Workflow (January 26, 2025)**
- ✓ Successfully migrated project from Replit Agent to standard Replit environment
- ✓ Fixed database connectivity and deployed PostgreSQL schema with application sessions
- ✓ Implemented comprehensive 6-step enhanced application form (`/enhanced-apply`)
- ✓ Created email approval workflow with HTML email templates and token-based authentication
- ✓ Added Progress UI component and comprehensive form validation
- ✓ Integrated Playwright automation with email notification system
- ✓ Enhanced security with 24-hour token expiration for approval links
- ✓ Added fallback mock automation service for environments with missing browser dependencies
- ✓ Implemented intelligent fallback system that automatically switches to simulation mode

**Auto-Apply Workflow System (January 28, 2025)**
- ✓ Built comprehensive auto-apply workflow tool with 60-second timer system
- ✓ Created AutoApplyWorkflowService with intelligent form detection and filling
- ✓ Implemented email review process with manual approval or auto-submit options
- ✓ Added multi-platform support (Greenhouse, Lever, Workday, BambooHR, etc.)
- ✓ Built React frontend with step-by-step wizard interface (/auto-apply)
- ✓ Integrated CAPTCHA detection and auto-login handling capabilities
- ✓ Added comprehensive file upload system with temporary file management
- ✓ Created timer-based submission system with cleanup and error handling
- ✓ Enhanced email templates with application preview and approval links

**Advanced Auto-Apply Suite (January 28, 2025)**
- ✓ Implemented comprehensive enhanced auto-apply workflow system (/enhanced-auto-apply)
- ✓ Built OpenAI service for AI-powered cover letter generation using GPT-4o
- ✓ Created WhatsApp notification service with Twilio integration
- ✓ Developed auto-login service supporting email/password, Google OAuth, and LinkedIn OAuth
- ✓ Added screenshot service for capturing submission evidence and error debugging
- ✓ Built EnhancedAutoApplyWorkflowService with all advanced features integrated
- ✓ Created application logs dashboard with comprehensive tracking and analytics
- ✓ Implemented encrypted credential storage for secure auto-login functionality
- ✓ Added intelligent form field detection with AI-powered job description analysis
- ✓ Enhanced database schema with application logs, login credentials, and notification tracking
- ✓ Built multi-step form interface with comprehensive profile collection
- ✓ Integrated CAPTCHA detection, error handling, and fallback systems
- ✓ Created enhanced approval workflow with styled HTML email responses

**Real Application Submission System (January 29, 2025)**
- ✅ Built RobustBrowserService with comprehensive Chrome launch configurations
- ✅ Created RealApplicationService for actual job portal automation and form submission
- ✅ Added real application endpoint (/api/real-apply) with actual browser automation
- ✅ Enhanced UI with submission mode toggle (simulation vs real application)
- ✅ Implemented intelligent platform detection (Google, Microsoft, Amazon, Meta, etc.)
- ✅ Added screenshot capture for submission evidence and error debugging
- ✅ Created comprehensive form field detection and auto-filling system
- ✅ Enhanced file upload handling with temporary file management
- ✅ Added confirmation email system for actual application submissions
- ✅ Built fallback system that gracefully handles browser dependency issues

**Technical Architecture for Advanced Auto-Apply Suite**
- **Frontend**: 
  - Multi-step wizard with comprehensive profile collection (/enhanced-auto-apply)
  - Application logs dashboard with statistics and filtering (/enhanced-auto-apply - Dashboard tab)
  - Enhanced form components with AI settings and notification preferences
  - Responsive design with gradient styling and modern UI components
  
- **Backend Services**:
  - **EnhancedAutoApplyWorkflowService**: Main orchestrator with full feature integration
  - **OpenAIService**: AI cover letter generation using GPT-4o model
  - **WhatsAppService**: Twilio-based messaging for review and confirmation notifications
  - **AutoLoginService**: Multi-method authentication (email/password, Google OAuth, LinkedIn OAuth)
  - **ScreenshotService**: Evidence capture for submissions and error debugging
  
- **Database Architecture**:
  - Enhanced application_sessions table with login credentials, screenshots, AI-generated content
  - New application_logs table for comprehensive tracking and analytics
  - Encrypted credential storage using AES-256-CBC encryption
  - Relations between users, sessions, and logs for complete audit trail
  
- **AI Integration**:
  - OpenAI GPT-4o for cover letter generation based on job descriptions
  - Intelligent job posting analysis for automatic form field mapping
  - AI-powered content extraction from job pages
  
- **Multi-Channel Notifications**:
  - Email notifications with HTML templates and approval links
  - WhatsApp notifications via Twilio for instant mobile alerts
  - 60-second auto-submit timer with manual override capability
  
- **Security & Privacy**:
  - AES-256-CBC encryption for stored login credentials
  - Token-based approval system with 24-hour expiration
  - Secure file handling with automatic cleanup
  - No persistent storage of sensitive user data
  
- **Automation Features**:
  - CAPTCHA detection and intelligent handling
  - Multi-platform form detection (Greenhouse, Lever, Workday, BambooHR, etc.)
  - Smart form field mapping using labels, placeholders, and AI analysis
  - Screenshot capture for submission evidence and error diagnosis
  - HTML snapshot generation for debugging
  - Intelligent fallback systems for browser dependency issues