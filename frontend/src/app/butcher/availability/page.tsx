'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface Availability {
  id: string;
  butcherId: string;
  date: string;
  status: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE';
  note?: string;
}

const EID_DAYS = [
  { key: 'eid1', label: 'ঈদের দিন', dateOffset: 0 },
  { key: 'eid2', label: 'ঈদের ২য় দিন', dateOffset: 1 },
  { key: 'eid3', label: 'ঈদের ৩য় দিন', dateOffset: 2 },
];

export default function ButcherAvailabilityPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Generate dates for the 3 Eid days (starting from today or a configured Eid date)
  const getEidDates = () => {
    const today = new Date();
    return EID_DAYS.map(day => {
      const d = new Date(today);
      d.setDate(d.getDate() + day.dateOffset);
      return {
        ...day,
        date: d.toISOString().split('T')[0],
      };
    });
  };

  const eidDates = getEidDates();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!isLoading && user?.userType !== 'BUTCHER') {
      router.replace('/home');
      return;
    }
    if (!isLoading && user?.userType === 'BUTCHER') {
      loadAvailability();
    }
  }, [user, isLoading, router]);

  const loadAvailability = async () => {
    setLoading(true);
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);
    const from = today.toISOString().split('T')[0];
    const to = endDate.toISOString().split('T')[0];
    const res = await api.get<Availability[]>(`/butchers/me/availability?from=${from}&to=${to}`);
    if (res.data) setAvailability(res.data);
    setLoading(false);
  };

  const handleSetStatus = async (date: string, note: string, status: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE') => {
    setSaving(date);
    try {
      await api.post('/butchers/me/availability', {
        date,
        status,
        note,
      });
      await loadAvailability();
    } catch {
      alert('সেভ করতে ব্যর্থ');
    }
    setSaving(null);
  };

  const handleDelete = async (date: string) => {
    setSaving(date);
    try {
      await api.delete(`/butchers/me/availability?date=${date}`);
      setAvailability(prev => prev.filter(a => a.date !== date));
    } catch {
      alert('মুছে ফেলতে ব্যর্থ');
    }
    setSaving(null);
  };

  const getAvailabilityForDate = (date: string) => {
    return availability.find(a => a.date === date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-500';
      case 'BOOKED': return 'bg-yellow-500';
      case 'UNAVAILABLE': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'কাজের জন্য প্রস্তুত';
      case 'BOOKED': return 'বুকিং সম্পন্ন';
      case 'UNAVAILABLE': return 'আজ ফাঁকা নেই';
      default: return 'সেট করা হয়নি';
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
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-primary text-white py-4 px-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-2xl">←</button>
        <h1 className="text-xl font-bold">ঈদের সময়সূচি</h1>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-gray-600 text-center mb-2">
          প্রতিটি দিনের জন্য আপনার সময়সূচি সেট করুন
        </p>

        {/* Eid Day Cards */}
        {eidDates.map(({ key, label, date }) => {
          const existing = getAvailabilityForDate(date);
          const isSaving = saving === date;

          return (
            <div key={key} className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{label}</h3>
                  {existing && (
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-white text-sm ${getStatusColor(existing.status)}`}>
                      {getStatusLabel(existing.status)}
                    </span>
                  )}
                  {!existing && (
                    <span className="inline-block mt-1 px-3 py-1 rounded-full bg-gray-200 text-gray-600 text-sm">
                      সেট করা হয়নি
                    </span>
                  )}
                </div>
                {existing && (
                  <button
                    onClick={() => handleDelete(date)}
                    disabled={isSaving}
                    className="text-red-500 text-sm px-3 py-1 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    {isSaving ? '...' : 'রিসেট'}
                  </button>
                )}
              </div>

              {/* Status Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleSetStatus(date, label, 'AVAILABLE')}
                  disabled={isSaving}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    existing?.status === 'AVAILABLE'
                      ? 'bg-green-500 text-white ring-2 ring-green-300'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  } ${isSaving ? 'opacity-50' : ''}`}
                >
                  ✅ কাজের জন্য প্রস্তুত
                </button>
                <button
                  onClick={() => handleSetStatus(date, label, 'BOOKED')}
                  disabled={isSaving}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    existing?.status === 'BOOKED'
                      ? 'bg-yellow-500 text-white ring-2 ring-yellow-300'
                      : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  } ${isSaving ? 'opacity-50' : ''}`}
                >
                  📅 বুকিং সম্পন্ন
                </button>
                <button
                  onClick={() => handleSetStatus(date, label, 'UNAVAILABLE')}
                  disabled={isSaving}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    existing?.status === 'UNAVAILABLE'
                      ? 'bg-red-500 text-white ring-2 ring-red-300'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  } ${isSaving ? 'opacity-50' : ''}`}
                >
                  ❌ আজ ফাঁকা নেই
                </button>
              </div>
            </div>
          );
        })}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-800 text-sm">
            💡 <strong>টিপস:</strong> যদি আপনি কোনো দিনের জন্য সময়সূচি সেট না করেন,
            তাহলে গ্রাহকরা ধরে নেবে আপনি সেই দিন কাজের জন্য প্রস্তুত আছেন।
          </p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3">
        <NavItem icon="🏠" label="হোম" onClick={() => router.push('/home')} />
        <NavItem icon="📅" label="সময়সূচি" active />
        <NavItem icon="👤" label="প্রোফাইল" onClick={() => router.push('/butcher/profile')} />
      </nav>
    </main>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 ${active ? 'text-primary' : 'text-gray-500'}`}>
      <span className="text-xl">{icon}</span>
      <span className="text-xs">{label}</span>
    </button>
  );
}
