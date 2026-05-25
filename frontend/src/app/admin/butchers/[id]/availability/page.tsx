'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ButcherDto } from '@/lib/api';
import { Toast } from '@/components/Toast';

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

export default function AdminButcherAvailabilityPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [butcher, setButcher] = useState<ButcherDto | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const getEidDates = () => {
    const today = new Date();
    return EID_DAYS.map(day => {
      const d = new Date(today);
      d.setDate(d.getDate() + day.dateOffset);
      return { ...day, date: d.toISOString().split('T')[0] };
    });
  };

  const eidDates = getEidDates();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!isLoading && user?.userType !== 'ADMIN') {
      router.replace('/home');
      return;
    }
    if (!isLoading && user?.userType === 'ADMIN') {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, router, userId]);

  const loadAll = async () => {
    setLoading(true);
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);
    const from = today.toISOString().split('T')[0];
    const to = endDate.toISOString().split('T')[0];

    const [butcherRes, availRes] = await Promise.all([
      api.get<ButcherDto>(`/admin/users/${userId}/butcher`),
      api.get<Availability[]>(`/admin/users/${userId}/butcher-availability?from=${from}&to=${to}`),
    ]);
    if (butcherRes.data) setButcher(butcherRes.data);
    if (availRes.data) setAvailability(availRes.data);
    setLoading(false);
  };

  const handleSetStatus = async (date: string, note: string, status: Availability['status']) => {
    setSaving(date);
    const res = await api.post(`/admin/users/${userId}/butcher-availability`, { date, status, note });
    if (res.error) {
      setToast(res.error.message || 'সেভ করতে ব্যর্থ');
    } else {
      await loadAll();
    }
    setSaving(null);
  };

  const handleDelete = async (date: string) => {
    setSaving(date);
    const res = await api.delete(`/admin/users/${userId}/butcher-availability?date=${date}`);
    if (res.error) {
      setToast(res.error.message || 'মুছে ফেলতে ব্যর্থ');
    } else {
      setAvailability(prev => prev.filter(a => a.date !== date));
    }
    setSaving(null);
  };

  const getAvailabilityForDate = (date: string) => availability.find(a => a.date === date);

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
    <main className="min-h-screen bg-gray-50 pb-6">
      <Toast message={toast} onClose={() => setToast(null)} />
      <div className="bg-primary text-white py-4 px-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-2xl">←</button>
        <div>
          <h1 className="text-xl font-bold">সময়সূচি (অ্যাডমিন)</h1>
          {butcher && (
            <p className="text-sm text-white/80">{butcher.name || 'নাম নেই'} · 📞 {butcher.phone || '—'}</p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-gray-600 text-center mb-2">
          এই কসাইয়ের প্রতিটি দিনের সময়সূচি সেট বা পরিবর্তন করুন
        </p>

        {eidDates.map(({ key, label, date }) => {
          const existing = getAvailabilityForDate(date);
          const isSaving = saving === date;
          return (
            <div key={key} className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{label}</h3>
                  {existing ? (
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-white text-sm ${getStatusColor(existing.status)}`}>
                      {getStatusLabel(existing.status)}
                    </span>
                  ) : (
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
      </div>
    </main>
  );
}
