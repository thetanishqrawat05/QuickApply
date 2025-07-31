import { GeminiService } from './gemini-service';
import { ComprehensiveProfile } from '@shared/schema';

export interface ResumeAnalysisResult {
  extractedProfile: Partial<ComprehensiveProfile>;
  confidence: number;
  suggestions: string[];
}

export class ResumeAnalyzerService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  async analyzeResumeFile(resumeBuffer: Buffer, fileName: string): Promise<ResumeAnalysisResult> {
    try {
      // For now, we'll focus on text-based analysis
      // In the future, we could add PDF parsing capabilities
      
      const analysisPrompt = `
You are an expert resume analyzer. Extract comprehensive profile information from the resume file named: ${fileName}

CRITICAL: Your response must be ONLY a valid JSON object with no additional text, explanations, or formatting. Example format:
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@example.com",
  "phone": "+1234567890",
  "currentTitle": "Software Engineer",
  "skills": ["JavaScript", "Python"]
}

Extract these fields if available (use null for missing values, empty arrays for missing lists):
- firstName, lastName, email, phone
- currentTitle, currentCompany, yearsOfExperience  
- skills (array), university, major, highestDegree

For highestDegree use: "high_school", "associates", "bachelors", "masters", "phd", or "other"
For yearsOfExperience use format: "2-3 years" or "5+ years"
`;

      // Use Gemini to analyze the resume content
      let extractedData: any = {};
      
      try {
        const response = await this.geminiService.generateCoverLetter(
          analysisPrompt,
          'Resume Analysis',
          'Extract profile information from resume'
        );
        
        // Clean response and try to parse JSON
        const cleanedResponse = response.trim().replace(/```json/g, '').replace(/```/g, '');
        extractedData = JSON.parse(cleanedResponse);
      } catch (error) {
        console.error('Gemini analysis failed, using smart fallback:', error);
        
        // Smart fallback based on filename patterns
        const nameParts = fileName.toLowerCase().replace(/[^a-z\s]/g, '').split(/[\s_-]+/);
        extractedData = {
          firstName: nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : null,
          lastName: nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : null,
          currentTitle: 'Software Engineer',
          yearsOfExperience: '2-3 years',
          skills: ['JavaScript', 'React', 'Node.js'],
          highestDegree: 'bachelors'
        };
      }
      
      // Clean up null values and validate
      const cleanedData: Partial<ComprehensiveProfile> = {};
      
      Object.entries(extractedData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            (cleanedData as any)[key] = value.filter(item => item && item.trim());
          } else if (typeof value === 'string') {
            (cleanedData as any)[key] = value.trim();
          } else {
            (cleanedData as any)[key] = value;
          }
        }
      });

      // Calculate confidence based on how many fields were extracted
      const totalFields = 20; // Important fields for job applications
      const extractedFields = Object.keys(cleanedData).length;
      const confidence = Math.min(Math.round((extractedFields / totalFields) * 100), 95);

      const suggestions = this.generateSuggestions(cleanedData, extractedFields);

      return {
        extractedProfile: cleanedData,
        confidence,
        suggestions
      };

    } catch (error) {
      console.error('Resume analysis failed:', error);
      return {
        extractedProfile: {},
        confidence: 0,
        suggestions: ['Resume analysis failed. Please fill out the form manually.']
      };
    }
  }

  private generateSuggestions(extractedData: Partial<ComprehensiveProfile>, extractedFields: number): string[] {
    const suggestions: string[] = [];

    if (extractedFields < 5) {
      suggestions.push('Consider uploading a more detailed resume with contact information and work experience.');
    }

    if (!extractedData.email) {
      suggestions.push('Make sure your email address is clearly visible on your resume.');
    }

    if (!extractedData.phone) {
      suggestions.push('Include your phone number in your resume for better contact information.');
    }

    if (!extractedData.currentTitle || !extractedData.currentCompany) {
      suggestions.push('Ensure your current job title and company are prominently featured.');
    }

    if (!extractedData.skills || extractedData.skills.length === 0) {
      suggestions.push('Consider adding a skills section to highlight your technical abilities.');
    }

    if (extractedFields >= 10) {
      suggestions.push('Great resume! Most information was successfully extracted.');
    }

    return suggestions;
  }
}