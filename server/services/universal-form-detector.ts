import { Page } from 'playwright';
import { ComprehensiveProfile } from '../../shared/schema';

export interface UniversalFormField {
  element: any;
  type: 'text' | 'email' | 'tel' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'date' | 'file';
  label: string;
  name: string;
  required: boolean;
  value: string;
  confidence: number;
}

export class UniversalFormDetector {
  
  /**
   * Comprehensive form field detection for all major ATS systems
   * Based on research of Workday, Greenhouse, Lever, BambooHR, and 50+ other platforms
   */
  async detectAllFormFields(page: Page): Promise<UniversalFormField[]> {
    console.log('🔍 Starting universal form field detection...');
    
    const detectedFields: UniversalFormField[] = [];
    
    // Detect all major field types with extensive selectors
    await this.detectTextFields(page, detectedFields);
    await this.detectSelectFields(page, detectedFields);
    await this.detectRadioFields(page, detectedFields);
    await this.detectCheckboxFields(page, detectedFields);
    await this.detectFileFields(page, detectedFields);
    await this.detectDateFields(page, detectedFields);
    
    console.log(`✅ Detected ${detectedFields.length} form fields`);
    return detectedFields.sort((a, b) => b.confidence - a.confidence);
  }

  private async detectTextFields(page: Page, fields: UniversalFormField[]): Promise<void> {
    const textSelectors = [
      // Standard input fields
      'input[type="text"]', 'input[type="email"]', 'input[type="tel"]', 'input[type="url"]',
      'input[type="number"]', 'input[type="password"]', 'textarea',
      
      // Common name patterns for text fields
      'input[name*="name" i]', 'input[name*="address" i]', 'input[name*="city" i]',
      'input[name*="state" i]', 'input[name*="zip" i]', 'input[name*="postal" i]',
      'input[name*="phone" i]', 'input[name*="email" i]', 'input[name*="website" i]',
      'input[name*="linkedin" i]', 'input[name*="portfolio" i]', 'input[name*="github" i]',
      'input[name*="salary" i]', 'input[name*="compensation" i]', 'input[name*="title" i]',
      'input[name*="company" i]', 'input[name*="school" i]', 'input[name*="university" i]',
      'input[name*="degree" i]', 'input[name*="major" i]', 'input[name*="gpa" i]',
      'input[name*="experience" i]', 'input[name*="skills" i]', 'input[name*="reference" i]',
      
      // ID patterns
      'input[id*="name" i]', 'input[id*="address" i]', 'input[id*="contact" i]',
      'input[id*="profile" i]', 'input[id*="personal" i]',
      
      // Placeholder patterns
      'input[placeholder*="name" i]', 'input[placeholder*="address" i]',
      'input[placeholder*="phone" i]', 'input[placeholder*="email" i]',
      
      // ATS-specific selectors
      'input[data-automation-id]', 'input[data-test-id]', 'input[data-testid]',
      'input[class*="text-input" i]', 'input[class*="form-control" i]',
      'input[class*="input-field" i]', 'input[class*="form-field" i]',
      
      // Workday specific
      'input[data-automation-id*="textInputWidget"]',
      'input[data-automation-id*="formField"]',
      
      // Greenhouse specific
      'input[id^="job_application_"]',
      'input[name^="job_application["]',
      
      // Lever specific
      'input[name^="cards["]',
      'input[class*="application-question"]',
      
      // Generic form inputs that might be missed
      'input:not([type]):not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
      'input[type=""]:not([type="hidden"])'
    ];

    for (const selector of textSelectors) {
      await this.processFieldsBySelector(page, selector, 'text', fields);
    }
  }

