/**
 * Permanent Gemini AI Configuration
 * This ensures Gemini is always available without requiring re-download
 */

export const GEMINI_CONFIG = {
  // Ensure Gemini API key is always available
  apiKey: process.env.GEMINI_API_KEY || '',
  
  // Model configuration for different use cases
  models: {
    // Fast model for form analysis and quick responses
    flash: 'gemini-2.5-flash',
    
    // Pro model for complex reasoning and cover letter generation
    pro: 'gemini-2.5-pro',
    
    // Experimental model for image generation
    imageGeneration: 'gemini-2.0-flash-preview-image-generation'
  },
  
  // Default configuration for all Gemini requests
  defaultConfig: {
    temperature: 0.7,
    maxOutputTokens: 2048,
    topP: 0.9,
    topK: 40
  },
  
  // Specific configurations for different tasks
  taskConfigs: {
    coverLetterGeneration: {
      model: 'gemini-2.5-pro',
      temperature: 0.8,
      maxOutputTokens: 1024,
      systemInstruction: `You are an expert career counselor and professional writer. 
      Generate compelling, personalized cover letters that highlight the candidate's 
      strengths and align with the job requirements. Keep the tone professional yet 
      engaging, and ensure the content is original and tailored to the specific role.`
    },
    
    resumeAnalysis: {
      model: 'gemini-2.5-pro',
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      systemInstruction: `You are an expert resume analyzer. Extract key information 
      from resumes and structure it into standardized job application fields. 
      Focus on accuracy and completeness. Return data in JSON format matching 
      the provided schema.`
    },
    
    formAnalysis: {
      model: 'gemini-2.5-flash',
      temperature: 0.2,
      maxOutputTokens: 1024,
      systemInstruction: `You are an expert at analyzing web forms and determining 
      the best values to fill in for job applications. Provide safe, professional 
      responses that maximize application success while being truthful.`
    },
    
    questionAnswering: {
      model: 'gemini-2.5-flash',
      temperature: 0.5,
      maxOutputTokens: 512,
      systemInstruction: `You are helping with job application questions. 
      Provide professional, honest answers that present the candidate in the 
      best possible light while being truthful and appropriate.`
    }
  },
  
  // Error handling and retry configuration
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2
  },
  
  // Safety settings for all models
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ]
};

// Validation function to ensure Gemini is properly configured
export function validateGeminiConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!GEMINI_CONFIG.apiKey) {
    errors.push('GEMINI_API_KEY environment variable is not set');
  }
  
  if (GEMINI_CONFIG.apiKey && GEMINI_CONFIG.apiKey.length < 10) {
    errors.push('GEMINI_API_KEY appears to be invalid (too short)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper function to get task-specific configuration
export function getTaskConfig(task: keyof typeof GEMINI_CONFIG.taskConfigs) {
  return {
    ...GEMINI_CONFIG.defaultConfig,
    ...GEMINI_CONFIG.taskConfigs[task]
  };
}

// Test connection function
export async function testGeminiConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_CONFIG.apiKey });
    
    // Simple test request
    const response = await ai.models.generateContent({
      model: GEMINI_CONFIG.models.flash,
      contents: 'Test connection. Respond with "Connected" only.',
    });
    
    if (response.text?.includes('Connected')) {
      return { success: true };
    } else {
      return { success: false, error: 'Unexpected response from Gemini API' };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error testing Gemini connection'
    };
  }
}