'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { packageApi, customerApi, PackageDto, SubscriptionDto } from '@/lib/api';

export default function PackagesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [packages, setPackages] = useState<PackageDto[]>([]);
  const [currentSub, setCurrentSub] = useState<SubscriptionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);

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
    const [packagesRes, subRes] = await Promise.all([
      packageApi.getAll(),
      customerApi.getSubscription(),
    ]);

    if (packagesRes.data) {
      setPackages(packagesRes.data);
    }
    if (subRes.data) {
      setCurrentSub(subRes.data);
    }
    setLoading(false);
  };

  const handlePurchase = async (packageId: number) => {
    setPurchasing(packageId);
    try {
      const response = await packageApi.purchase(packageId);
      if (response.data && response.data.bkashURL) {
        // Store payment info for callback
        localStorage.setItem('pendingPayment', JSON.stringify({
          paymentId: response.data.paymentId,
          bkashPaymentId: response.data.bkashPaymentId,
        }));
        // Redirect to bKash payment page
        window.location.href = response.data.bkashURL;
      } else if (response.error) {
        alert(response.error.message);
        setPurchasing(null);
      }
    } catch {
      alert('পেমেন্ট শুরু করতে সমস্যা হয়েছে');
      setPurchasing(null);
    }
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
        <h1 className="text-xl font-bold">প্যাকেজ সমূহ</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Subscription */}
        {currentSub && (
          <div className="card bg-primary-light border-primary">
            <h3 className="font-semibold text-gray-800 mb-2">বর্তমান প্যাকেজ</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-bold text-primary">{currentSub.pkg?.nameBn}</p>
                <p className="text-sm text-gray-600">
                  ব্যবহৃত: {currentSub.contactsUsed}/{currentSub.contactLimit || '∞'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentSub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {currentSub.status === 'ACTIVE' ? 'সক্রিয়' : 'মেয়াদোত্তীর্ণ'}
              </span>
            </div>
          </div>
        )}

        {/* Packages */}
        <h3 className="font-semibold text-gray-800">প্যাকেজ কিনুন</h3>

        {packages.map((pkg) => (
          <div key={pkg.id} className="card">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-lg font-bold text-gray-800">{pkg.nameBn}</h4>
                <p className="text-sm text-gray-600">{pkg.descriptionBn || pkg.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">৳{pkg.price}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <span>📱</span>
              <span>{pkg.contactLimit ? `${pkg.contactLimit}টি কসাইয়ের নম্বর` : 'আনলিমিটেড কসাই'}</span>
            </div>

            <button
              onClick={() => handlePurchase(pkg.id)}
              disabled={purchasing === pkg.id}
              className={`w-full py-3 rounded-lg font-medium transition-all ${
                purchasing === pkg.id
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              {purchasing === pkg.id ? 'প্রক্রিয়াধীন...' : 'এখনই কিনুন'}
            </button>
          </div>
        ))}

        <p className="text-center text-gray-500 text-sm">
          পেমেন্ট: bKash / Nagad / Rocket
        </p>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3">
        <NavItem icon="🏠" label="হোম" onClick={() => router.push('/home')} />
        <NavItem icon="❤️" label="পছন্দ" onClick={() => router.push('/favorites')} />
        <NavItem icon="📦" label="প্যাকেজ" active />
        <NavItem icon="👤" label="প্রোফাইল" onClick={() => router.push('/profile')} />
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