  private async detectSelectFields(page: Page, fields: UniversalFormField[]): Promise<void> {
    const selectSelectors = [
      'select', 'select[name]', 'select[id]',
      
      // Common dropdown patterns
      'select[name*="country" i]', 'select[name*="state" i]', 'select[name*="province" i]',
      'select[name*="education" i]', 'select[name*="degree" i]', 'select[name*="experience" i]',
      'select[name*="authorization" i]', 'select[name*="visa" i]', 'select[name*="work" i]',
      'select[name*="employment" i]', 'select[name*="status" i]', 'select[name*="type" i]',
      'select[name*="position" i]', 'select[name*="level" i]', 'select[name*="department" i]',
      'select[name*="location" i]', 'select[name*="office" i]', 'select[name*="team" i]',
      'select[name*="start" i]', 'select[name*="available" i]', 'select[name*="notice" i]',
      'select[name*="salary" i]', 'select[name*="compensation" i]', 'select[name*="range" i]',
      'select[name*="currency" i]', 'select[name*="frequency" i]',
      'select[name*="gender" i]', 'select[name*="race" i]', 'select[name*="ethnicity" i]',
      'select[name*="veteran" i]', 'select[name*="disability" i]', 'select[name*="diversity" i]',
      'select[name*="source" i]', 'select[name*="referral" i]', 'select[name*="heard" i]',
      
      // Custom dropdown components (React Select, etc.)
      '[role="combobox"]', '[role="listbox"]', 
      '.select-control', '.dropdown-toggle', '.select-trigger',
      '[data-testid*="select"]', '[data-automation-id*="dropdown"]',
      
      // ATS-specific dropdown patterns
      'div[data-automation-id*="dropDown"]',
      'div[class*="select-input"]',
      'div[class*="dropdown-input"]'
    ];

    for (const selector of selectSelectors) {
      await this.processFieldsBySelector(page, selector, 'select', fields);
    }
  }

  private async detectRadioFields(page: Page, fields: UniversalFormField[]): Promise<void> {
    const radioSelectors = [
      'input[type="radio"]',
      
      // Group by common question patterns
      'input[type="radio"][name*="gender" i]',
      'input[type="radio"][name*="race" i]',
      'input[type="radio"][name*="ethnicity" i]',
      'input[type="radio"][name*="veteran" i]',
      'input[type="radio"][name*="disability" i]',
      'input[type="radio"][name*="criminal" i]',
      'input[type="radio"][name*="background" i]',
      'input[type="radio"][name*="authorization" i]',
      'input[type="radio"][name*="eligible" i]',
      'input[type="radio"][name*="sponsorship" i]',
      'input[type="radio"][name*="visa" i]',
      'input[type="radio"][name*="employment" i]',
      'input[type="radio"][name*="worked" i]',
      'input[type="radio"][name*="employed" i]',
      'input[type="radio"][name*="relationship" i]',
      'input[type="radio"][name*="family" i]',
      'input[type="radio"][name*="relative" i]',
      'input[type="radio"][name*="willing" i]',
      'input[type="radio"][name*="available" i]',
      'input[type="radio"][name*="relocate" i]',
      'input[type="radio"][name*="travel" i]',
      'input[type="radio"][name*="remote" i]',
      'input[type="radio"][name*="onsite" i]',
      'input[type="radio"][name*="hybrid" i]'
    ];

    for (const selector of radioSelectors) {
      await this.processFieldsBySelector(page, selector, 'radio', fields);
    }
  }

  private async detectCheckboxFields(page: Page, fields: UniversalFormField[]): Promise<void> {
    const checkboxSelectors = [
      'input[type="checkbox"]',
      
      // Common checkbox patterns
      'input[type="checkbox"][name*="agree" i]',
      'input[type="checkbox"][name*="consent" i]',
      'input[type="checkbox"][name*="accept" i]',
      'input[type="checkbox"][name*="terms" i]',
      'input[type="checkbox"][name*="privacy" i]',
      'input[type="checkbox"][name*="policy" i]',
      'input[type="checkbox"][name*="subscribe" i]',
      'input[type="checkbox"][name*="newsletter" i]',
      'input[type="checkbox"][name*="communication" i]',
      'input[type="checkbox"][name*="marketing" i]',
      'input[type="checkbox"][name*="notification" i]',
      'input[type="checkbox"][name*="email" i]',
      'input[type="checkbox"][name*="sms" i]',
      'input[type="checkbox"][name*="phone" i]',
      'input[type="checkbox"][name*="contact" i]',
      'input[type="checkbox"][name*="update" i]',
      'input[type="checkbox"][name*="confirm" i]',
      'input[type="checkbox"][name*="verify" i]',
      'input[type="checkbox"][name*="certify" i]',
      'input[type="checkbox"][name*="acknowledge" i]',
      'input[type="checkbox"][name*="understand" i]',
      'input[type="checkbox"][name*="authorize" i]',
      'input[type="checkbox"][name*="permission" i]'
    ];

    for (const selector of checkboxSelectors) {
      await this.processFieldsBySelector(page, selector, 'checkbox', fields);
    }
  }

