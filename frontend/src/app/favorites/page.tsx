'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { customerApi, butcherApi, resolveImageUrl, ButcherDto } from '@/lib/api';
import { Toast } from '@/components/Toast';
import {
  HomeIcon,
  HeartIcon,
  GiftIcon,
  UserIcon,
  MapPinIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  LockClosedIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

export default function FavoritesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [favorites, setFavorites] = useState<ButcherDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

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
      <Toast message={toast} onClose={() => setToast(null)} />
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
                  if (user?.userType === 'BUTCHER') {
                    setToast('কসাইয়ের নম্বর শুধুমাত্র গ্রাহক পাবেন');
                    return;
                  }
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
        <NavItem icon={<HomeIcon className="w-6 h-6" />} label="হোম" onClick={() => router.push('/home')} />
        <NavItem icon={<HeartIconSolid className="w-6 h-6" />} label="পছন্দ" active />
        {user?.userType !== 'BUTCHER' && (
          <NavItem icon={<GiftIcon className="w-6 h-6" />} label="প্যাকেজ" onClick={() => router.push('/packages')} />
        )}
        <NavItem icon={<UserIcon className="w-6 h-6" />} label="প্রোফাইল" onClick={() => router.push('/profile')} />
      </nav>
    </main>
  );
}

// Generate initials from name
function getInitials(name: string | undefined): string {
  if (!name) return 'ক';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

// Generate consistent color based on name
function getAvatarColor(name: string | undefined): string {
  const colors = [
    'bg-primary', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
  ];
  if (!name) return colors[0];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
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
        <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${butcher.photoUrl ? 'bg-gray-100' : getAvatarColor(butcher.name)}`}>
          {butcher.photoUrl ? (
            <img src={resolveImageUrl(butcher.photoUrl)} alt={butcher.name || ''} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-white">{getInitials(butcher.name)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-gray-800 truncate">{butcher.name || 'কসাই'}</h3>
            <HeartIconSolid className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
            <span className="flex items-center gap-1">
              <MapPinIcon className="w-4 h-4 text-primary" />
              {butcher.thanas && butcher.thanas.length > 0 ? butcher.thanas[0].nameBn : 'ঢাকা'}
            </span>
            <span className="text-gray-300">|</span>
            <span className="flex items-center gap-1 text-orange-600">
              <EyeIcon className="w-4 h-4" />
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
            <PhoneIcon className="w-5 h-5 text-primary" />
            <span className="text-gray-700 font-medium">
              {butcher.contactUnlocked && butcher.phone ? butcher.phone : maskPhone(butcher.phone)}
            </span>
          </div>
          {!butcher.contactUnlocked && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnlock(); }}
              className="flex items-center gap-1 px-3 py-1.5 border border-primary text-primary rounded-full text-sm font-medium hover:bg-primary hover:text-white transition-colors"
            >
              <LockClosedIcon className="w-4 h-4" />
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
            <ChatBubbleLeftIcon className="w-5 h-5 text-green-500" />
            <span className="text-gray-700 font-medium">
              {butcher.contactUnlocked && butcher.whatsapp ? butcher.whatsapp : maskPhone(butcher.whatsapp)}
            </span>
          </div>
          {!butcher.contactUnlocked && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnlock(); }}
              className="flex items-center gap-1 px-3 py-1.5 border border-primary text-primary rounded-full text-sm font-medium hover:bg-primary hover:text-white transition-colors"
            >
              <LockClosedIcon className="w-4 h-4" />
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
