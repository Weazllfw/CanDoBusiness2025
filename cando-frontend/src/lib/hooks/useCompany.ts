import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/types/database.types';
import type { CompanyWithMeta } from '@/lib/types/company';

export function useCompany() {
  const [companies, setCompanies] = useState<CompanyWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient<Database>();

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setCompanies([]);
        return;
      }

      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          verification_status:company_verifications(status)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const companiesWithMeta = data.map(company => ({
        ...company,
        verification_status: company.verification_status?.[0]?.status || 'unverified'
      })) as CompanyWithMeta[];

      setCompanies(companiesWithMeta);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCompanies = () => {
    return fetchCompanies();
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  return {
    companies,
    isLoading,
    refreshCompanies
  };
} 