  private async detectFileFields(page: Page, fields: UniversalFormField[]): Promise<void> {
    const fileSelectors = [
      'input[type="file"]',
      
      // Common file upload patterns
      'input[type="file"][name*="resume" i]',
      'input[type="file"][name*="cv" i]',
      'input[type="file"][name*="cover" i]',
      'input[type="file"][name*="letter" i]',
      'input[type="file"][name*="document" i]',
      'input[type="file"][name*="attachment" i]',
      'input[type="file"][name*="upload" i]',
      'input[type="file"][name*="transcript" i]',
      'input[type="file"][name*="certificate" i]',
      'input[type="file"][name*="portfolio" i]',
      'input[type="file"][name*="reference" i]',
      'input[type="file"][name*="recommendation" i]',
      
      // File upload zones and components
      '[data-testid*="file-upload"]',
      '[data-automation-id*="fileUpload"]',
      '.file-upload', '.upload-zone', '.dropzone',
      '[accept*="pdf"]', '[accept*="doc"]', '[accept*="docx"]'
    ];

    for (const selector of fileSelectors) {
      await this.processFieldsBySelector(page, selector, 'file', fields);
    }
  }

  private async detectDateFields(page: Page, fields: UniversalFormField[]): Promise<void> {
    const dateSelectors = [
      'input[type="date"]',
      'input[type="datetime-local"]',
      'input[type="month"]',
      'input[type="week"]',
      
      // Date field patterns
      'input[name*="date" i]',
      'input[name*="start" i]',
      'input[name*="end" i]',
      'input[name*="graduation" i]',
      'input[name*="available" i]',
      'input[name*="birth" i]',
      'input[name*="dob" i]',
      'input[name*="expir" i]',
      'input[name*="valid" i]',
      
      // Date picker components
      '[data-testid*="date"]',
      '[data-automation-id*="date"]',
      '.date-picker', '.datepicker',
      '[placeholder*="mm/dd/yyyy" i]',
      '[placeholder*="dd/mm/yyyy" i]',
      '[placeholder*="yyyy-mm-dd" i]',
      '[placeholder*="select date" i]',
      '[placeholder*="date" i]'
    ];

    for (const selector of dateSelectors) {
      await this.processFieldsBySelector(page, selector, 'date', fields);
    }
  }

  private async processFieldsBySelector(
    page: Page, 
    selector: string, 
    fieldType: UniversalFormField['type'], 
    fields: UniversalFormField[]
  ): Promise<void> {
    try {
      const elements = await page.locator(selector).all();
      
      for (const element of elements) {
        try {
          if (await element.isVisible({ timeout: 1000 }) && await element.isEnabled()) {
            const field = await this.analyzeFormField(page, element, fieldType);
            if (field && !this.isDuplicateField(fields, field)) {
              fields.push(field);
            }
          }
        } catch (e) {
          // Continue to next element
        }
      }
    } catch (e) {
      // Continue to next selector
    }
  }

  private async analyzeFormField(
    page: Page, 
    element: any, 
    fieldType: UniversalFormField['type']
  ): Promise<UniversalFormField | null> {
    try {
      const name = await element.getAttribute('name') || await element.getAttribute('id') || '';
      const label = await this.extractFieldLabel(page, element);
      const required = await this.isFieldRequired(page, element);
      const value = await this.determineFieldValue(label, name, fieldType);
      const confidence = this.calculateConfidence(label, name, fieldType);
      
      if (confidence < 0.3) return null; // Skip low-confidence matches
      
      return {
        element,
        type: fieldType,
        label,
        name,
        required,
        value,
        confidence
      };
    } catch (e) {
      return null;
    }
  }

