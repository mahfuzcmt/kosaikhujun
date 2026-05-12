'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [selectedType, setSelectedType] = useState<'butcher' | 'customer' | null>(null);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinueToDetails = () => {
    if (selectedType) {
      setStep('details');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 11) {
      setError('সঠিক ফোন নম্বর দিন');
      return;
    }

    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }

    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড মিলছে না');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register(cleanPhone, password);
      if (response.error) {
        setError(response.error.message);
      } else if (response.data) {
        // Store tokens
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // Save selected type and redirect to profile completion
        localStorage.setItem('registerType', selectedType!);
        if (selectedType === 'butcher') {
          router.replace('/register/butcher');
        } else {
          router.replace('/register/customer');
        }
      }
    } catch {
      setError('কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Green Header */}
      <div className="bg-primary text-white py-4 px-4 flex items-center">
        <button
          onClick={() => step === 'details' ? setStep('type') : router.back()}
          className="text-white text-xl mr-4"
        >
          ←
        </button>
        <h1 className="text-lg font-medium flex-1 text-center pr-8">রেজিস্ট্রেশন</h1>
      </div>

      {step === 'type' ? (
        /* Type Selection */
        <div className="flex-1 p-6 flex flex-col">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">আমি একজন</h2>

          {/* Options */}
          <div className="space-y-4 max-w-sm mx-auto w-full flex-1">
            {/* Butcher Option */}
            <button
              onClick={() => setSelectedType('butcher')}
              className={`w-full p-5 rounded-xl border-2 transition-all flex items-center gap-4 ${
                selectedType === 'butcher'
                  ? 'border-primary bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center overflow-hidden flex-shrink-0">
                <svg className="w-10 h-10 text-white" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="16" r="8" fill="currentColor"/>
                  <path d="M24 26c-8 0-14 5-14 11v3h28v-3c0-6-6-11-14-11z" fill="currentColor"/>
                  <rect x="30" y="12" width="8" height="3" rx="1" fill="#8D6E63"/>
                  <path d="M38 12l2-4" stroke="#757575" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className={`text-xl font-semibold ${
                selectedType === 'butcher' ? 'text-primary' : 'text-gray-800'
              }`}>কসাই</span>
            </button>

            {/* Customer Option */}
            <button
              onClick={() => setSelectedType('customer')}
              className={`w-full p-5 rounded-xl border-2 transition-all flex items-center gap-4 ${
                selectedType === 'customer'
                  ? 'border-primary bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-10 h-10 text-white" viewBox="0 0 48 48" fill="none">
                  <path d="M24 8l16 12v20H8V20l16-12z" fill="currentColor"/>
                  <rect x="20" y="28" width="8" height="12" fill="#0D47A1"/>
                  <circle cx="36" cy="36" r="10" fill="#1E88E5"/>
                  <circle cx="36" cy="36" r="6" fill="white"/>
                  <circle cx="36" cy="36" r="3" fill="#1E88E5"/>
                  <path d="M32 40l-4 4" stroke="#1E88E5" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
              <span className={`text-xl font-semibold ${
                selectedType === 'customer' ? 'text-primary' : 'text-gray-800'
              }`}>কসাই খুঁজছি</span>
            </button>
          </div>

          {/* Bottom Button */}
          <div className="pt-6">
            <button
              onClick={handleContinueToDetails}
              disabled={!selectedType}
              className="w-full py-4 rounded-lg text-lg font-semibold bg-primary text-white hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              পরবর্তী
            </button>
          </div>
        </div>
      ) : (
        /* Registration Form */
        <div className="flex-1 p-6">
          <form onSubmit={handleRegister} className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">অ্যাকাউন্ট তৈরি করুন</h2>

            {/* Phone Input */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">মোবাইল নম্বর</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                  setPhone(digits);
                }}
                placeholder="01XXXXXXXXX"
                className="w-full py-4 px-4 text-lg border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                maxLength={11}
              />
            </div>

            {/* Password Input */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">পাসওয়ার্ড</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  className="w-full py-4 px-4 pr-12 text-lg border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-6 h-6" />
                  ) : (
                    <EyeIcon className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">পাসওয়ার্ড নিশ্চিত করুন</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="পাসওয়ার্ড আবার দিন"
                className="w-full py-4 px-4 text-lg border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, '').length !== 11 || password.length < 6 || password !== confirmPassword}
              className="w-full py-4 rounded-lg text-lg font-semibold bg-primary text-white hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'রেজিস্ট্রেশন হচ্ছে...' : 'রেজিস্ট্রেশন করুন'}
            </button>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-primary font-semibold"
                >
                  লগইন করুন
                </button>
              </p>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
