'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { OrderHistory } from '@/components/OrderHistory';

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersContent />
    </ProtectedRoute>
  );
}

function OrdersContent() {
  const { user } = useAuth();
  const [isBusiness, setIsBusiness] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('type')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setIsBusiness(!!data?.type);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
        <Link href="/profile" className="mb-4 inline-flex items-center gap-1.5 text-body-sm font-semibold text-foreground hover:text-primary">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Back to profile
        </Link>
        <h1 className="mb-6 text-heading-sm font-bold text-foreground">Order History</h1>
        {user && <OrderHistory userId={user.id} isBusiness={isBusiness} />}
      </div>
    </div>
  );
}