  private async extractFieldLabel(page: Page, element: any): Promise<string> {
    try {
      // Try multiple methods to find the label
      const labelMethods = [
        // Direct label association
        async () => {
          const id = await element.getAttribute('id');
          if (id) {
            const label = page.locator(`label[for="${id}"]`);
            return await label.textContent();
          }
          return null;
        },
        
        // Parent label
        async () => {
          const parentLabel = element.locator('..');
          if (await parentLabel.evaluate((el: Element) => el.tagName.toLowerCase() === 'label')) {
            return await parentLabel.textContent();
          }
          return null;
        },
        
        // Sibling label
        async () => {
          const siblingLabel = element.locator('+ label, ~ label').first();
          return await siblingLabel.textContent();
        },
        
        // Preceding text
        async () => {
          const parent = element.locator('..');
          const parentText = await parent.textContent() || '';
          return parentText.split('\n')[0].trim();
        },
        
        // Placeholder
        async () => {
          return await element.getAttribute('placeholder');
        },
        
        // Aria-label
        async () => {
          return await element.getAttribute('aria-label');
        },
        
        // Title
        async () => {
          return await element.getAttribute('title');
        },
        
        // Data attributes
        async () => {
          const dataLabel = await element.getAttribute('data-label');
          if (dataLabel) return dataLabel;
          
          const dataTestId = await element.getAttribute('data-testid');
          if (dataTestId) return dataTestId.replace(/[-_]/g, ' ');
          
          return null;
        }
      ];
      
      for (const method of labelMethods) {
        try {
          const result = await method();
          if (result && result.trim().length > 0) {
            return result.trim();
          }
        } catch (e) {
          // Continue to next method
        }
      }
      
      // Fallback: use name attribute
      const name = await element.getAttribute('name') || await element.getAttribute('id') || '';
      return name.replace(/[-_]/g, ' ').toLowerCase();
      
    } catch (e) {
      return '';
    }
  }

  private async isFieldRequired(page: Page, element: any): Promise<boolean> {
    try {
      // Check required attribute
      const required = await element.getAttribute('required');
      if (required !== null) return true;
      
      // Check aria-required
      const ariaRequired = await element.getAttribute('aria-required');
      if (ariaRequired === 'true') return true;
      
      // Check for required indicators in nearby text
      const parent = element.locator('..');
      const parentText = await parent.textContent() || '';
      
      return parentText.includes('*') || 
             parentText.toLowerCase().includes('required') ||
             parentText.toLowerCase().includes('mandatory');
    } catch (e) {
      return false;
    }
  }

  private determineFieldValue(label: string, name: string, fieldType: UniversalFormField['type']): string {
    const lowerLabel = label.toLowerCase();
    const lowerName = name.toLowerCase();
    
    // Return appropriate values based on field context
    if (fieldType === 'radio') {
      return this.getRadioButtonValue(lowerLabel + ' ' + lowerName);
    }
    
    if (fieldType === 'checkbox') {
      return this.getCheckboxValue(lowerLabel + ' ' + lowerName);
    }
    
    if (fieldType === 'select') {
      return this.getSelectValue(lowerLabel + ' ' + lowerName);
    }
    
    if (fieldType === 'date') {
      return this.getDateValue(lowerLabel + ' ' + lowerName);
    }
    
    // For text fields, return empty - will be filled by profile data
    return '';
  }

  private getRadioButtonValue(context: string): string {
    // Work authorization questions
    if (context.includes('eligible') || context.includes('authorized') || context.includes('legal')) {
      return 'Yes';
    }
    
    // Employment history questions
    if (context.includes('employed') || context.includes('worked') || context.includes('relationship')) {
      return 'No';
    }
    
    // Sponsorship questions
    if (context.includes('sponsorship') || context.includes('visa')) {
      return 'No';
    }
    
    // Background questions
    if (context.includes('criminal') || context.includes('convicted')) {
      return 'No';
    }
    
    // Default preference questions
    if (context.includes('willing') || context.includes('available') || context.includes('interested')) {
      return 'Yes';
    }
    
    return 'No'; // Safe default
  }

  private getCheckboxValue(context: string): string {
    // Consent and agreement checkboxes should be checked if required
    if (context.includes('agree') || context.includes('consent') || context.includes('accept')) {
      return 'true';
    }
    
    // Communication preferences - default to false unless essential
    if (context.includes('marketing') || context.includes('newsletter') || context.includes('promotional')) {
      return 'false';
    }
    
    return 'true'; // Default to checked for most cases
  }

