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
    <main className="min-h-[100dvh] bg-white flex flex-col">
      {/* Header */}
      <div className="bg-primary text-white py-3 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-lg">🥩</span>
          </div>
          <span className="font-semibold text-lg">কসাই লাগবে</span>
        </div>
        <button className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </div>

      {/* Hero Section — fills the space between header and buttons. object-contain
          shows the WHOLE image (so the headline stays over its green top and never
          overlaps the phone/butcher) and keeps the buttons on screen with no scroll.
          The green background blends the small side gaps left by object-contain. */}
      <div className="relative flex-1 min-h-0 overflow-hidden bg-primary">
        <img
          src="/hero-image.jpg"
          alt="কসাই লাগবে"
          className="absolute inset-0 w-full h-full object-contain"
        />
        {/* Subtle dark gradient so the white headline stays legible on any image */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-black/45 to-transparent" />
        <div className="absolute top-[5%] left-0 right-0 text-center px-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug drop-shadow-lg">
            রেজিস্ট্রেশন করুন
            <br />
            আপনার লোকেশনে
            <br />
            নির্ভরযোগ্য কসাই খুঁজুন
          </h1>
        </div>
        <div className="absolute bottom-[12%] left-0 right-0 text-center px-4">
          <h2 className="text-lg font-bold text-gray-800 mb-1">
            কুরবানির ঈদে বিশ্বস্ত কসাই খুঁজে পেতে
          </h2>
          <p className="text-base text-primary font-semibold">
            এখনই রেজিস্ট্রেশন করুন
          </p>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="px-6 pb-6 pt-4">
        <div className="space-y-3">
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
      </div>
    </main>
  );
}
