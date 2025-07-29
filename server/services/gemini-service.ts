import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      console.log('✅ Gemini AI service initialized');
    } else {
      console.warn('⚠️ Gemini API key not provided. AI features will be disabled.');
    }
  }

  async generateCoverLetter(
    jobTitle: string,
    companyName: string,
    jobDescription: string,
    applicantName: string,
    applicantExperience: string
  ): Promise<string> {
    if (!this.ai) {
      throw new Error('Gemini API key not configured');
    }

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
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
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
    if (!this.ai) {
      throw new Error('Gemini API key not configured');
    }

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