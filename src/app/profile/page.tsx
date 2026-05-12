'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { customerApi, SubscriptionDto, ButcherDto } from '@/lib/api';

export default function ProfilePage() {
  const { user, isLoading, profile, logout } = useAuth();
  const router = useRouter();

  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [allSubscriptions, setAllSubscriptions] = useState<SubscriptionDto[]>([]);
  const [unlocked, setUnlocked] = useState<ButcherDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!isLoading && user) {
      loadData();
    }
  }, [user, isLoading, router]);

  const loadData = async () => {
    setLoading(true);
    const [subRes, allSubsRes, unlockedRes] = await Promise.all([
      customerApi.getSubscription(),
      customerApi.getAllSubscriptions(),
      customerApi.getUnlocked(),
    ]);
    if (subRes.data) setSubscription(subRes.data);
    if (allSubsRes.data) setAllSubscriptions(allSubsRes.data);
    if (unlockedRes.data) setUnlocked(unlockedRes.data);
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Header */}
      <div className="bg-primary text-white py-4 px-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-2xl">←</button>
        <h1 className="text-xl font-bold">প্রোফাইল</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* User Info */}
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center">
              <span className="text-3xl">👤</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{user?.name || 'ব্যবহারকারী'}</h2>
              <p className="text-gray-600">{user?.phone}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                user?.userType === 'BUTCHER' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {user?.userType === 'BUTCHER' ? 'কসাই' : 'গ্রাহক'}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Summary */}
        {user?.userType === 'CUSTOMER' && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">সাবস্ক্রিপশন</h3>
            {(() => {
              const activeSubscriptions = allSubscriptions.filter(s => s.status === 'ACTIVE');
              if (activeSubscriptions.length === 0) {
                return (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-3">কোনো সক্রিয় সাবস্ক্রিপশন নেই</p>
                    <button
                      onClick={() => router.push('/packages')}
                      className="bg-primary text-white px-4 py-2 rounded-lg"
                    >
                      প্যাকেজ কিনুন
                    </button>
                  </div>
                );
              }

              // Calculate totals from all active subscriptions
              const totalUsed = activeSubscriptions.reduce((sum, s) => sum + s.contactsUsed, 0);
              const totalLimit = activeSubscriptions.reduce((sum, s) => sum + (s.contactLimit || 0), 0);
              const hasUnlimited = activeSubscriptions.some(s => !s.contactLimit);
              const remaining = hasUnlimited ? '∞' : (totalLimit - totalUsed);

              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">সক্রিয় প্যাকেজ</span>
                    <span className="font-medium text-primary">{activeSubscriptions.length}টি</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">মোট কন্ট্যাক্ট লিমিট</span>
                    <span className="font-medium">{hasUnlimited ? '∞' : totalLimit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">ব্যবহৃত</span>
                    <span className="font-medium">{totalUsed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">বাকি আছে</span>
                    <span className="font-bold text-green-600">{remaining}</span>
                  </div>
                  <button
                    onClick={() => router.push('/packages')}
                    className="w-full mt-2 py-2 border-2 border-primary text-primary rounded-lg font-medium"
                  >
                    আরো প্যাকেজ কিনুন
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* Purchase History */}
        {user?.userType === 'CUSTOMER' && allSubscriptions.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">ক্রয়ের ইতিহাস</h3>
            <div className="space-y-3">
              {allSubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800">{sub.pkg?.nameBn}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(sub.purchasedAt).toLocaleDateString('bn-BD')}
                    </p>
                    <p className="text-xs text-gray-400">
                      ব্যবহৃত: {sub.contactsUsed}/{sub.contactLimit || '∞'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    sub.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {sub.status === 'ACTIVE' ? 'সক্রিয়' : 'শেষ'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unlocked Butchers */}
        {user?.userType === 'CUSTOMER' && unlocked.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">আনলক করা কসাই</h3>
            <div className="space-y-3">
              {unlocked.map((butcher) => (
                <div
                  key={butcher.id}
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer"
                  onClick={() => router.push(`/butcher/${butcher.id}`)}
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span>👤</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{butcher.name}</p>
                    <p className="text-sm text-gray-500">{butcher.phone}</p>
                  </div>
                  <span className="text-primary">→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Butcher Profile Info */}
        {user?.userType === 'BUTCHER' && (
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-800">কসাই প্রোফাইল</h3>
            <button
              onClick={() => router.push('/butcher/profile')}
              className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium"
            >
              ✏️ প্রোফাইল সম্পাদনা করুন
            </button>
            <button
              onClick={() => router.push('/butcher/availability')}
              className="w-full py-3 px-4 border-2 border-primary text-primary rounded-lg font-medium"
            >
              📅 উপলব্ধতা সেট করুন
            </button>
          </div>
        )}

        {/* Admin Panel Link */}
        {user?.userType === 'ADMIN' && (
          <div className="card">
            <button
              onClick={() => router.push('/admin')}
              className="w-full py-3 px-4 bg-purple-500 text-white rounded-lg font-medium"
            >
              🛠️ অ্যাডমিন প্যানেল
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-lg font-medium bg-red-50 text-red-600 border border-red-200"
          >
            লগআউট
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3">
        <NavItem icon="🏠" label="হোম" onClick={() => router.push('/home')} />
        {user?.userType !== 'BUTCHER' && (
          <NavItem icon="❤️" label="পছন্দ" onClick={() => router.push('/favorites')} />
        )}
        {user?.userType !== 'BUTCHER' && (
          <NavItem icon="📦" label="প্যাকেজ" onClick={() => router.push('/packages')} />
        )}
        <NavItem icon="👤" label="প্রোফাইল" active />
      </nav>
    </main>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${active ? 'text-primary' : 'text-gray-500'}`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs">{label}</span>
    </button>
  );
}
