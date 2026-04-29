import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const DEFAULT_STEPS = [
  {
    step: 1,
    stepName: 'profile',
    title: 'Complete Your Profile',
    description: 'Add your personal information and profile picture',
    status: 'pending'
  },
  {
    step: 2,
    stepName: 'payment',
    title: 'Set Up Payment',
    description: 'Add your payment method for subscriptions',
    status: 'pending'
  },
  {
    step: 3,
    stepName: 'shipping',
    title: 'Add Shipping Address',
    description: 'Configure your default shipping address',
    status: 'pending'
  },
  {
    step: 4,
    stepName: 'preferences',
    title: 'Set Preferences',
    description: 'Choose your notification and communication preferences',
    status: 'pending'
  }
];

export function useOnboarding() {
  const { user, token } = useAuthStore();
  const [steps, setSteps] = useState(DEFAULT_STEPS);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.onboardingSteps && user.onboardingSteps.length > 0) {
      const updatedSteps = DEFAULT_STEPS.map((step) => {
        const completedStep = user.onboardingSteps.find(s => s.stepName === step.stepName);
        return {
          ...step,
          status: completedStep?.completed ? 'completed' : 
                 completedStep?.skipped ? 'skipped' : 
                 step.status
        };
      });
      setSteps(updatedSteps);
      setIsComplete(updatedSteps.every(s => s.status === 'completed' || s.status === 'skipped'));
    }
    setLoading(false);
  }, [user]);

  const progress = Math.round(
    (steps.filter(s => s.status === 'completed' || s.status === 'skipped').length / steps.length) * 100
  );

  const completeStep = async (stepName, data = {}) => {
    try {
      await api.post(`/onboarding/steps/${stepName}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSteps(prev => prev.map(step => 
        step.stepName === stepName 
          ? { ...step, status: 'completed' }
          : step
      ));
      
      const allComplete = steps.every(s => 
        s.stepName === stepName 
          ? true 
          : s.status === 'completed' || s.status === 'skipped'
      );
      
      if (allComplete) {
        setIsComplete(true);
      }
      
      toast.success(`${stepName} step completed!`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to complete step');
      throw error;
    }
  };

  const skipStep = async (stepName) => {
    try {
      await api.post(`/onboarding/steps/${stepName}/skip`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSteps(prev => prev.map(step => 
        step.stepName === stepName 
          ? { ...step, status: 'skipped' }
          : step
      ));
      
      const allComplete = steps.every(s => 
        s.stepName === stepName 
          ? true 
          : s.status === 'completed' || s.status === 'skipped'
      );
      
      if (allComplete) {
        setIsComplete(true);
      }
      
      toast.success(`${stepName} step skipped`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to skip step');
      throw error;
    }
  };

  return {
    steps,
    completeStep,
    skipStep,
    progress,
    isComplete,
    loading
  };
}