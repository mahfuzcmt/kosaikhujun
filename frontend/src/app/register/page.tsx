'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [step, setStep] = useState<'type' | 'phone' | 'otp'>('type');
  const [selectedType, setSelectedType] = useState<'butcher' | 'customer' | null>(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleContinueToPhone = () => {
    if (!selectedType) return;

    // Already authenticated (e.g. came from /login auto-creating a CUSTOMER
    // user on first OTP verify) — skip phone+OTP and go straight to profile.
    if (user) {
      localStorage.setItem('registerType', selectedType);
      router.replace(selectedType === 'butcher' ? '/register/butcher' : '/register/customer');
      return;
    }

    setStep('phone');
  };

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
        // Focus first OTP input
        setTimeout(() => otpRefs[0].current?.focus(), 100);
      }
    } catch {
      setError('কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace - go to previous input
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pastedData.length === 4) {
      setOtp(pastedData.split(''));
      otpRefs[3].current?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const otpString = otp.join('');
    if (otpString.length !== 4) {
      setError('৪ সংখ্যার OTP দিন');
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      await login(cleanPhone, otpString);

      // Save selected type and redirect to profile completion
      localStorage.setItem('registerType', selectedType!);
      if (selectedType === 'butcher') {
        router.replace('/register/butcher');
      } else {
        router.replace('/register/customer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtp(['', '', '', '']);
      setDevOtp(null);
    } else if (step === 'phone') {
      setStep('type');
    } else {
      router.back();
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Green Header */}
      <div className="bg-primary text-white py-4 px-4 flex items-center">
        <button
          onClick={handleBack}
          className="text-white text-xl mr-4"
        >
          ←
        </button>
        <h1 className="text-lg font-medium flex-1 text-center pr-8">রেজিস্ট্রেশন</h1>
      </div>

      {step === 'type' && (
        /* Type Selection */
        <div className="flex-1 p-6 flex flex-col">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">আমি একজন</h2>

          {/* Options - "কসাই খুঁজছি" on top, "কসাই" below */}
          <div className="space-y-4 max-w-sm mx-auto w-full">
            {/* Customer Option (top) */}
            <button
              onClick={() => setSelectedType('customer')}
              className={`w-full p-6 min-h-[96px] rounded-xl border-2 transition-all flex items-center gap-4 ${
                selectedType === 'customer'
                  ? 'border-primary bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                {/* Cleaver + magnifier — search-for-butcher icon */}
                <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none">
                  {/* Cleaver blade */}
                  <path d="M8 12 L30 12 L30 22 L20 22 L20 18 L8 18 Z" fill="white" stroke="white" strokeWidth="1" strokeLinejoin="round"/>
                  {/* Cleaver handle */}
                  <rect x="29" y="14" width="11" height="3" rx="1" fill="#5D4037"/>
                  {/* Magnifier ring */}
                  <circle cx="30" cy="34" r="8" stroke="white" strokeWidth="3" fill="none"/>
                  <circle cx="30" cy="34" r="4" fill="white" fillOpacity="0.25"/>
                  {/* Magnifier handle */}
                  <path d="M36 40 L43 46" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
              <span className={`text-2xl font-semibold ${
                selectedType === 'customer' ? 'text-primary' : 'text-gray-800'
              }`}>কসাই খুঁজছি</span>
            </button>

            {/* Butcher Option (bottom) */}
            <button
              onClick={() => setSelectedType('butcher')}
              className={`w-full p-6 min-h-[96px] rounded-xl border-2 transition-all flex items-center gap-4 ${
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
              <span className={`text-2xl font-semibold ${
                selectedType === 'butcher' ? 'text-primary' : 'text-gray-800'
              }`}>কসাই</span>
            </button>
          </div>

          {/* Yellow callout */}
          <div className="max-w-sm mx-auto w-full mt-8 bg-yellow-300 border border-yellow-400 rounded-lg px-5 py-4 text-center">
            <p className="text-lg font-bold text-gray-900 leading-relaxed">
              সহজেই
              <br />
              বিশ্বস্ত ও দক্ষ কসাই খুঁজুন
              <br />
              আপনার নিজের এলাকায়।
            </p>
          </div>

          {/* Hotline */}
          <div className="max-w-sm mx-auto w-full mt-6 text-center">
            <p className="text-sm font-semibold text-gray-700">Hotline No</p>
            <p className="text-sm text-gray-800 tracking-wide">
              <a href="tel:01842724665" className="hover:text-primary">01842724665</a>
              {', '}
              <a href="tel:01712651456" className="hover:text-primary">01712651456</a>
            </p>
          </div>

          {/* Bottom Button */}
          <div className="pt-8">
            <button
              onClick={handleContinueToPhone}
              disabled={!selectedType}
              className="w-full py-4 rounded-lg text-lg font-semibold bg-primary text-white hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              পরবর্তী
            </button>
          </div>
        </div>
      )}

      {step === 'phone' && (
        /* Phone Input */
        <div className="flex-1 p-6">
          <form onSubmit={handleSendOtp} className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-8">আপনার মোবাইল নম্বর দিন</h2>

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

      {step === 'otp' && (
        /* OTP Verification */
        <div className="flex-1 p-6">
          <form onSubmit={handleVerifyOtp} className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">OTP যাচাই করুন</h2>
            <p className="text-gray-600 mb-6">
              {phone} নম্বরে পাঠানো ৪ সংখ্যার কোড দিন
            </p>

            {/* Dev mode OTP display */}
            {devOtp && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Dev Mode:</strong> আপনার OTP হলো <span className="font-mono font-bold">{devOtp}</span>
                </p>
              </div>
            )}

            {/* OTP Input - 4 separate boxes */}
            <div className="mb-6">
              <div className="flex justify-center gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={otpRefs[index]}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className="w-14 h-14 text-2xl text-center font-bold border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    maxLength={1}
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 4}
              className="w-full py-4 rounded-lg text-lg font-semibold bg-primary text-white hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'যাচাই হচ্ছে...' : 'যাচাই করুন'}
            </button>

            {/* Resend OTP */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setOtp(['', '', '', '']);
                  setDevOtp(null);
                  handleSendOtp({ preventDefault: () => {} } as React.FormEvent);
                }}
                className="text-primary text-sm"
              >
                আবার OTP পাঠান
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
