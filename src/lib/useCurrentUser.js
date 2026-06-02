import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useCurrentUser() {
  const { data: user } = useQuery({
    queryKey: ['current_user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    user,
    isAdmin: user?.role === 'admin',
    isAiConsultant: user?.role === 'ai_consultant',
    isAccountManager: user?.role === 'account_manager',
  };
}