import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/types/database.types';

type PublicCompany = Database['public']['Views']['public_companies']['Row'];

export function usePublicCompanies() {
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('public_companies')
        .select('*')
        .order('name');

      if (error) throw error;

      setCompanies(data || []);
    } catch (err) {
      console.error('Error fetching public companies:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch companies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  return {
    companies,
    isLoading,
    error,
    refreshCompanies: fetchCompanies
  };
} 