'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { butcherApi, api, ButcherDto } from '@/lib/api';

interface Availability {
  id: string;
  butcherId: string;
  date: string;
  status: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE';
  note?: string;
}

export default function ButcherDetailPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const butcherId = params.id as string;

  const [butcher, setButcher] = useState<ButcherDto | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showUnlockTooltip, setShowUnlockTooltip] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!isLoading && user && butcherId) {
      loadButcher();
    }
  }, [user, isLoading, butcherId, router]);

  const loadButcher = async () => {
    setLoading(true);
    const [butcherRes, availRes] = await Promise.all([
      butcherApi.getById(butcherId),
      api.get<Availability[]>(`/butchers/${butcherId}/availability`),
    ]);
    if (butcherRes.data) {
      setButcher(butcherRes.data);
    }
    if (availRes.data) {
      setAvailability(availRes.data);
    }
    setLoading(false);
  };

  const handleUnlock = async () => {
    if (!butcher) return;
    setUnlocking(true);
    try {
      const response = await butcherApi.unlock(butcherId);
      if (response.data) {
        setButcher(response.data);
      } else if (response.error) {
        // Redirect to packages page if no active subscription
        router.push('/packages');
      }
    } catch {
      // Redirect to packages page on any error
      router.push('/packages');
    } finally {
      setUnlocking(false);
    }
  };

  const handleFavorite = async () => {
    if (!butcher) return;
    try {
      if (isFavorite) {
        await butcherApi.removeFavorite(butcherId);
        setIsFavorite(false);
      } else {
        await butcherApi.addFavorite(butcherId);
        setIsFavorite(true);
      }
    } catch {
      // ignore
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!butcher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">কসাই পাওয়া যায়নি</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Header */}
      <div className="bg-primary text-white py-4 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-2xl">←</button>
          <h1 className="text-xl font-bold">কসাই প্রোফাইল</h1>
        </div>
        <button onClick={handleFavorite} className="text-2xl">
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile Card */}
        <div className="card">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              {butcher.photoUrl ? (
                <img src={butcher.photoUrl} alt={butcher.name || ''} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-4xl">👤</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{butcher.name || 'কসাই'}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                  butcher.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {butcher.status === 'APPROVED' ? 'যাচাইকৃত' : 'পেন্ডিং'}
                </span>
                <span
                  className="flex items-center gap-1 text-sm text-orange-600 cursor-pointer relative"
                  onClick={() => setShowUnlockTooltip(!showUnlockTooltip)}
                >
                  <span>👁</span>
                  <span>{butcher.unlockCount || 0}/{butcher.unlockLimit || '∞'}</span>
                  {showUnlockTooltip && (
                    <div className="absolute top-full left-0 mt-1 bg-gray-800 text-white text-xs px-3 py-2 rounded whitespace-nowrap z-10 shadow-lg">
                      {butcher.unlockLimit || '∞'} জনের মধ্যে {butcher.unlockCount || 0} জন কল করেছে
                    </div>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Service Areas */}
        {butcher.thanas && butcher.thanas.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">সেবা এলাকা</h3>
            <div className="flex flex-wrap gap-2">
              {butcher.thanas.map((thana) => (
                <span key={thana.id} className="px-3 py-1 bg-primary-light text-primary rounded-full text-sm">
                  {thana.nameBn}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">মূল্য তালিকা</h3>
          <div className="space-y-3">
            {butcher.cowPrice && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🐄</span>
                  <div>
                    <p className="font-medium text-gray-800">গরু</p>
                    <p className="text-sm text-gray-500">
                      সর্বোচ্চ {butcher.cowCapacity || '-'}টি
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    {butcher.cowPriceType === 'PERCENTAGE' ? `${butcher.cowPrice}%` : `৳${butcher.cowPrice}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {butcher.cowPriceType === 'PER_KG' ? 'প্রতি কেজি' : butcher.cowPriceType === 'PERCENTAGE' ? 'পশুর দামের' : 'প্রতি পশু'}
                  </p>
                </div>
              </div>
            )}
            {butcher.goatPrice && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🐐</span>
                  <div>
                    <p className="font-medium text-gray-800">ছাগল</p>
                    <p className="text-sm text-gray-500">
                      সর্বোচ্চ {butcher.goatCapacity || '-'}টি
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    {butcher.goatPriceType === 'PERCENTAGE' ? `${butcher.goatPrice}%` : `৳${butcher.goatPrice}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {butcher.goatPriceType === 'PER_KG' ? 'প্রতি কেজি' : butcher.goatPriceType === 'PERCENTAGE' ? 'পশুর দামের' : 'প্রতি পশু'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Availability Section */}
        {availability.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">📅 উপলব্ধতা</h3>
            <div className="flex flex-wrap gap-2">
              {availability.map((a) => {
                const statusColor = a.status === 'AVAILABLE' ? 'bg-green-100 text-green-700 border-green-200'
                  : a.status === 'BOOKED' ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                  : 'bg-red-100 text-red-700 border-red-200';
                const statusLabel = a.status === 'AVAILABLE' ? 'উপলব্ধ'
                  : a.status === 'BOOKED' ? 'বুকড'
                  : 'অনুপলব্ধ';
                return (
                  <div key={a.id} className={`px-3 py-2 rounded-lg border ${statusColor}`}>
                    <p className="text-sm font-medium">{a.note || 'দিন'}</p>
                    <p className="text-xs mt-1">{statusLabel}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contact Section */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">যোগাযোগ</h3>
          {butcher.contactUnlocked ? (
            <div className="space-y-3">
              {butcher.phone && (
                <a href={`tel:${butcher.phone}`} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <span className="text-2xl">📞</span>
                  <div>
                    <p className="text-sm text-gray-500">ফোন নম্বর</p>
                    <p className="font-bold text-green-700">{butcher.phone}</p>
                  </div>
                </a>
              )}
              {butcher.whatsapp && (
                <a href={`https://wa.me/88${butcher.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <span className="text-2xl">💬</span>
                  <div>
                    <p className="text-sm text-gray-500">WhatsApp</p>
                    <p className="font-bold text-green-700">{butcher.whatsapp}</p>
                  </div>
                </a>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4">যোগাযোগের তথ্য দেখতে আনলক করুন</p>
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                className="btn-primary"
              >
                {unlocking ? 'আনলক করা হচ্ছে...' : '🔓 নম্বর আনলক করুন'}
              </button>
              <p className="text-xs text-gray-400 mt-2">
                আনলক করতে সক্রিয় প্যাকেজ প্রয়োজন
              </p>
            </div>
          )}
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
