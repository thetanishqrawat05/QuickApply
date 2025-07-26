export function detectJobPlatform(url: string): string {
  if (url.includes('greenhouse.io')) return 'Greenhouse';
  if (url.includes('lever.co')) return 'Lever';
  if (url.includes('workday.com')) return 'Workday';
  if (url.includes('bamboohr.com')) return 'BambooHR';
  if (url.includes('smartrecruiters.com')) return 'SmartRecruiters';
  if (url.includes('jobvite.com')) return 'Jobvite';
  if (url.includes('icims.com')) return 'iCIMS';
  if (url.includes('taleo.net')) return 'Taleo';
  if (url.includes('successfactors.com')) return 'SuccessFactors';
  if (url.includes('myworkdayjobs.com')) return 'Workday';
  return 'Unknown Platform';
}

export function isPlatformSupported(platform: string): boolean {
  const supportedPlatforms = [
    'Greenhouse',
    'Lever',
    'Workday',
    'BambooHR',
    'SmartRecruiters'
  ];
  return supportedPlatforms.includes(platform);
}

export function getPlatformInfo(platform: string) {
  const platformData = {
    'Greenhouse': {
      name: 'Greenhouse',
      color: 'green',
      automationReliability: 'high',
      commonFields: ['name', 'email', 'phone', 'resume', 'cover_letter']
    },
    'Lever': {
      name: 'Lever',
      color: 'blue',
      automationReliability: 'high',
      commonFields: ['name', 'email', 'phone', 'resume']
    },
    'Workday': {
      name: 'Workday',
      color: 'orange',
      automationReliability: 'medium',
      commonFields: ['name', 'email', 'phone', 'resume', 'address']
    },
    'BambooHR': {
      name: 'BambooHR',
      color: 'purple',
      automationReliability: 'medium',
      commonFields: ['name', 'email', 'phone', 'resume']
    },
    'SmartRecruiters': {
      name: 'SmartRecruiters',
      color: 'indigo',
      automationReliability: 'medium',
      commonFields: ['name', 'email', 'phone', 'resume', 'linkedin']
    }
  };

  return platformData[platform as keyof typeof platformData] || {
    name: platform,
    color: 'gray',
    automationReliability: 'unknown',
    commonFields: ['name', 'email', 'phone', 'resume']
  };
}
