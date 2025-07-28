import { AutoApplyWorkflow } from '@/components/auto-apply-workflow';

export default function AutoApplyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Auto Job Application Tool
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Streamline your job applications with our intelligent automation system. 
            Simply provide your details, upload your resume, and let our system handle 
            the application process with email approval and smart timing.
          </p>
        </div>

        <AutoApplyWorkflow />

        <div className="mt-12 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="p-6 bg-white rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Smart Automation</h3>
              <p className="text-gray-600 text-sm">
                Automatically detects and fills out application forms across major job platforms
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📧</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Email Review</h3>
              <p className="text-gray-600 text-sm">
                Get a preview email before submission with option to approve or let it auto-submit
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">60-Second Timer</h3>
              <p className="text-gray-600 text-sm">
                Applications automatically submit after 60 seconds unless manually approved first
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-2xl mx-auto">
            <p className="text-sm text-yellow-800">
              <strong>Supported Platforms:</strong> Greenhouse, Lever, Workday, BambooHR, SmartRecruiters, 
              Jobvite, iCIMS, and many company career sites. CAPTCHA handling and login assistance included.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}