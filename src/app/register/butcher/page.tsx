'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { locationApi, registerApi, uploadApi, District, Thana } from '@/lib/api';

export default function ButcherRegisterPage() {
  const { user, isLoading, refreshAuth } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [districts, setDistricts] = useState<District[]>([]);
  const [thanas, setThanas] = useState<Thana[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [selectedThanas, setSelectedThanas] = useState<number[]>([]);
  const [cowPrice, setCowPrice] = useState('');
  const [cowPriceType, setCowPriceType] = useState('PER_ANIMAL');
  const [goatPrice, setGoatPrice] = useState('');
  const [goatPriceType, setGoatPriceType] = useState('PER_ANIMAL');
  const [cowCapacity, setCowCapacity] = useState('');
  const [goatCapacity, setGoatCapacity] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      // Auto-select Dhaka (id: 1)
      const dhaka = response.data.find(d => d.id === 1);
      if (dhaka) {
        handleDistrictChange(dhaka.id);
      }
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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const response = await uploadApi.photo(file);
      if (response.data?.url) {
        setPhotoUrl(response.data.url);
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch {
      setError('ছবি আপলোড ব্যর্থ');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('নাম দিন');
      return;
    }

    if (selectedThanas.length === 0) {
      setError('অন্তত একটি সেবা এলাকা নির্বাচন করুন');
      return;
    }

    setLoading(true);

    try {
      const response = await registerApi.butcher({
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        thanaIds: selectedThanas,
        cowPrice: cowPrice ? parseInt(cowPrice) : undefined,
        cowPriceType,
        goatPrice: goatPrice ? parseInt(goatPrice) : undefined,
        goatPriceType,
        cowCapacity: cowCapacity ? parseInt(cowCapacity) : undefined,
        goatCapacity: goatCapacity ? parseInt(goatCapacity) : undefined,
        photoUrl: photoUrl || undefined,
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
    <main className="min-h-screen bg-gray-50 flex flex-col pb-6">
      {/* Header */}
      <div className="bg-primary text-white py-4 px-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-2xl">←</button>
        <h1 className="text-xl font-bold">কসাই রেজিস্ট্রেশন</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 p-4 space-y-4">
        {/* Basic Info */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800">ব্যক্তিগত তথ্য</h3>

          {/* Photo Upload */}
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
              {uploading ? 'আপলোড হচ্ছে...' : 'ছবি আপলোড করুন'}
            </p>
          </div>

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
              WhatsApp নম্বর
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
            />
          </div>
        </div>

        {/* Service Areas */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800">সেবা এলাকা *</h3>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              জেলা
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
                থানা/এলাকা নির্বাচন করুন
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

        {/* Pricing */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-800">মূল্য তালিকা</h3>

          {/* Cow pricing */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-600">গরু প্রসেসিং</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={cowPrice}
                onChange={(e) => setCowPrice(e.target.value)}
                placeholder="মূল্য (টাকা)"
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

          {/* Goat pricing */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-600">ছাগল প্রসেসিং</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={goatPrice}
                onChange={(e) => setGoatPrice(e.target.value)}
                placeholder="মূল্য (টাকা)"
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
              <label className="block text-sm text-gray-600 mb-2">
                গরু (সংখ্যা)
              </label>
              <input
                type="number"
                value={cowCapacity}
                onChange={(e) => setCowCapacity(e.target.value)}
                placeholder="যেমন: ৫"
                className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                ছাগল (সংখ্যা)
              </label>
              <input
                type="number"
                value={goatCapacity}
                onChange={(e) => setGoatCapacity(e.target.value)}
                placeholder="যেমন: ১০"
                className="w-full py-3 px-4 border-2 border-gray-200 rounded-lg focus:border-primary outline-none"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-danger text-sm text-center">{error}</p>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            📋 আপনার রেজিস্ট্রেশন অ্যাডমিন অনুমোদনের অপেক্ষায় থাকবে।
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? 'সংরক্ষণ হচ্ছে...' : 'রেজিস্ট্রেশন জমা দিন'}
        </button>
      </form>
    </main>
  );
}
