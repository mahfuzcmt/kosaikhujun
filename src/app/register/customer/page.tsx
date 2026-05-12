'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { locationApi, registerApi, District, Thana } from '@/lib/api';

export default function CustomerRegisterPage() {
  const { user, isLoading, refreshAuth } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [districts, setDistricts] = useState<District[]>([]);
  const [thanas, setThanas] = useState<Thana[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [selectedThanas, setSelectedThanas] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    loadDistricts();
  }, [user, isLoading, router]);

  const loadDistricts = async () => {
    const response = await locationApi.getDistricts();
    if (response.data) {
      setDistricts(response.data);
    }
  };

  const handleDistrictChange = async (districtId: number) => {
    setSelectedDistrict(districtId);
    setSelectedThanas([]);

    const response = await locationApi.getThanas(districtId);
    if (response.data) {
      setThanas(response.data);
    }
  };

  const toggleThana = (thanaId: number) => {
    setSelectedThanas((prev) =>
      prev.includes(thanaId)
        ? prev.filter((id) => id !== thanaId)
        : [...prev, thanaId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('নাম দিন');
      return;
    }

    setLoading(true);

    try {
      const response = await registerApi.customer({
        name: name.trim(),
        whatsapp: whatsapp.trim() || undefined,
        address: address.trim() || undefined,
        districtId: selectedDistrict ?? undefined,
        thanaIds: selectedThanas.length > 0 ? selectedThanas : undefined,
      });

      if (response.error) {
        setError(response.error.message);
      } else {
        await refreshAuth();
        router.replace('/home');
      }
    } catch {
      setError('কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-primary text-white py-4 px-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-2xl">←</button>
        <h1 className="text-xl font-bold">গ্রাহক রেজিস্ট্রেশন</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 p-4 space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              আপনার নাম *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="নাম লিখুন"
              className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              WhatsApp নম্বর (ঐচ্ছিক)
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              ঠিকানা (ঐচ্ছিক)
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="আপনার ঠিকানা"
              className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-primary outline-none resize-none"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              জেলা (ঐচ্ছিক)
            </label>
            <select
              value={selectedDistrict || ''}
              onChange={(e) => handleDistrictChange(Number(e.target.value))}
              className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
            >
              <option value="">জেলা নির্বাচন করুন</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.nameBn}</option>
              ))}
            </select>
          </div>

          {thanas.length > 0 && (
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                পছন্দের এলাকা (ঐচ্ছিক)
              </label>
              <div className="flex flex-wrap gap-2">
                {thanas.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleThana(t.id)}
                    className={`px-3 py-1.5 rounded-full text-sm ${
                      selectedThanas.includes(t.id)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {t.nameBn}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-danger text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
        </button>
      </form>
    </main>
  );
}
