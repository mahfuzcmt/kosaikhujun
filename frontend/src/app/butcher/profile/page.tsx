'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, locationApi, uploadApi, resolveImageUrl, District, Thana, ButcherDto } from '@/lib/api';

export default function ButcherProfilePage() {
  const { user, isLoading, refreshAuth } = useAuth();
  const router = useRouter();

  const [butcher, setButcher] = useState<ButcherDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cowPrice, setCowPrice] = useState('');
  const [cowPriceType, setCowPriceType] = useState('PER_ANIMAL');
  const [goatPrice, setGoatPrice] = useState('');
  const [goatPriceType, setGoatPriceType] = useState('PER_ANIMAL');
  const [cowCapacity, setCowCapacity] = useState('');
  const [goatCapacity, setGoatCapacity] = useState('');

  const [districts, setDistricts] = useState<District[]>([]);
  const [thanas, setThanas] = useState<Thana[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [selectedThanas, setSelectedThanas] = useState<number[]>([]);

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
      loadProfile();
      loadDistricts();
    }
  }, [user, isLoading, router]);

  const loadProfile = async () => {
    setLoading(true);
    const res = await api.get<ButcherDto>('/butchers/me');
    if (res.data) {
      const b = res.data;
      setButcher(b);
      setName(b.name || '');
      setWhatsapp(b.whatsapp || '');
      setPhotoUrl(b.photoUrl || '');
      setPhotoPreview(b.photoUrl ? resolveImageUrl(b.photoUrl) : null);
      setCowPrice(b.cowPrice?.toString() || '');
      setCowPriceType(b.cowPriceType || 'PER_ANIMAL');
      setGoatPrice(b.goatPrice?.toString() || '');
      setGoatPriceType(b.goatPriceType || 'PER_ANIMAL');
      setCowCapacity(b.cowCapacity?.toString() || '');
      setGoatCapacity(b.goatCapacity?.toString() || '');

      if (b.thanas && b.thanas.length > 0) {
        setSelectedThanas(b.thanas.map(t => t.id));
        // Load thanas for the district
        const districtId = b.thanas[0].districtId;
        setSelectedDistrict(districtId);
        const thanaRes = await locationApi.getThanas(districtId);
        if (thanaRes.data) setThanas(thanaRes.data);
      }
    }
    setLoading(false);
  };

  const loadDistricts = async () => {
    const res = await locationApi.getDistricts();
    if (res.data) setDistricts(res.data);
  };

  const handleDistrictChange = async (districtId: number) => {
    setSelectedDistrict(districtId);
    setSelectedThanas([]);
    const res = await locationApi.getThanas(districtId);
    if (res.data) setThanas(res.data);
  };

  const toggleThana = (thanaId: number) => {
    setSelectedThanas(prev =>
      prev.includes(thanaId)
        ? prev.filter(id => id !== thanaId)
        : [...prev, thanaId]
    );
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const res = await uploadApi.photo(file);
      if (res.data?.url) {
        setPhotoUrl(res.data.url);
      }
    } catch {
      setError('ছবি আপলোড ব্যর্থ');
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await api.patch('/butchers/me', {
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        photoUrl,
        cowPrice: cowPrice ? parseFloat(cowPrice) : null,
        cowPriceType,
        goatPrice: goatPrice ? parseFloat(goatPrice) : null,
        goatPriceType,
        cowCapacity: cowCapacity ? parseInt(cowCapacity) : null,
        goatCapacity: goatCapacity ? parseInt(goatCapacity) : null,
        thanaIds: selectedThanas,
      });

      if (res.error) {
        setError(res.error.message);
      } else {
        setSuccess('প্রোফাইল আপডেট হয়েছে');
        await refreshAuth();
      }
    } catch {
      setError('কিছু সমস্যা হয়েছে');
    }
    setSaving(false);
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
        <h1 className="text-xl font-bold">প্রোফাইল সম্পাদনা</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Photo */}
        <div className="card">
          <div className="flex flex-col items-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 hover:border-primary"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">📷</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <p className="text-sm text-gray-500 mt-2">
              {uploading ? 'আপলোড হচ্ছে...' : 'ছবি পরিবর্তন করুন'}
            </p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800">ব্যক্তিগত তথ্য</h3>
          <div>
            <label className="block text-sm text-gray-600 mb-2">নাম</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">WhatsApp নম্বর</label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
            />
          </div>
        </div>

        {/* Service Areas */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800">সেবা এলাকা</h3>
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

          {thanas.length > 0 && (
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
          )}
        </div>

        {/* Pricing */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800">মূল্য তালিকা</h3>
          <div className="space-y-2">
            <label className="block text-sm text-gray-600">গরু প্রসেসিং</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={cowPrice}
                onChange={(e) => setCowPrice(e.target.value)}
                placeholder="মূল্য"
                className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
              />
              <select
                value={cowPriceType}
                onChange={(e) => setCowPriceType(e.target.value)}
                className="py-3 px-3 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
              >
                <option value="PER_ANIMAL">প্রতি পশু</option>
                <option value="PER_KG">প্রতি কেজি</option>
                <option value="PERCENTAGE">শতাংশ (%)</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-gray-600">ছাগল প্রসেসিং</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={goatPrice}
                onChange={(e) => setGoatPrice(e.target.value)}
                placeholder="মূল্য"
                className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
              />
              <select
                value={goatPriceType}
                onChange={(e) => setGoatPriceType(e.target.value)}
                className="py-3 px-3 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
              >
                <option value="PER_ANIMAL">প্রতি পশু</option>
                <option value="PER_KG">প্রতি কেজি</option>
                <option value="PERCENTAGE">শতাংশ (%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Capacity */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800">দৈনিক ক্ষমতা</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">গরু</label>
              <input
                type="number"
                value={cowCapacity}
                onChange={(e) => setCowCapacity(e.target.value)}
                className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">ছাগল</label>
              <input
                type="number"
                value={goatCapacity}
                onChange={(e) => setGoatCapacity(e.target.value)}
                className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {success && <p className="text-green-500 text-sm text-center">{success}</p>}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full disabled:opacity-50"
        >
          {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
        </button>

        {/* Link to availability */}
        <button
          type="button"
          onClick={() => router.push('/butcher/availability')}
          className="w-full py-3 px-4 border-2 border-primary text-primary rounded-lg font-medium"
        >
          📅 সময়সূচি সেট করুন
        </button>
      </form>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3">
        <NavItem icon="🏠" label="হোম" onClick={() => router.push('/home')} />
        <NavItem icon="📅" label="সময়সূচি" onClick={() => router.push('/butcher/availability')} />
        <NavItem icon="👤" label="প্রোফাইল" active />
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
