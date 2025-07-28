import OpenAI from "openai";

export class OpenAIService {
  private openai: OpenAI | null = null;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not provided. AI features will be disabled.');
      return;
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateCoverLetter(
    jobDescription: string,
    jobTitle: string,
    companyName: string,
    userProfile: any,
    template?: string
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `
Create a professional cover letter for the following job application:

Job Title: ${jobTitle}
Company: ${companyName}
Job Description: ${jobDescription}

Applicant Information:
- Name: ${userProfile.name}
- Email: ${userProfile.email}
- Experience: ${JSON.stringify(userProfile.experience || [])}
- Education: ${JSON.stringify(userProfile.education || [])}

${template ? `Use this template style: ${template}` : ''}

Requirements:
- Professional tone
- Highlight relevant experience
- Show enthusiasm for the role
- Keep it concise (3-4 paragraphs)
- Include proper salutation and closing
- Make it personal and specific to this job

Generate the cover letter content:
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a professional career advisor and expert cover letter writer. Generate compelling, personalized cover letters that help candidates stand out."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      return response.choices[0].message.content || 'Failed to generate cover letter';
    } catch (error) {
      console.error('OpenAI cover letter generation error:', error);
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
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `
Analyze this job posting content and extract key information:

URL: ${jobUrl}
Content: ${jobPageContent.substring(0, 8000)} // Limit content size

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
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system", 
            content: "You are an expert at analyzing job postings and extracting structured information. Return valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        jobTitle: result.jobTitle || 'Unknown Position',
        companyName: result.companyName || 'Unknown Company',
        jobDescription: result.jobDescription || '',
        requirements: result.requirements || [],
        benefits: result.benefits || []
      };
    } catch (error) {
      console.error('OpenAI job analysis error:', error);
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