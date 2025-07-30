import type { Express } from "express";
import { AutoInitSystem } from "../init-system";

export function registerSystemInfoRoutes(app: Express) {
  // Get system configuration status
  app.get("/api/system-info", (req, res) => {
    const secrets = AutoInitSystem.getRequiredSecrets();
    
    const status = {
      database: !!process.env.DATABASE_URL,
      email: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      ai: !!process.env.GEMINI_API_KEY,
      whatsapp: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      jwt: !!process.env.JWT_SECRET
    };

    const missingRequired = secrets.required.filter(secret => !process.env[secret.key]);
    const missingOptional = secrets.optional.filter(secret => !process.env[secret.key]);

    res.json({
      status,
      configured: missingRequired.length === 0,
      features: {
        jobApplication: true, // Always available
        aiCoverLetters: status.ai,
        emailNotifications: status.email,
        whatsappNotifications: status.whatsapp,
        secureLogin: status.jwt,
        browserAutomation: true // Fallback to simulation if needed
      },
      missing: {
        required: missingRequired,
        optional: missingOptional
      },
      setupInstructions: {
        replit: "Add secrets in Replit Secrets panel",
        local: "Copy .env.example to .env and configure",
        help: "See DEPLOYMENT.md for detailed setup guide"
      }
    });
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development"
    });
  });
}