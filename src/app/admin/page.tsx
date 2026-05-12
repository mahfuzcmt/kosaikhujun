'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface Stats {
  totalUsers: number;
  totalButchers: number;
  pendingButchers: number;
  approvedButchers: number;
  totalCustomers: number;
  paidCustomers: number;
  unpaidCustomers: number;
}

interface PendingButcher {
  id: string;
  name: string;
  photoUrl?: string;
  phone?: string;
  whatsapp?: string;
  cowPrice?: number;
  cowPriceType: string;
  goatPrice?: number;
  goatPriceType: string;
  thanas?: { id: number; nameBn: string }[];
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingButchers, setPendingButchers] = useState<PendingButcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    if (!isLoading && user?.userType !== 'ADMIN') {
      router.replace('/home');
      return;
    }
    if (!isLoading && user?.userType === 'ADMIN') {
      loadData();
    }
  }, [user, isLoading, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes] = await Promise.all([
        api.get<Stats>('/admin/stats'),
        api.get<PendingButcher[]>('/admin/butchers/pending'),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (pendingRes.data) setPendingButchers(pendingRes.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await api.post(`/admin/butchers/${id}/approve`, {});
      if (res.data) {
        setPendingButchers(prev => prev.filter(b => b.id !== id));
        if (stats) {
          setStats({
            ...stats,
            pendingButchers: stats.pendingButchers - 1,
            approvedButchers: stats.approvedButchers + 1,
          });
        }
      }
    } catch (error) {
      alert('অনুমোদন ব্যর্থ');
    }
    setActionLoading(null);
  };

  const handleBlock = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await api.post(`/admin/butchers/${id}/block`, {});
      if (res.data) {
        setPendingButchers(prev => prev.filter(b => b.id !== id));
        if (stats) {
          setStats({
            ...stats,
            pendingButchers: stats.pendingButchers - 1,
          });
        }
      }
    } catch (error) {
      alert('ব্লক ব্যর্থ');
    }
    setActionLoading(null);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-primary text-white py-4 px-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">অ্যাডমিন প্যানেল</h1>
          <button
            onClick={() => router.push('/home')}
            className="text-white/80 text-sm"
          >
            হোম
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="মোট ব্যবহারকারী" value={stats.totalUsers} icon="👥" />
            <StatCard label="মোট কসাই" value={stats.totalButchers} icon="🥩" />
            <StatCard label="অপেক্ষমাণ" value={stats.pendingButchers} icon="⏳" color="warning" />
            <StatCard label="অনুমোদিত" value={stats.approvedButchers} icon="✅" color="success" />
            <StatCard label="মোট কাস্টমার" value={stats.totalCustomers} icon="🛒" />
            <StatCard label="পেইড কাস্টমার" value={stats.paidCustomers} icon="💰" color="success" />
          </div>
        )}

        {/* Pending Butchers */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>⏳</span>
            অনুমোদনের অপেক্ষায় ({pendingButchers.length})
          </h2>

          {pendingButchers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">কোনো পেন্ডিং কসাই নেই</p>
          ) : (
            <div className="space-y-4">
              {pendingButchers.map((butcher) => (
                <div key={butcher.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {butcher.photoUrl ? (
                        <img src={butcher.photoUrl} alt={butcher.name || ''} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <span className="text-2xl">👤</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800">{butcher.name || 'নাম নেই'}</h3>
                      {butcher.phone && (
                        <p className="text-sm text-gray-600">📞 {butcher.phone}</p>
                      )}
                      {butcher.whatsapp && (
                        <p className="text-sm text-gray-600">💬 {butcher.whatsapp}</p>
                      )}
                      {butcher.thanas && butcher.thanas.length > 0 && (
                        <p className="text-sm text-gray-500">
                          📍 {butcher.thanas.map(t => t.nameBn).join(', ')}
                        </p>
                      )}
                      <div className="flex gap-4 mt-1 text-sm">
                        {butcher.cowPrice && (
                          <span className="text-primary">
                            গরু: {butcher.cowPriceType === 'PERCENTAGE' ? `${butcher.cowPrice}%` : `৳${butcher.cowPrice}`}
                          </span>
                        )}
                        {butcher.goatPrice && (
                          <span className="text-primary">
                            ছাগল: {butcher.goatPriceType === 'PERCENTAGE' ? `${butcher.goatPrice}%` : `৳${butcher.goatPrice}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleApprove(butcher.id)}
                      disabled={actionLoading === butcher.id}
                      className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                      {actionLoading === butcher.id ? '...' : '✅ অনুমোদন'}
                    </button>
                    <button
                      onClick={() => handleBlock(butcher.id)}
                      disabled={actionLoading === butcher.id}
                      className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                      {actionLoading === butcher.id ? '...' : '❌ ব্লক'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">দ্রুত অ্যাকশন</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/admin/users')}
              className="p-4 bg-gray-100 rounded-lg text-center hover:bg-gray-200 transition-colors"
            >
              <span className="text-2xl block mb-1">👥</span>
              <span className="text-sm text-gray-700">ব্যবহারকারী</span>
            </button>
            <button
              onClick={() => router.push('/admin/locations')}
              className="p-4 bg-gray-100 rounded-lg text-center hover:bg-gray-200 transition-colors"
            >
              <span className="text-2xl block mb-1">📍</span>
              <span className="text-sm text-gray-700">এলাকা</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color?: 'success' | 'warning' }) {
  const colorClass = color === 'success' ? 'text-green-600' : color === 'warning' ? 'text-yellow-600' : 'text-gray-800';
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
