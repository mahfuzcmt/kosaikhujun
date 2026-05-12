'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, locationApi, District, Thana } from '@/lib/api';

export default function AdminLocationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [thanas, setThanas] = useState<Thana[]>([]);
  const [loading, setLoading] = useState(true);

  // New district form
  const [newDistrictBn, setNewDistrictBn] = useState('');
  const [newDistrictEn, setNewDistrictEn] = useState('');
  const [addingDistrict, setAddingDistrict] = useState(false);

  // New thana form
  const [newThanaBn, setNewThanaBn] = useState('');
  const [newThanaEn, setNewThanaEn] = useState('');
  const [addingThana, setAddingThana] = useState(false);

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
      loadDistricts();
    }
  }, [user, isLoading, router]);

  const loadDistricts = async () => {
    setLoading(true);
    const res = await locationApi.getDistricts();
    if (res.data) setDistricts(res.data);
    setLoading(false);
  };

  const loadThanas = async (districtId: number) => {
    setSelectedDistrict(districtId);
    const res = await locationApi.getThanas(districtId);
    if (res.data) setThanas(res.data);
  };

  const handleAddDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDistrictBn.trim()) return;

    setAddingDistrict(true);
    try {
      const res = await api.post<District>('/admin/districts', {
        nameBn: newDistrictBn.trim(),
        nameEn: newDistrictEn.trim() || null,
      });
      if (res.data) {
        setDistricts(prev => [...prev, res.data!]);
        setNewDistrictBn('');
        setNewDistrictEn('');
      }
    } catch (error) {
      alert('জেলা যোগ করা ব্যর্থ');
    }
    setAddingDistrict(false);
  };

  const handleAddThana = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistrict || !newThanaBn.trim()) return;

    setAddingThana(true);
    try {
      const res = await api.post<Thana>('/admin/thanas', {
        districtId: selectedDistrict,
        nameBn: newThanaBn.trim(),
        nameEn: newThanaEn.trim() || null,
      });
      if (res.data) {
        setThanas(prev => [...prev, res.data!]);
        setNewThanaBn('');
        setNewThanaEn('');
      }
    } catch (error) {
      alert('থানা যোগ করা ব্যর্থ');
    }
    setAddingThana(false);
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
      {/* Header */}
      <div className="bg-primary text-white py-4 px-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-2xl">←</button>
          <h1 className="text-xl font-bold">এলাকা ব্যবস্থাপনা</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Add District */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-3">নতুন জেলা যোগ করুন</h2>
          <form onSubmit={handleAddDistrict} className="space-y-3">
            <input
              type="text"
              value={newDistrictBn}
              onChange={(e) => setNewDistrictBn(e.target.value)}
              placeholder="জেলার নাম (বাংলা)"
              className="w-full py-2 px-4 border border-gray-200 rounded-lg focus:border-primary outline-none"
              required
            />
            <input
              type="text"
              value={newDistrictEn}
              onChange={(e) => setNewDistrictEn(e.target.value)}
              placeholder="District Name (English)"
              className="w-full py-2 px-4 border border-gray-200 rounded-lg focus:border-primary outline-none"
            />
            <button
              type="submit"
              disabled={addingDistrict}
              className="w-full py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
            >
              {addingDistrict ? 'যোগ হচ্ছে...' : '+ জেলা যোগ করুন'}
            </button>
          </form>
        </div>

        {/* Districts List */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-3">জেলাসমূহ ({districts.length})</h2>
          <div className="flex flex-wrap gap-2">
            {districts.map((d) => (
              <button
                key={d.id}
                onClick={() => loadThanas(d.id)}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  selectedDistrict === d.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {d.nameBn}
              </button>
            ))}
          </div>
        </div>

        {/* Thanas for selected district */}
        {selectedDistrict && (
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-3">
              থানাসমূহ - {districts.find(d => d.id === selectedDistrict)?.nameBn} ({thanas.length})
            </h2>

            {/* Add Thana Form */}
            <form onSubmit={handleAddThana} className="space-y-3 mb-4">
              <input
                type="text"
                value={newThanaBn}
                onChange={(e) => setNewThanaBn(e.target.value)}
                placeholder="থানার নাম (বাংলা)"
                className="w-full py-2 px-4 border border-gray-200 rounded-lg focus:border-primary outline-none"
                required
              />
              <input
                type="text"
                value={newThanaEn}
                onChange={(e) => setNewThanaEn(e.target.value)}
                placeholder="Thana Name (English)"
                className="w-full py-2 px-4 border border-gray-200 rounded-lg focus:border-primary outline-none"
              />
              <button
                type="submit"
                disabled={addingThana}
                className="w-full py-2 bg-green-500 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {addingThana ? 'যোগ হচ্ছে...' : '+ থানা যোগ করুন'}
              </button>
            </form>

            {/* Thanas List */}
            <div className="flex flex-wrap gap-2">
              {thanas.map((t) => (
                <span
                  key={t.id}
                  className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700"
                >
                  {t.nameBn}
                </span>
              ))}
              {thanas.length === 0 && (
                <p className="text-gray-500 text-sm">কোনো থানা নেই</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
