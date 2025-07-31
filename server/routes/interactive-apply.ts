import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { InteractiveLoginAutomationService } from '../services/interactive-login-automation';
import { comprehensiveProfileSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();
const interactiveService = new InteractiveLoginAutomationService();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
    }
  }
});

// Start interactive application session
router.post('/start', upload.fields([
  { name: 'resumeFile', maxCount: 1 },
  { name: 'coverLetterFile', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('🚀 Starting interactive application...');
    
    // Parse and validate profile data
    const profileData = JSON.parse(req.body.profile);
    const profile = comprehensiveProfileSchema.parse(profileData);
    
    // Validate job URL
    const jobUrl = z.string().url().parse(req.body.jobUrl);
    
    // Handle file uploads
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let resumeBuffer: Buffer | undefined;
    let coverLetterBuffer: Buffer | undefined;
    
    if (files.resumeFile && files.resumeFile[0]) {
      const resumeFile = files.resumeFile[0];
      resumeBuffer = await fs.readFile(resumeFile.path);
      profile.resumeFileName = resumeFile.originalname;
      
      // Save file permanently
      const permanentPath = path.join('uploads', resumeFile.originalname);
      await fs.writeFile(permanentPath, resumeBuffer);
      await fs.unlink(resumeFile.path); // Clean up temp file
    }
    
    if (files.coverLetterFile && files.coverLetterFile[0]) {
      const coverLetterFile = files.coverLetterFile[0];
      coverLetterBuffer = await fs.readFile(coverLetterFile.path);
      profile.coverLetterFileName = coverLetterFile.originalname;
      
      // Save file permanently
      const permanentPath = path.join('uploads', coverLetterFile.originalname);
      await fs.writeFile(permanentPath, coverLetterBuffer);
      await fs.unlink(coverLetterFile.path); // Clean up temp file
    }
    
    // Start interactive session
    const result = await interactiveService.startInteractiveSession({
      jobUrl,
      profile,
      resumeFile: resumeBuffer,
      coverLetterFile: coverLetterBuffer
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error starting interactive session:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start application session'
    });
  }
});

// Check login status
router.get('/check-login/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await interactiveService.checkLoginStatus(sessionId);
    res.json(result);
  } catch (error) {
    console.error('❌ Error checking login status:', error);
    res.status(500).json({
      isLoggedIn: false,
      canProceed: false,
      message: 'Error checking login status',
      status: 'error'
    });
  }
});

// Fill application form
router.post('/fill-form/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await interactiveService.fillApplicationForm(sessionId);
    res.json(result);
  } catch (error) {
    console.error('❌ Error filling form:', error);
    res.status(500).json({
      success: false,
      message: 'Error filling application form',
      formFilled: false,
      readyToSubmit: false
    });
  }
});

// Submit application
router.post('/submit/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await interactiveService.submitApplication(sessionId);
    res.json(result);
  } catch (error) {
    console.error('❌ Error submitting application:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting application',
      submitted: false
    });
  }
});

// Close session
router.delete('/close/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await interactiveService.closeSession(sessionId);
    res.json({ success: true, message: 'Session closed successfully' });
  } catch (error) {
    console.error('❌ Error closing session:', error);
    res.status(500).json({
      success: false,
      message: 'Error closing session'
    });
  }
});

export default router;