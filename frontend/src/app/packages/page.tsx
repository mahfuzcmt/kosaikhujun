'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { packageApi, customerApi, PackageDto, SubscriptionDto } from '@/lib/api';
import {
  HomeIcon,
  HeartIcon,
  GiftIcon,
  UserIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { GiftIcon as GiftIconSolid } from '@heroicons/react/24/solid';

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
    if (!isLoading && user && user.userType === 'BUTCHER') {
      router.replace('/home');
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

        {packages.map((pkg, index) => {
          const isPopular = index === 1; // Mark second package as popular
          const gradients = [
            'from-blue-500 to-blue-600',
            'from-primary to-green-600',
            'from-purple-500 to-purple-600',
          ];
          const gradient = gradients[index % gradients.length];

          return (
            <div key={pkg.id} className={`card relative overflow-hidden ${isPopular ? 'ring-2 ring-primary' : ''}`}>
              {isPopular && (
                <div className="absolute top-0 right-0 bg-primary text-white text-xs px-3 py-1 rounded-bl-lg font-medium flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  জনপ্রিয়
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <GiftIconSolid className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-800">{pkg.nameBn}</h4>
                    <p className="text-sm text-gray-500">{pkg.descriptionBn || pkg.description}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-gray-800">৳{pkg.price}</span>
                </div>
                <p className="text-center text-sm text-gray-500 mt-1">একবারের পেমেন্ট</p>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircleIcon className="w-5 h-5 text-primary" />
                  <span>{pkg.contactLimit ? `${pkg.contactLimit}টি কসাইয়ের নম্বর দেখুন` : 'আনলিমিটেড কসাইয়ের নম্বর'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircleIcon className="w-5 h-5 text-primary" />
                  <span>ফোন ও WhatsApp নম্বর</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircleIcon className="w-5 h-5 text-primary" />
                  <span>তাৎক্ষণিক অ্যাক্সেস</span>
                </div>
              </div>

              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={purchasing === pkg.id}
                className={`w-full py-3 rounded-lg font-medium transition-all ${
                  purchasing === pkg.id
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : isPopular
                      ? 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/30'
                      : 'bg-gray-800 text-white hover:bg-gray-900'
                }`}
              >
                {purchasing === pkg.id ? 'প্রক্রিয়াধীন...' : 'এখনই কিনুন'}
              </button>
            </div>
          );
        })}

        <p className="text-center text-gray-500 text-sm">
          পেমেন্ট: bKash / Nagad / Rocket
        </p>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3">
        <NavItem icon={<HomeIcon className="w-6 h-6" />} label="হোম" onClick={() => router.push('/home')} />
        <NavItem icon={<HeartIcon className="w-6 h-6" />} label="পছন্দ" onClick={() => router.push('/favorites')} />
        <NavItem icon={<GiftIconSolid className="w-6 h-6" />} label="প্যাকেজ" active />
        <NavItem icon={<UserIcon className="w-6 h-6" />} label="প্রোফাইল" onClick={() => router.push('/profile')} />
      </nav>
    </main>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 ${active ? 'text-primary' : 'text-gray-500'}`}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}
