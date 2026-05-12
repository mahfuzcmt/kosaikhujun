'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { customerApi, butcherApi, ButcherDto } from '@/lib/api';

export default function FavoritesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [favorites, setFavorites] = useState<ButcherDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!isLoading && user) {
      loadFavorites();
    }
  }, [user, isLoading, router]);

  const loadFavorites = async () => {
    setLoading(true);
    const response = await customerApi.getFavorites();
    if (response.data) {
      setFavorites(response.data);
    }
    setLoading(false);
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
        <h1 className="text-xl font-bold">পছন্দের কসাই</h1>
      </div>

      <div className="p-4">
        {favorites.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <span className="text-4xl mb-4 block">❤️</span>
            <p>আপনার পছন্দের তালিকা খালি</p>
            <p className="text-sm mt-2">কসাইয়ের প্রোফাইলে গিয়ে হার্ট বাটনে ক্লিক করুন</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{favorites.length}টি পছন্দের কসাই</p>
            {favorites.map((butcher) => (
              <ButcherCard
                key={butcher.id}
                butcher={butcher}
                onClick={() => router.push(`/butcher/${butcher.id}`)}
                onUnlock={async () => {
                  const response = await butcherApi.unlock(butcher.id);
                  if (response.data) {
                    setFavorites(prev => prev.map(b =>
                      b.id === butcher.id ? response.data! : b
                    ));
                  } else {
                    router.push('/packages');
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3">
        <NavItem icon="🏠" label="হোম" onClick={() => router.push('/home')} />
        <NavItem icon="❤️" label="পছন্দ" active />
        <NavItem icon="📦" label="প্যাকেজ" onClick={() => router.push('/packages')} />
        <NavItem icon="👤" label="প্রোফাইল" onClick={() => router.push('/profile')} />
      </nav>
    </main>
  );
}

function ButcherCard({ butcher, onClick, onUnlock }: { butcher: ButcherDto; onClick: () => void; onUnlock: () => void }) {
  const maskPhone = (phone: string | undefined) => {
    if (!phone) return '01XXXXXXXX';
    return phone.substring(0, 2) + 'XXXXXXXX';
  };

  return (
    <div className="card">
      {/* Main info - clickable */}
      <div className="flex gap-4 cursor-pointer" onClick={onClick}>
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
          {butcher.photoUrl ? (
            <img src={butcher.photoUrl} alt={butcher.name || ''} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">👤</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-gray-800 truncate">{butcher.name || 'কসাই'}</h3>
            <span className="text-red-500 text-xl">❤️</span>
          </div>
          <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="text-primary">📍</span>
              {butcher.thanas && butcher.thanas.length > 0 ? butcher.thanas[0].nameBn : 'ঢাকা'}
            </span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1 text-orange-600">
              <span>👁</span>
              <span>{butcher.unlockCount || 0}/{butcher.unlockLimit || '∞'}</span>
            </span>
          </div>
          <div className="mt-1 text-sm space-y-0.5">
            {butcher.cowPrice && (
              <div className="flex items-center gap-1 text-gray-700">
                <span>🐄</span>
                <span>গরু: {butcher.cowPriceType === 'PERCENTAGE' ? `${butcher.cowPrice}%` : `৳${butcher.cowPrice}`}
                {butcher.cowPriceType === 'PER_KG' ? '/কেজি' : butcher.cowPriceType === 'PERCENTAGE' ? '' : ''}</span>
              </div>
            )}
            {butcher.goatPrice && (
              <div className="flex items-center gap-1 text-gray-700">
                <span>🐐</span>
                <span>ছাগল: {butcher.goatPriceType === 'PERCENTAGE' ? `${butcher.goatPrice}%` : `৳${butcher.goatPrice}`}
                {butcher.goatPriceType === 'PER_KG' ? '/কেজি' : butcher.goatPriceType === 'PERCENTAGE' ? '' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Phone & WhatsApp section */}
      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
        {/* Phone row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-primary text-lg">📞</span>
            <span className="text-gray-700 font-medium">
              {butcher.contactUnlocked && butcher.phone ? butcher.phone : maskPhone(butcher.phone)}
            </span>
          </div>
          {!butcher.contactUnlocked && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnlock(); }}
              className="flex items-center gap-1 px-3 py-1.5 border border-primary text-primary rounded-full text-sm font-medium hover:bg-primary hover:text-white transition-colors"
            >
              <span>🔒</span>
              <span>আনলক করুন</span>
            </button>
          )}
          {butcher.contactUnlocked && butcher.phone && (
            <a
              href={`tel:${butcher.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-full text-sm font-medium"
            >
              কল করুন
            </a>
          )}
        </div>

        {/* WhatsApp row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-green-500 text-lg">💬</span>
            <span className="text-gray-700 font-medium">
              {butcher.contactUnlocked && butcher.whatsapp ? butcher.whatsapp : maskPhone(butcher.whatsapp)}
            </span>
          </div>
          {!butcher.contactUnlocked && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnlock(); }}
              className="flex items-center gap-1 px-3 py-1.5 border border-primary text-primary rounded-full text-sm font-medium hover:bg-primary hover:text-white transition-colors"
            >
              <span>🔒</span>
              <span>আনলক করুন</span>
            </button>
          )}
          {butcher.contactUnlocked && butcher.whatsapp && (
            <a
              href={`https://wa.me/88${butcher.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-full text-sm font-medium"
            >
              মেসেজ
            </a>
          )}
        </div>
      </div>
    </div>
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
