import { CommunitiesProvider } from '@/contexts/CommunitiesContext';

export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
  return <CommunitiesProvider>{children}</CommunitiesProvider>;
}
