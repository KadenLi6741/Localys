'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MenuList } from '@/components/MenuList';
import { getOwnerBusiness, type ManagerBusiness } from '@/lib/supabase/manager';
import { ManagerHeader, LoadingRow } from '../_components/ui';

export default function ManagerMenu() {
  const { user } = useAuth();
  const [business, setBusiness] = useState<ManagerBusiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const b = await getOwnerBusiness(user.id);
      if (!cancelled) {
        setBusiness(b);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div>
      <ManagerHeader title="Menu / Products" description="Create, edit and delete the items your business lists." />
      {loading || !user ? (
        <LoadingRow label="Loading your items…" />
      ) : (
        <div className="rounded-[16px] border border-border bg-card p-5 shadow-soft">
          <MenuList
            userId={user.id}
            businessId={business?.id}
            businessName={business?.business_name}
            isOwnProfile
          />
        </div>
      )}
    </div>
  );
}
