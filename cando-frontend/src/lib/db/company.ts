import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Company, 
  CreateCompanyInput, 
  UpdateCompanyInput, 
  CompanySearchParams,
  CompanyProfile
} from '../types';

const supabase = createClientComponentClient();

export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .insert([{
      ...input,
      status: 'ACTIVE',
      verificationStatus: 'UNVERIFIED'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCompany(input: UpdateCompanyInput): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update({
      ...input,
      updatedAt: new Date().toISOString()
    })
    .eq('id', input.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCompanyById(id: string): Promise<CompanyProfile | null> {
  // Get company details
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (companyError) throw companyError;
  if (!company) return null;

  // Get member count
  const { count: memberCount, error: countError } = await supabase
    .from('user_company_roles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', id)
    .eq('status', 'ACTIVE');

  if (countError) throw countError;

  return {
    ...company,
    memberCount: memberCount || 0,
    isVerified: company.verificationStatus === 'VERIFIED'
  };
}

export async function searchCompanies(params: CompanySearchParams): Promise<{
  companies: Company[];
  total: number;
}> {
  let query = supabase
    .from('companies')
    .select('*', { count: 'exact' });

  // Apply filters
  if (params.status?.length) {
    query = query.in('status', params.status);
  }
  
  if (params.verificationStatus?.length) {
    query = query.in('verification_status', params.verificationStatus);
  }

  if (params.location) {
    query = query.ilike('location', `%${params.location}%`);
  }

  if (params.foundedAfter) {
    query = query.gte('founded_date', params.foundedAfter.toISOString());
  }

  if (params.foundedBefore) {
    query = query.lte('founded_date', params.foundedBefore.toISOString());
  }

  if (params.hasBusinessNumber !== undefined) {
    if (params.hasBusinessNumber) {
      query = query.not('business_number', 'is', null);
    } else {
      query = query.is('business_number', null);
    }
  }

  if (params.query) {
    query = query.or(`
      name.ilike.%${params.query}%,
      legal_name.ilike.%${params.query}%,
      trading_name.ilike.%${params.query}%,
      business_number.ilike.%${params.query}%
    `);
  }

  // Apply pagination
  const page = params.page || 1;
  const limit = params.limit || 10;
  const start = (page - 1) * limit;

  query = query
    .order(params.sortBy || 'created_at', {
      ascending: params.sortOrder === 'asc'
    })
    .range(start, start + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;
  return {
    companies: data || [],
    total: count || 0
  };
}

export async function deleteCompany(id: string): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function verifyCompany(id: string): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update({
      verificationStatus: 'VERIFIED',
      updatedAt: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
} 