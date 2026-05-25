'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 11) {
      setError('সঠিক ফোন নম্বর দিন');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.sendOtp(cleanPhone);
      if (response.error) {
        setError(response.error.message);
      } else if (response.data) {
        // In dev mode, show the OTP
        if (response.data.devMode && response.data.otp) {
          setDevOtp(response.data.otp);
        }
        setStep('otp');
      }
    } catch {
      setError('কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 4) {
      setError('৪ সংখ্যার OTP দিন');
      return;
    }

    if (newPassword.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('পাসওয়ার্ড মিলছে না');
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const response = await authApi.resetPassword(cleanPhone, otp, newPassword);
      if (response.error) {
        setError(response.error.message);
      } else if (response.data?.success) {
        setStep('success');
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
          onClick={() => {
            if (step === 'otp') {
              setStep('phone');
              setOtp('');
              setDevOtp(null);
            } else {
              router.back();
            }
          }}
          className="text-white text-xl mr-4"
        >
          ←
        </button>
        <h1 className="text-lg font-medium flex-1 text-center pr-8">পাসওয়ার্ড রিসেট</h1>
      </div>

      <div className="flex-1 p-6">
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">পাসওয়ার্ড ভুলে গেছেন?</h2>
            <p className="text-gray-600 mb-6">
              আপনার রেজিস্টার্ড মোবাইল নম্বর দিন। আমরা একটি OTP পাঠাবো।
            </p>

            {/* Phone Input */}
            <div className="mb-6">
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

            {error && (
              <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, '').length !== 11}
              className="w-full py-4 rounded-lg text-lg font-semibold bg-primary text-white hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'OTP পাঠানো হচ্ছে...' : 'OTP পাঠান'}
            </button>

            {/* Back to Login Link */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-primary font-semibold"
              >
                ← লগইনে ফিরে যান
              </button>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleResetPassword} className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">নতুন পাসওয়ার্ড সেট করুন</h2>
            <p className="text-gray-600 mb-6">
              {phone} নম্বরে পাঠানো OTP এবং নতুন পাসওয়ার্ড দিন।
            </p>

            {/* Dev mode OTP display */}
            {devOtp && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Dev Mode:</strong> আপনার OTP হলো <span className="font-mono font-bold">{devOtp}</span>
                </p>
              </div>
            )}

            {/* OTP Input */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">OTP কোড</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setOtp(digits);
                }}
                placeholder="৪ সংখ্যার কোড"
                className="w-full py-4 px-4 text-lg text-center tracking-widest border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                maxLength={4}
              />
            </div>

            {/* New Password Input */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">নতুন পাসওয়ার্ড</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
              disabled={loading || otp.length !== 4 || newPassword.length < 6 || newPassword !== confirmPassword}
              className="w-full py-4 rounded-lg text-lg font-semibold bg-primary text-white hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'রিসেট হচ্ছে...' : 'পাসওয়ার্ড রিসেট করুন'}
            </button>

            {/* Resend OTP */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setOtp('');
                  handleSendOtp({ preventDefault: () => {} } as React.FormEvent);
                }}
                className="text-primary text-sm"
              >
                আবার OTP পাঠান
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">পাসওয়ার্ড রিসেট সফল!</h2>
            <p className="text-gray-600 mb-8">
              আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-4 rounded-lg text-lg font-semibold bg-primary text-white hover:bg-primary-dark transition-all"
            >
              লগইন করুন
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
