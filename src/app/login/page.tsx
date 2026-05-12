'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

function LoginForm() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const isRegisterFlow = searchParams.get('register') === 'true';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 11) {
      setError('সঠিক ফোন নম্বর দিন');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.login(cleanPhone, password);
      if (response.error) {
        setError(response.error.message);
      } else if (response.data) {
        // Store tokens and user info
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        if (response.data.profile) {
          localStorage.setItem('profile', JSON.stringify(response.data.profile));
        }

        // Redirect to home
        router.replace('/home');
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
          onClick={() => router.back()}
          className="text-white text-xl mr-4"
        >
          ←
        </button>
        <h1 className="text-lg font-medium flex-1 text-center pr-8">
          লগইন
        </h1>
      </div>

      {/* Form Content */}
      <div className="flex-1 p-6">
        <form onSubmit={handleLogin} className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-8">আপনার অ্যাকাউন্টে প্রবেশ করুন</h2>

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
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2">পাসওয়ার্ড</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="আপনার পাসওয়ার্ড"
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

          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || phone.replace(/\D/g, '').length !== 11 || password.length < 6}
            className="w-full py-4 rounded-lg text-lg font-semibold bg-primary text-white hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
          </button>

          {/* Forgot Password Link */}
          <button
            type="button"
            onClick={() => router.push('/forgot-password')}
            className="w-full mt-4 text-center text-primary"
          >
            পাসওয়ার্ড ভুলে গেছেন?
          </button>

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              অ্যাকাউন্ট নেই?{' '}
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="text-primary font-semibold"
              >
                রেজিস্ট্রেশন করুন
              </button>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="spinner"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