  private getSelectValue(context: string): string {
    if (context.includes('country')) return 'United States';
    if (context.includes('state') || context.includes('province')) return 'CA';
    if (context.includes('education') || context.includes('degree')) return 'Bachelor\'s Degree';
    if (context.includes('experience')) return '3-5 years';
    if (context.includes('authorization')) return 'US Citizen';
    if (context.includes('gender')) return 'Prefer not to say';
    if (context.includes('race') || context.includes('ethnicity')) return 'Prefer not to say';
    if (context.includes('veteran')) return 'Not a veteran';
    if (context.includes('disability')) return 'No';
    
    return ''; // Will be determined during filling
  }

  private getDateValue(context: string): string {
    if (context.includes('start') || context.includes('available')) {
      // 2 weeks from now
      const date = new Date();
      date.setDate(date.getDate() + 14);
      return date.toISOString().split('T')[0];
    }
    
    if (context.includes('graduation')) {
      return '2020-05-15'; // Generic graduation date
    }
    
    return ''; // Will be determined during filling
  }

  private calculateConfidence(label: string, name: string, fieldType: UniversalFormField['type']): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence for clear field indicators
    const combinedText = (label + ' ' + name).toLowerCase();
    
    if (fieldType === 'text') {
      if (combinedText.includes('name')) confidence += 0.3;
      if (combinedText.includes('email')) confidence += 0.3;
      if (combinedText.includes('phone')) confidence += 0.3;
      if (combinedText.includes('address')) confidence += 0.2;
    }
    
    if (fieldType === 'select') {
      if (combinedText.includes('select') || combinedText.includes('choose')) confidence += 0.2;
      if (combinedText.includes('dropdown')) confidence += 0.2;
    }
    
    if (fieldType === 'radio') {
      if (combinedText.includes('yes') || combinedText.includes('no')) confidence += 0.3;
      if (combinedText.includes('?')) confidence += 0.2;
    }
    
    // Reduce confidence for generic or unclear fields
    if (label.length < 3) confidence -= 0.2;
    if (!name && !label) confidence -= 0.4;
    
