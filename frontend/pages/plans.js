import { useState } from 'react';
import { subscriptionAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

const FEATURES = [
  'Multi-step onboarding flow',
  'Customer dashboard',
  'Subscription management',
  'Order tracking',
  'Customer messaging',
  'Stripe billing integration',
  'Twilio SMS notifications',
  'SendGrid email campaigns',
  'Voice AI integration',
  'Fulfillment API integration',
  'Multi-tenant SaaS',
  'Admin/analytics dashboard',
  'CRM integration',
  'AWS infrastructure',
  'Encrypted data storage'
];

export default function PlansPage() {
  const [plans] = useState([
    {
      id: 'basic',
      name: 'Basic',
      price: 29,
      description: 'Perfect for small businesses getting started',
      features: FEATURES.slice(0, 6)
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 79,
      description: 'For growing businesses with advanced needs',
      features: FEATURES.slice(0, 11)
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 199,
      description: 'Full-featured platform for large scale operations',
      features: FEATURES
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (planId) => {
    setLoading(true);
    try {
      await subscriptionAPI.create(planId);
      toast.success('Subscription created successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600">Start your 14-day free trial. No credit card required.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.id} className="card relative">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
                <p className="text-gray-600 mt-2">{plan.description}</p>
              </div>

              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-gray-900">{formatCurrency(plan.price)}</span>
                <span className="text-gray-600">/month</span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Processing...' : `Start ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Need a custom solution?{' '}
            <a href="/contact" className="text-primary-600 hover:text-primary-500">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}