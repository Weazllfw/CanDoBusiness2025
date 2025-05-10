// Defines the structure for company details fetched by admin functions
// Mirrors the SQL TYPE admin_company_details created in migrations.
export interface AdminCompanyDetails {
  company_id: string;
  company_name: string;
  company_created_at: string; // Consider Date type if parsing immediately
  company_website?: string | null;
  company_industry?: string | null;
  company_location?: string | null;
  owner_id: string;
  owner_email: string;
  profile_name?: string | null;
  verification_status: string;
  admin_notes?: string | null;
} 