    return Math.max(0, Math.min(1, confidence));
  }

  private isDuplicateField(fields: UniversalFormField[], newField: UniversalFormField): boolean {
    return fields.some(existing => 
      existing.name === newField.name || 
      (existing.label === newField.label && existing.type === newField.type)
    );
  }

  /**
   * Fill detected fields with profile data
   */
  async fillDetectedFields(
    page: Page, 
    fields: UniversalFormField[], 
    profile: ComprehensiveProfile
  ): Promise<Record<string, any>> {
    console.log(`🚀 Filling ${fields.length} detected form fields...`);
    
    const filledData: Record<string, any> = {};
    const profileMapping = this.createProfileMapping(profile);
    
    for (const field of fields) {
      try {
        const value = this.getValueForField(field, profileMapping);
        
        if (value) {
          await this.fillSingleField(field, value);
          filledData[field.name || field.label] = value;
          console.log(`✅ Filled ${field.type} field: ${field.label} = ${value}`);
        }
      } catch (e) {
        console.log(`⚠️ Failed to fill field: ${field.label}`);
      }
    }
    
    console.log(`✅ Successfully filled ${Object.keys(filledData).length} fields`);
    return filledData;
  }

  private createProfileMapping(profile: ComprehensiveProfile): Record<string, string> {
    return {
      // Basic info
      'first_name': profile.name.split(' ')[0] || '',
      'last_name': profile.name.split(' ').slice(1).join(' ') || '',
      'full_name': profile.name || '',
      'email': profile.email || '',
      'phone': profile.phone || '',
      'address': profile.address || '',
      'city': profile.city || '',
      'state': profile.state || '',
      'zip': profile.zipCode || '',
      'country': profile.country || 'United States',
      
      // Professional
      'current_title': profile.currentTitle || '',
      'current_company': profile.currentCompany || '',
      'experience': profile.yearsOfExperience || '',
      'salary': profile.desiredSalary || '',
      
      // Education
      'degree': profile.highestDegree || '',
      'university': profile.university || '',
      'major': profile.major || '',
      'graduation_year': profile.graduationYear || '',
      'gpa': profile.gpa || '',
      
      // Work authorization
      'work_authorization': profile.workAuthorization || 'us_citizen',
      'sponsorship': profile.requiresSponsorship ? 'Yes' : 'No',
      
      // Other
      'start_date': profile.availableStartDate || 'Immediately',
      'linkedin': profile.linkedinProfile || '',
      'website': profile.website || '',
      'portfolio': profile.portfolioUrl || ''
    };
  }

  private getValueForField(field: UniversalFormField, profileMapping: Record<string, string>): string {
    const context = (field.label + ' ' + field.name).toLowerCase();
    
    // Try to match with profile data first
    for (const [key, value] of Object.entries(profileMapping)) {
      if (context.includes(key.replace('_', ' ')) || context.includes(key)) {
        return value;
      }
    }
    
    // Use predetermined value from field analysis
    if (field.value) {
      return field.value;
    }
    
    // Fallback values for common fields
    return this.getFallbackValue(context, field.type);
  }

  private getFallbackValue(context: string, fieldType: string): string {
    if (fieldType === 'radio') {
      return this.getRadioButtonValue(context);
    }
    
    if (fieldType === 'checkbox') {
      return this.getCheckboxValue(context);
    }
    
    if (fieldType === 'select') {
      return this.getSelectValue(context);
    }
    
    if (fieldType === 'date') {
      return this.getDateValue(context);
    }
    
    return '';
  }

  private async fillSingleField(field: UniversalFormField, value: string): Promise<void> {
    try {
      if (field.type === 'radio') {
        // For radio buttons, find the option that matches the value
        const name = await field.element.getAttribute('name');
        if (name) {
          const radioOptions = await field.element.page().locator(`input[type="radio"][name="${name}"]`).all();
          
          for (const option of radioOptions) {
            const optionValue = await option.getAttribute('value') || '';
            const labelText = await this.getRadioLabelText(field.element.page(), option);
            
            if (this.doesValueMatch(value, optionValue, labelText)) {
              await option.check();
              return;
            }
          }
        }
      } else if (field.type === 'checkbox') {
        if (value === 'true' || value.toLowerCase() === 'yes') {
          await field.element.check();
        }
      } else if (field.type === 'select') {
        await this.selectOptionInDropdown(field.element, value);
      } else {
        // Text, email, tel, date, etc.
        await field.element.fill(value);
      }
    } catch (e) {
      console.log(`Failed to fill field: ${e}`);
    }
  }

  private async getRadioLabelText(page: Page, radio: any): Promise<string> {
    try {
      const id = await radio.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const labelText = await label.textContent();
        if (labelText) return labelText.trim();
      }
      
      const parentLabel = await radio.locator('..').textContent() || '';
      const siblingLabel = await radio.locator('~ label').textContent() || '';
      
      return (siblingLabel || parentLabel).trim();
    } catch (e) {
      return '';
    }
  }

  private doesValueMatch(targetValue: string, optionValue: string, labelText: string): boolean {
    const lowerTarget = targetValue.toLowerCase();
    const lowerOptionValue = optionValue.toLowerCase();
    const lowerLabel = labelText.toLowerCase();
    
    return lowerOptionValue.includes(lowerTarget) || 
           lowerLabel.includes(lowerTarget) ||
           lowerTarget.includes(lowerOptionValue) ||
           lowerTarget.includes(lowerLabel);
  }

  private async selectOptionInDropdown(field: any, value: string): Promise<void> {
    try {
      const tagName = await field.evaluate((el: Element) => el.tagName.toLowerCase());
      
      if (tagName === 'select') {
        const options = await field.locator('option').all();
        for (const option of options) {
          const optionText = await option.textContent() || '';
          const optionValue = await option.getAttribute('value') || '';
          
          if (optionText.includes(value) || optionValue.includes(value) || 
              value.includes(optionText) || value.includes(optionValue)) {
            await field.selectOption({ label: optionText });
            return;
          }
        }
        
        await field.selectOption({ value });
      } else {
        await field.fill(value);
      }
    } catch (error) {
      try {
        await field.fill(value);
      } catch (e) {
        console.log(`Failed to fill dropdown with value: ${value}`);
      }
    }
  }
}