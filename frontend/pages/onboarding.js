import { useState } from 'react';
import { useRouter } from 'next/router';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function OnboardingPage() {
  const router = useRouter();
  const { steps, completeStep, skipStep, progress, isComplete } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const handleComplete = async (stepName, data = {}) => {
    setLoading(true);
    try {
      await completeStep(stepName, data);
    } catch (error) {
      console.error('Error completing step:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">You&apos;re All Set!</h1>
          <p className="text-gray-600 mb-6">Your account is ready. Let&apos;s get started!</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentStep = steps?.find(s => s.status === 'pending' || s.status === 'in_progress');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Setup</h1>
          <p className="text-gray-600">Follow the steps to get started with your account</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-medium text-primary-600">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-primary-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {steps?.map((step) => (
            <div
              key={step.stepName}
              className={`card ${
                step.status === 'completed' ? 'border-green-200 bg-green-50' :
                step.status === 'pending' ? 'border-gray-200' : 'border-primary-200 bg-primary-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.status === 'completed' ? 'bg-green-100' :
                    step.status === 'skipped' ? 'bg-gray-100' : 'bg-primary-100'
                  }`}>
                    {step.status === 'completed' ? (
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium text-gray-600">{step.step}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{step.title || step.stepName}</h3>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
                {step.status === 'pending' && (
                  <button
                    onClick={() => handleComplete(step.stepName)}
                    disabled={loading}
                    className="btn-primary"
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}