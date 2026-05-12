'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { butcherApi, locationApi, District, Thana, ButcherDto } from '@/lib/api';
import {
  HomeIcon,
  HeartIcon,
  GiftIcon,
  UserIcon,
  MapPinIcon,
  EyeIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  LockClosedIcon,
  StarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

export default function HomePage() {
  const { user, isLoading, profile, isNewUser, logout } = useAuth();
  const router = useRouter();

  const [districts, setDistricts] = useState<District[]>([]);
  const [thanas, setThanas] = useState<Thana[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [selectedThana, setSelectedThana] = useState<number | null>(null);
  const [butchers, setButchers] = useState<ButcherDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }

    // If new user, redirect to registration
    if (!isLoading && isNewUser && !profile) {
      router.replace('/register');
      return;
    }

    // Load districts
    loadDistricts();
  }, [user, isLoading, isNewUser, profile, router]);

  const loadDistricts = async () => {
    const response = await locationApi.getDistricts();
    if (response.data) {
      setDistricts(response.data);
      // Auto-select Dhaka (id: 1) by default
      const dhaka = response.data.find(d => d.id === 1);
      if (dhaka) {
        handleDistrictChange(dhaka.id);
      }
    }
  };

  const handleDistrictChange = async (districtId: number) => {
    setSelectedDistrict(districtId);
    setSelectedThana(null);
    setThanas([]);
    setButchers([]);
    setPage(0);
    setHasMore(true);

    const response = await locationApi.getThanas(districtId);
    if (response.data) {
      setThanas(response.data);
    }

    // Search butchers in this district (reset=true)
    searchButchers(districtId, null, true);
  };

  const handleThanaChange = (thanaId: number) => {
    setSelectedThana(thanaId);
    setButchers([]);
    setPage(0);
    setHasMore(true);
    // Search butchers in this thana (reset=true)
    searchButchers(selectedDistrict, thanaId, true);
  };

  const searchButchers = async (districtId: number | null, thanaId: number | null, reset: boolean = true) => {
    if (reset) {
      setLoading(true);
      setPage(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    const currentPage = reset ? 0 : page;
    const response = await butcherApi.search({
      districtId: districtId ?? undefined,
      thanaId: thanaId ?? undefined,
      limit: LIMIT,
      page: currentPage,
    });

    // API returns { data: ButcherDto[], page: {...} } directly
    const rawResponse = response as unknown as { data: ButcherDto[]; page?: { total: number; page: number; limit: number } };
    if (rawResponse.data) {
      const butcherList = rawResponse.data;
      const pageInfo = rawResponse.page || { total: 0, page: 0, limit: LIMIT };

      if (reset) {
        setButchers(butcherList);
        setTotalCount(pageInfo.total);
      } else {
        setButchers(prev => [...prev, ...butcherList]);
      }
      setHasMore(butcherList.length === LIMIT);
      setPage(currentPage + 1);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      searchButchers(selectedDistrict, selectedThana, false);
    }
  };

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return;

      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      // Load more when user is 200px from bottom
      if (scrollTop + windowHeight >= docHeight - 200) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, selectedDistrict, selectedThana, page]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-primary text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 1.74.5 3.37 1.41 4.84.95 1.54 2.2 2.86 3.16 4.4.47.75.81 1.45 1.17 2.26.26.55.47 1.5 1.26 1.5s1-.95 1.26-1.5c.37-.81.7-1.51 1.17-2.26.96-1.53 2.21-2.85 3.16-4.4C18.5 12.37 19 10.74 19 9c0-3.87-3.13-7-7-7zm0 9.75a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold">কসাই বাড়ি</h1>
          </div>
          <button
            onClick={logout}
            className="text-white/80 text-sm"
          >
            লগআউট
          </button>
        </div>

        {/* Search Filters */}
        <div className="space-y-3">
          <select
            value={selectedDistrict || ''}
            onChange={(e) => handleDistrictChange(Number(e.target.value))}
            className="w-full py-3 px-4 rounded-lg bg-white/10 text-white border border-white/20 outline-none"
          >
            <option value="" className="text-gray-800">জেলা নির্বাচন করুন</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id} className="text-gray-800">
                {d.nameBn}
              </option>
            ))}
          </select>

          {thanas.length > 0 && (
            <select
              value={selectedThana || ''}
              onChange={(e) => handleThanaChange(Number(e.target.value))}
              className="w-full py-3 px-4 rounded-lg bg-white/10 text-white border border-white/20 outline-none"
            >
              <option value="" className="text-gray-800">থানা নির্বাচন করুন</option>
              {thanas.map((t) => (
                <option key={t.id} value={t.id} className="text-gray-800">
                  {t.nameBn}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="spinner"></div>
          </div>
        ) : butchers.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>জেলা নির্বাচন করুন কসাই খুঁজতে</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {totalCount}টি কসাই পাওয়া গেছে {butchers.length < totalCount && `(${butchers.length}টি দেখানো হচ্ছে)`}
            </p>
            {butchers.map((butcher) => (
              <ButcherCard
                key={butcher.id}
                butcher={butcher}
                onClick={() => router.push(`/butcher/${butcher.id}`)}
                onUnlock={async () => {
                  const response = await butcherApi.unlock(butcher.id);
                  if (response.data) {
                    // Update butcher in the list with unlocked data
                    setButchers(prev => prev.map(b =>
                      b.id === butcher.id ? response.data! : b
                    ));
                  } else {
                    // Redirect to packages if no subscription
                    router.push('/packages');
                  }
                }}
              />
            ))}
            {/* Infinite scroll loading indicator */}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="spinner"></div>
              </div>
            )}
            {/* End of list message */}
            {!hasMore && butchers.length > 0 && (
              <p className="text-center text-gray-400 py-4 text-sm">
                সব কসাই দেখানো হয়েছে
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3">
        <NavItem icon={<HomeIconSolid className="w-6 h-6" />} label="হোম" active />
        {user?.userType !== 'BUTCHER' && (
          <NavItem icon={<HeartIcon className="w-6 h-6" />} label="পছন্দ" onClick={() => router.push('/favorites')} />
        )}
        {user?.userType !== 'BUTCHER' && (
          <NavItem icon={<GiftIcon className="w-6 h-6" />} label="প্যাকেজ" onClick={() => router.push('/packages')} />
        )}
        <NavItem icon={<UserIcon className="w-6 h-6" />} label="প্রোফাইল" onClick={() => router.push('/profile')} />
      </nav>
    </main>
  );
}

function ButcherCard({ butcher, onClick, onUnlock }: { butcher: ButcherDto; onClick: () => void; onUnlock: () => void }) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Mask phone number: show first 2 digits + XXXXXXXX
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
            <UserIcon className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-gray-800 truncate">{butcher.name || 'কসাই'}</h3>
            <StarIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
            <span className="flex items-center gap-1">
              <MapPinIcon className="w-4 h-4 text-primary" />
              {butcher.thanas && butcher.thanas.length > 0
                ? butcher.thanas[0].nameBn + (butcher.thanas.length > 1 ? ` +${butcher.thanas.length - 1}` : '')
                : 'ঢাকা'}
            </span>
            <span className="text-gray-300">|</span>
            <span
              className="flex items-center gap-1 text-orange-600 cursor-pointer relative"
              onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip); }}
            >
              <EyeIcon className="w-4 h-4" />
              <span>{butcher.unlockCount || 0}/{butcher.unlockLimit || '∞'}</span>
              {showTooltip && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {butcher.unlockLimit || '∞'} জনের মধ্যে {butcher.unlockCount || 0} জন কল করেছে
                </div>
              )}
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
