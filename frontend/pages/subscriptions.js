import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { subscriptionAPI, orderAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const { data } = await subscriptionAPI.getAll();
      setSubscriptions(data.subscriptions || []);
    } catch (error) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;

    try {
      await subscriptionAPI.cancel(id, false);
      toast.success('Subscription canceled');
      fetchSubscriptions();
    } catch (error) {
      toast.error('Failed to cancel subscription');
    }
  };

  const handlePause = async (id) => {
    try {
      await subscriptionAPI.pause(id);
      toast.success('Subscription paused');
      fetchSubscriptions();
    } catch (error) {
      toast.error('Failed to pause subscription');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              <span className="mx-2 text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Subscriptions</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Subscriptions</h1>
          <Link href="/plans" className="btn-primary">
            Browse Plans
          </Link>
        </div>

        {subscriptions.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">You don&apos;t have any active subscriptions</p>
            <Link href="/plans" className="btn-primary inline-block">
              View Available Plans
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{subscription.plan?.name}</h3>
                    <p className="text-sm text-gray-500">
                      {subscription.plan?.billingInterval === 'month' ? 'Monthly' : 'Yearly'} subscription
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(subscription.plan?.price || 0)}
                    </p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                      subscription.status === 'trialing' ? 'bg-blue-100 text-blue-700' :
                      subscription.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {subscription.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      Current period: {new Date(subscription.currentPeriodStart).toLocaleDateString()} - {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </div>

                  {subscription.status === 'active' && (
                    <div className="flex items-center space-x-3 mt-4">
                      <button
                        onClick={() => handlePause(subscription.id)}
                        className="btn-secondary text-sm"
                      >
                        Pause
                      </button>
                      <button
                        onClick={() => handleCancel(subscription.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}