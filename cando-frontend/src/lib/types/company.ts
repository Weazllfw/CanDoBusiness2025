export type CompanyStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface Company {
  id: string;
  name: string;
  displayName?: string;
  legalName?: string;
  tradingName?: string;
  businessNumber?: string;
  bio?: string;
  location?: string;
  website?: string;
  logoUrl?: string;
  foundedDate?: Date;
  status: CompanyStatus;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyInput {
  name: string;
  displayName?: string;
  legalName?: string;
  tradingName?: string;
  businessNumber?: string;
  bio?: string;
  location?: string;
  website?: string;
  logoUrl?: string;
  foundedDate?: Date;
}

export interface UpdateCompanyInput extends Partial<CreateCompanyInput> {
  id: string;
  status?: CompanyStatus;
  verificationStatus?: VerificationStatus;
}

export interface CompanyProfile extends Company {
  memberCount?: number;
  isVerified: boolean;
  // Add any computed or joined fields here
}

// Company search and filtering
export interface CompanyFilters {
  status?: CompanyStatus[];
  verificationStatus?: VerificationStatus[];
  location?: string;
  foundedAfter?: Date;
  foundedBefore?: Date;
  hasBusinessNumber?: boolean;
}

export interface CompanySearchParams extends CompanyFilters {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof Company;
  sortOrder?: 'asc' | 'desc';
} 