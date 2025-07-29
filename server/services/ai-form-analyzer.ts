import { Page } from 'playwright';
import { GeminiService } from './gemini-service';

export interface FormAnalysis {
  stepType: 'login' | 'profile' | 'experience' | 'education' | 'documents' | 'questions' | 'review' | 'submit';
  requiredFields: string[];
  formContext: string;
  nextAction: 'fill' | 'navigate' | 'submit';
  confidence: number;
  detectedButtons: string[];
  formComplexity: 'simple' | 'medium' | 'complex';
}

export class AIFormAnalyzer {
  private geminiService?: GeminiService;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.geminiService = new GeminiService();
    } else {
      console.log('GEMINI_API_KEY not found, using pattern matching only');
    }
  }

  async analyzeCurrentPage(page: Page): Promise<FormAnalysis> {
    console.log('🤖 Analyzing current page with AI...');
    
    try {
      // Extract page information
      const pageInfo = await this.extractPageInformation(page);
      
      // Use AI to analyze if available, otherwise use pattern matching
      if (this.geminiService) {
        return await this.aiAnalysis(pageInfo);
      } else {
        return await this.patternMatchingAnalysis(pageInfo);
      }
    } catch (error) {
      console.log('Form analysis error:', error);
      return this.getDefaultAnalysis();
    }
  }

  private async extractPageInformation(page: Page): Promise<{
    title: string;
    url: string;
    visibleText: string;
    formLabels: string[];
    inputTypes: string[];
    buttonTexts: string[];
    inputPlaceholders: string[];
  }> {
    const title = await page.title();
    const url = page.url();
    
    // Get visible text (first 2000 chars to avoid token limits)
    const visibleText = (await page.locator('body').textContent() || '').slice(0, 2000);
    
    // Get form labels
    const formLabels = await page.locator('label:visible').allTextContents();
    
    // Get input types
    const inputTypes = await page.locator('input:visible').evaluateAll(
      inputs => inputs.map(input => input.type).filter(Boolean)
    );
    
    // Get button texts
    const buttonTexts = await page.locator('button:visible, input[type="submit"]:visible').allTextContents();
    
    // Get input placeholders
    const inputPlaceholders = await page.locator('input:visible').evaluateAll(
      inputs => inputs.map(input => input.placeholder).filter(Boolean)
    );

    return {
      title,
      url,
      visibleText,
      formLabels,
      inputTypes,
      buttonTexts,
      inputPlaceholders
    };
  }

  private async aiAnalysis(pageInfo: any): Promise<FormAnalysis> {
    try {
      const prompt = `
Analyze this job application page and determine the current step and required actions:

Page Title: ${pageInfo.title}
URL: ${pageInfo.url}
Form Labels: ${pageInfo.formLabels.join(', ')}
Input Types: ${pageInfo.inputTypes.join(', ')}
Button Texts: ${pageInfo.buttonTexts.join(', ')}
Input Placeholders: ${pageInfo.inputPlaceholders.join(', ')}
Page Content: ${pageInfo.visibleText.slice(0, 500)}

Please respond with a JSON object containing:
{
  "stepType": "login|profile|experience|education|documents|questions|review|submit",
  "requiredFields": ["array", "of", "field", "names"],
  "nextAction": "fill|navigate|submit",
  "confidence": 0.95,
  "formComplexity": "simple|medium|complex"
}

Determine the step type based on content:
- login: Contains sign in, login, email/password fields
- profile: Contains personal info like name, email, phone, address
- experience: Contains work experience, employment history, skills
- education: Contains degree, university, education fields
- documents: Contains file upload, resume, CV upload
- questions: Contains custom questions, text areas for responses
- review: Contains summary, review your application
- submit: Contains submit application, final submission
`;

      // Use the existing GeminiService generateText method
      const response = await this.geminiService!.generateText(prompt);
      
      // Parse AI response
      const aiResult = JSON.parse(response);
      
      return {
        stepType: aiResult.stepType,
        requiredFields: aiResult.requiredFields || [],
        formContext: pageInfo.visibleText.slice(0, 500),
        nextAction: aiResult.nextAction,
        confidence: aiResult.confidence || 0.8,
        detectedButtons: pageInfo.buttonTexts,
        formComplexity: aiResult.formComplexity || 'medium'
      };
    } catch (error) {
      console.log('AI analysis failed, falling back to pattern matching');
      return await this.patternMatchingAnalysis(pageInfo);
    }
  }

  private async patternMatchingAnalysis(pageInfo: any): Promise<FormAnalysis> {
    const content = (
      pageInfo.title + ' ' + 
      pageInfo.visibleText + ' ' + 
      pageInfo.formLabels.join(' ') + ' ' + 
      pageInfo.buttonTexts.join(' ')
    ).toLowerCase();

    let stepType: FormAnalysis['stepType'] = 'profile';
    let requiredFields: string[] = [];
    let nextAction: FormAnalysis['nextAction'] = 'fill';
    let confidence = 0.7;

    // Determine step type based on content analysis
    if (content.includes('sign in') || content.includes('login') || content.includes('password')) {
      stepType = 'login';
      requiredFields = ['email', 'password'];
      nextAction = 'fill';
      confidence = 0.9;
    } else if (content.includes('profile') || content.includes('personal') || content.includes('contact') || 
               content.includes('first name') || content.includes('last name')) {
      stepType = 'profile';
      requiredFields = ['name', 'email', 'phone', 'address'];
      nextAction = 'fill';
      confidence = 0.85;
    } else if (content.includes('experience') || content.includes('work') || content.includes('employment') || 
               content.includes('skills') || content.includes('job history')) {
      stepType = 'experience';
      requiredFields = ['experience', 'skills', 'employment'];
      nextAction = 'fill';
      confidence = 0.8;
    } else if (content.includes('education') || content.includes('degree') || content.includes('university') || 
               content.includes('school')) {
      stepType = 'education';
      requiredFields = ['education', 'degree', 'school'];
      nextAction = 'fill';
      confidence = 0.8;
    } else if (content.includes('upload') || content.includes('resume') || content.includes('cv') || 
               content.includes('document')) {
      stepType = 'documents';
      requiredFields = ['resume', 'cover_letter'];
      nextAction = 'fill';
      confidence = 0.85;
    } else if (content.includes('question') || content.includes('tell us') || content.includes('describe') || 
               content.includes('why')) {
      stepType = 'questions';
      requiredFields = ['custom_responses'];
      nextAction = 'fill';
      confidence = 0.75;
    } else if (content.includes('review') || content.includes('summary') || content.includes('confirm')) {
      stepType = 'review';
      requiredFields = [];
      nextAction = 'navigate';
      confidence = 0.8;
    } else if (content.includes('submit') || content.includes('apply now') || content.includes('send application')) {
      stepType = 'submit';
      requiredFields = [];
      nextAction = 'submit';
      confidence = 0.9;
    }

    return {
      stepType,
      requiredFields,
      formContext: content.slice(0, 500),
      nextAction,
      confidence,
      detectedButtons: pageInfo.buttonTexts,
      formComplexity: this.determineComplexity(pageInfo)
    };
  }

  private determineComplexity(pageInfo: any): 'simple' | 'medium' | 'complex' {
    const formElementCount = pageInfo.formLabels.length + pageInfo.inputTypes.length;
    const buttonCount = pageInfo.buttonTexts.length;
    
    if (formElementCount <= 3 && buttonCount <= 2) {
      return 'simple';
    } else if (formElementCount <= 8 && buttonCount <= 5) {
      return 'medium';
    } else {
      return 'complex';
    }
  }

  private getDefaultAnalysis(): FormAnalysis {
    return {
      stepType: 'profile',
      requiredFields: ['name', 'email', 'phone'],
      formContext: '',
      nextAction: 'fill',
      confidence: 0.5,
      detectedButtons: [],
      formComplexity: 'medium'
    };
  }
}