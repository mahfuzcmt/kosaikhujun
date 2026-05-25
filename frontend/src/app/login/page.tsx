'use client';

import { useState, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';

function LoginForm() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const router = useRouter();
  const { login } = useAuth();
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

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
      const result = await login(cleanPhone, otpString);

      // Redirect based on whether user is new
      // Only new users go to register flow, existing users go to home
      if (result.isNewUser) {
        router.replace('/register');
      } else {
        router.replace('/home');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।');
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
              setOtp(['', '', '', '']);
              setDevOtp(null);
            } else {
              router.back();
            }
          }}
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
        {step === 'phone' ? (
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
        ) : (
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
        )}
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
