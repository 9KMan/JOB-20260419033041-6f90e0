import Head from 'next/head';
import { useAuthStore } from '@/store';
import { subscriptionAPI, orderAPI, messageAPI, onboardingAPI } from '@/lib/api';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    activeSubscriptions: 0,
    totalOrders: 0,
    unreadMessages: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subscriptions, orders, rooms, onboarding] = await Promise.all([
          subscriptionAPI.getAll().catch(() => ({ data: { subscriptions: [] } })),
          orderAPI.getAll({ limit: 5 }).catch(() => ({ data: { orders: [] } })),
          messageAPI.getRooms().catch(() => ({ data: { rooms: [] } })),
          onboardingAPI.getStatus().catch(() => ({ data: null }))
        ]);

        setStats({
          activeSubscriptions: subscriptions.data.subscriptions?.length || 0,
          totalOrders: orders.data.orders?.length || 0,
          unreadMessages: rooms.data.rooms?.filter(r => r.status === 'open').length || 0
        });
        setRecentOrders(orders.data.orders || []);
        setOnboardingStatus(onboarding.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Dashboard | DTC Subscription Platform</title>
      </Head>

      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">DTC Platform</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/messages" className="text-gray-600 hover:text-gray-900">
                Messages
              </Link>
              <Link href="/settings" className="text-gray-600 hover:text-gray-900">
                Settings
              </Link>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{user?.firstName}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {onboardingStatus && !onboardingStatus.isComplete && (
          <div className="card mb-6 bg-primary-50 border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-primary-900">Complete Your Setup</h3>
                <p className="text-primary-700">Progress: {onboardingStatus.progress}%</p>
                <div className="mt-2 w-64 h-2 bg-primary-200 rounded-full">
                  <div
                    className="h-2 bg-primary-600 rounded-full transition-all"
                    style={{ width: `${onboardingStatus.progress}%` }}
                  />
                </div>
              </div>
              <Link href="/onboarding" className="btn-primary">
                Continue Setup
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Subscriptions</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeSubscriptions}</p>
              </div>
              <div className="p-3 bg-primary-100 rounded-full">
                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <Link href="/subscriptions" className="text-primary-600 text-sm mt-4 inline-block hover:text-primary-500">
              View all subscriptions
            </Link>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <Link href="/orders" className="text-primary-600 text-sm mt-4 inline-block hover:text-primary-500">
              View order history
            </Link>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Support Tickets</p>
                <p className="text-3xl font-bold text-gray-900">{stats.unreadMessages}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            </div>
            <Link href="/messages" className="text-primary-600 text-sm mt-4 inline-block hover:text-primary-500">
              View messages
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
            <Link href="/orders" className="text-primary-600 hover:text-primary-500">
              View all
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No orders yet</p>
              <Link href="/plans" className="btn-primary mt-4 inline-block">
                Browse Plans
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(order.total)}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}