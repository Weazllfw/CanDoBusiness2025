// Defines the structure for company details fetched by admin functions
// Mirrors the SQL TYPE admin_company_details created in migrations.
export interface AdminCompanyDetails {
  company_id: string;
  company_name: string;
  company_created_at: string; // Timestamptz
  company_website?: string | null;
  company_industry?: string | null;
  // company_location is removed, replaced by structured address fields
  owner_id: string; // UUID
  owner_email: string;
  profile_name?: string | null;
  verification_status: string; // character varying(20)
  admin_notes?: string | null;
  self_attestation_completed?: boolean | null;
  business_number?: string | null;
  public_presence_links?: string[] | null;
  street_address?: string | null;
  city?: string | null;
  province?: string | null; // character varying(2)
  postal_code?: string | null; // character varying(7)
  major_metropolitan_area?: string | null;
  other_metropolitan_area_specify?: string | null;
  contact_person_name?: string | null;
  contact_person_email?: string | null;
  contact_person_phone?: string | null;
  services?: string[] | null;
} 