'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface User {
  id: string;
  phone: string;
  name?: string;
  userType: 'ADMIN' | 'CUSTOMER' | 'BUTCHER';
  active: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const PAGE_SIZE = 100;
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
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
      // Reset pagination whenever the filter changes
      setUsers([]);
      setPage(0);
      setHasMore(true);
      loadUsers(0, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, router, filter]);

  const loadUsers = async (pageToLoad: number, replace: boolean) => {
    if (replace) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('type', filter);
      params.set('page', String(pageToLoad));
      params.set('limit', String(PAGE_SIZE));
      const res = await api.get<User[]>(`/admin/users?${params.toString()}`);
      if (res.data) {
        setUsers(prev => (replace ? res.data! : [...prev, ...res.data!]));
        setHasMore(res.data.length === PAGE_SIZE);
        setPage(pageToLoad);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  const handleLoadMore = () => loadUsers(page + 1, false);

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    setActionLoading(userId);
    try {
      await api.patch(`/admin/users/${userId}/active`, { active: !currentActive });
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, active: !currentActive } : u
      ));
    } catch (error) {
      alert('আপডেট ব্যর্থ');
    }
    setActionLoading(null);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই ব্যবহারকারীকে মুছে ফেলতে চান?')) return;

    setActionLoading(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      alert('মুছে ফেলা ব্যর্থ');
    }
    setActionLoading(null);
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'ADMIN': return 'অ্যাডমিন';
      case 'CUSTOMER': return 'কাস্টমার';
      case 'BUTCHER': return 'কসাই';
      default: return type;
    }
  };

  const getUserTypeBadge = (type: string) => {
    switch (type) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700';
      case 'CUSTOMER': return 'bg-blue-100 text-blue-700';
      case 'BUTCHER': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-2xl">←</button>
          <h1 className="text-xl font-bold">ব্যবহারকারী</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('')}
            className={`px-4 py-2 rounded-full text-sm ${!filter ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            সবাই
          </button>
          <button
            onClick={() => setFilter('CUSTOMER')}
            className={`px-4 py-2 rounded-full text-sm ${filter === 'CUSTOMER' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            কাস্টমার
          </button>
          <button
            onClick={() => setFilter('BUTCHER')}
            className={`px-4 py-2 rounded-full text-sm ${filter === 'BUTCHER' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            কসাই
          </button>
        </div>

        {/* Users List */}
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800">{u.name || 'নাম নেই'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getUserTypeBadge(u.userType)}`}>
                      {getUserTypeLabel(u.userType)}
                    </span>
                    {!u.active && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                        নিষ্ক্রিয়
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">📞 {u.phone}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    যোগদান: {new Date(u.createdAt).toLocaleDateString('bn-BD')}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {u.userType === 'BUTCHER' && (
                    <button
                      onClick={() => router.push(`/admin/butchers/${u.id}/availability`)}
                      className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-700"
                      title="সময়সূচি পরিবর্তন"
                    >
                      🗓️ সময়সূচি
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleActive(u.id, u.active)}
                    disabled={actionLoading === u.id || u.userType === 'ADMIN'}
                    className={`px-3 py-1 rounded text-sm ${u.active ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'} disabled:opacity-50`}
                  >
                    {u.active ? 'নিষ্ক্রিয়' : 'সক্রিয়'}
                  </button>
                  {u.userType !== 'ADMIN' && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      disabled={actionLoading === u.id}
                      className="px-3 py-1 rounded text-sm bg-red-100 text-red-700 disabled:opacity-50"
                    >
                      মুছুন
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <p className="text-center text-gray-500 py-8">কোনো ব্যবহারকারী পাওয়া যায়নি</p>
          )}

          {users.length > 0 && hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 disabled:opacity-50"
            >
              {loadingMore ? 'লোড হচ্ছে...' : 'আরো দেখুন'}
            </button>
          )}

          {users.length > 0 && !hasMore && (
            <p className="text-center text-gray-400 py-4 text-sm">সব ব্যবহারকারী দেখানো হয়েছে · মোট {users.length} জন</p>
          )}
        </div>
      </div>
    </main>
  );
}
