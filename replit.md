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

**Technical Architecture for Auto-Apply Workflow**
- **Frontend**: Multi-step wizard collecting comprehensive profile data upfront
- **Backend**: AutoApplyWorkflowService with Playwright browser automation + fallback systems
- **Database**: Application sessions table for managing approval workflow state with 24-hour token expiration
- **Email System**: Gmail SMTP integration with EMAIL_USER/EMAIL_PASS credentials for review and confirmation emails
- **Security**: Token-based approval system preventing unauthorized submissions
- **Automation**: Intelligent fallback from Playwright browser automation to simulation mode when browser dependencies are unavailable
- **Timer System**: 60-second auto-submit countdown with manual approval override capability
- **Platform Support**: Multi-platform form detection and filling (Greenhouse, Lever, Workday, company sites)
- **File Management**: Temporary file handling for resume and cover letter uploads with automatic cleanup
- **Email Workflow**: Review email → 60s timer → auto-submit OR manual approval → confirmation email