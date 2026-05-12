'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/home');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-primary text-white py-4 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-lg">🥩</span>
          </div>
          <span className="font-semibold text-lg">কসাই বাড়ি</span>
        </div>
        <button className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col px-6 pt-4">
        {/* Hero Image with Text Overlay */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-full max-w-md">
            <img
              src="/hero-image.jpg"
              alt="কসাই বাড়ি - আপনার লোকেশনে কসাই খুঁজুন"
              className="w-full h-auto object-contain"
            />
            {/* Text overlay on the white board area */}
            <div className="absolute bottom-[10%] left-1/2 transform -translate-x-1/2 w-full px-6">
              <p className="text-center text-gray-700 font-medium text-sm leading-relaxed">
                কুরবানির ঈদে বিশ্বস্ত কসাই খুঁজে পেতে<br />
                এখনই রেজিস্ট্রেশন করুন
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Buttons */}
      <div className="px-6 pb-8 space-y-3">
        <button
          onClick={() => router.push('/register')}
          className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:bg-primary-dark transition-all"
        >
          রেজিস্ট্রেশন করুন
        </button>
        <button
          onClick={() => router.push('/login')}
          className="w-full bg-white text-primary py-4 rounded-xl font-semibold text-lg border-2 border-primary hover:bg-green-50 transition-all"
        >
          লগইন করুন
        </button>
      </div>
    </main>
  );
}
