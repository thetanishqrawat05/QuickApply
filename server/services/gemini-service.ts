import { GoogleGenAI } from "@google/genai";
import { GEMINI_CONFIG, validateGeminiConfig, getTaskConfig } from '../config/gemini-config';

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeGemini();
  }

  private initializeGemini() {
    const validation = validateGeminiConfig();
    
    if (!validation.isValid) {
      console.error('❌ Gemini configuration validation failed:', validation.errors);
      this.isConfigured = false;
      return;
    }

    try {
      this.ai = new GoogleGenAI({
        apiKey: GEMINI_CONFIG.apiKey
      });
      this.isConfigured = true;
      console.log('✅ Gemini AI service initialized with permanent configuration');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini:', error);
      this.isConfigured = false;
    }
  }

  private ensureConfigured() {
    if (!this.isConfigured || !this.ai) {
      throw new Error('Gemini service is not properly configured. Please check GEMINI_API_KEY environment variable.');
    }
  }

  async generateCoverLetter(
    jobTitle: string,
    companyName: string,
    jobDescription: string,
    applicantName: string,
    applicantExperience: string
  ): Promise<string> {
    this.ensureConfigured();
    
    const config = getTaskConfig('coverLetterGeneration');

    const prompt = `
Create a professional cover letter for this job application:

Job Title: ${jobTitle}
Company: ${companyName}
Applicant Name: ${applicantName}

Job Description:
${jobDescription}

Applicant Experience/Background:
${applicantExperience}

Requirements:
- Professional and engaging tone
- Highlight relevant experience that matches job requirements
- Show enthusiasm for the role and company
- Keep it concise (3-4 paragraphs)
- Include proper salutation and closing
- Make it personal and specific to this job
- Don't use placeholder text

Generate the cover letter content:
`;

    try {
      const response = await this.ai!.models.generateContent({
        model: config.model,
        contents: prompt,
        config: {
          systemInstruction: config.systemInstruction,
          temperature: config.temperature,
          maxOutputTokens: config.maxOutputTokens
        }
      });

      const coverLetter = response.text || 'Failed to generate cover letter';
      console.log('✅ AI cover letter generated successfully');
      return coverLetter;
    } catch (error) {
      console.error('Gemini cover letter generation error:', error);
      throw new Error('Failed to generate AI cover letter: ' + (error as Error).message);
    }
  }

  async extractJobDetails(jobPageContent: string, jobUrl: string): Promise<{
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    requirements: string[];
    benefits: string[];
  }> {
    this.ensureConfigured();

    const prompt = `
Analyze this job posting content and extract key information:

URL: ${jobUrl}
Content: ${jobPageContent.substring(0, 8000)}

Extract and return JSON with:
{
  "jobTitle": "exact job title",
  "companyName": "company name", 
  "jobDescription": "main job description",
  "requirements": ["requirement 1", "requirement 2", ...],
  "benefits": ["benefit 1", "benefit 2", ...]
}

Focus on accuracy and extract only information that's clearly present in the content.
`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              jobTitle: { type: "string" },
              companyName: { type: "string" },
              jobDescription: { type: "string" },
              requirements: { type: "array", items: { type: "string" } },
              benefits: { type: "array", items: { type: "string" } }
            },
            required: ["jobTitle", "companyName", "jobDescription", "requirements", "benefits"],
          },
        },
        contents: prompt,
      });

      const result = JSON.parse(response.text || '{}');
      return {
        jobTitle: result.jobTitle || 'Unknown Position',
        companyName: result.companyName || 'Unknown Company',
        jobDescription: result.jobDescription || '',
        requirements: result.requirements || [],
        benefits: result.benefits || []
      };
    } catch (error) {
      console.error('Gemini job analysis error:', error);
      return {
        jobTitle: 'Unknown Position',
        companyName: 'Unknown Company', 
        jobDescription: '',
        requirements: [],
        benefits: []
      };
    }
  }
}