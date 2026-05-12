'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { paymentApi } from '@/lib/api';

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [message, setMessage] = useState('পেমেন্ট যাচাই করা হচ্ছে...');
  const [trxID, setTrxID] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get payment info from URL params (bKash redirects with paymentID and status)
      const paymentID = searchParams.get('paymentID');
      const bkashStatus = searchParams.get('status');

      if (!paymentID) {
        // Try to get from localStorage
        const pendingPayment = localStorage.getItem('pendingPayment');
        if (pendingPayment) {
          const { bkashPaymentId } = JSON.parse(pendingPayment);
          if (bkashPaymentId) {
            await processPayment(bkashPaymentId, bkashStatus || 'cancel');
            return;
          }
        }
        setStatus('failed');
        setMessage('পেমেন্ট তথ্য পাওয়া যায়নি');
        return;
      }

      await processPayment(paymentID, bkashStatus || 'cancel');

    } catch (error) {
      console.error('Payment callback error:', error);
      setStatus('failed');
      setMessage('পেমেন্ট যাচাইয়ে সমস্যা হয়েছে');
    }
  };

  const processPayment = async (paymentID: string, bkashStatus: string) => {
    try {
      const response = await paymentApi.callback(paymentID, bkashStatus);

      if (response.data) {
        if (response.data.status === 'SUCCESS') {
          setStatus('success');
          setMessage(response.data.message || 'পেমেন্ট সফল হয়েছে!');
          if (response.data.trxID) {
            setTrxID(response.data.trxID);
          }
          // Clear pending payment
          localStorage.removeItem('pendingPayment');
        } else {
          setStatus('failed');
          setMessage(response.data.message || 'পেমেন্ট ব্যর্থ হয়েছে');
        }
      } else if (response.error) {
        setStatus('failed');
        setMessage(response.error.message || 'পেমেন্ট যাচাইয়ে সমস্যা হয়েছে');
      }
    } catch (error) {
      console.error('Process payment error:', error);
      setStatus('failed');
      setMessage('পেমেন্ট প্রক্রিয়াকরণে সমস্যা হয়েছে');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="spinner mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">অপেক্ষা করুন</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-green-700 mb-2">পেমেন্ট সফল!</h2>
            <p className="text-gray-600 mb-2">{message}</p>
            {trxID && (
              <p className="text-sm text-gray-500 mb-4">
                Transaction ID: <span className="font-mono font-medium">{trxID}</span>
              </p>
            )}
            <button
              onClick={() => router.push('/packages')}
              className="btn-primary w-full mt-4"
            >
              প্যাকেজ পেইজে যান
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="text-xl font-bold text-red-700 mb-2">পেমেন্ট ব্যর্থ</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/packages')}
                className="btn-primary w-full"
              >
                আবার চেষ্টা করুন
              </button>
              <button
                onClick={() => router.push('/home')}
                className="w-full py-3 text-gray-600 hover:text-gray-800"
              >
                হোমে ফিরে যান
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <div className="spinner mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">লোড হচ্ছে...</h2>
        </div>
      </main>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}
