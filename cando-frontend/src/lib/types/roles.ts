export type CompanyRole = 'OWNER' | 'ADMIN' | 'RFQ_MANAGER' | 'SOCIAL_MANAGER' | 'MEMBER';
export type RoleStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED';

export interface UserCompanyRole {
  id: string;
  userId: string;
  companyId: string;
  role: CompanyRole;
  status: RoleStatus;
  invitedBy?: string;
  joinedAt: Date;
  customPermissions?: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoleInput {
  userId: string;
  companyId: string;
  role: CompanyRole;
  customPermissions?: Record<string, boolean>;
}

export interface UpdateRoleInput {
  id: string;
  role?: CompanyRole;
  status?: RoleStatus;
  customPermissions?: Record<string, boolean>;
}

export interface RoleWithUserDetails extends UserCompanyRole {
  user: {
    id: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  };
}

export interface RoleInvitation {
  id: string;
  email: string;
  companyId: string;
  role: CompanyRole;
  invitedBy: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  expiresAt: Date;
  createdAt: Date;
}

// Permission definitions
export interface CompanyPermissions {
  // Company management
  updateCompanyProfile: boolean;
  updateLegalInfo: boolean;
  manageTeam: boolean;
  
  // RFQ permissions
  viewRFQs: boolean;
  createRFQs: boolean;
  respondToRFQs: boolean;
  manageRFQs: boolean;
  
  // Social permissions
  updateSocialProfile: boolean;
  postUpdates: boolean;
  manageConnections: boolean;
  
  // Additional permissions can be added here
}

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<CompanyRole, Partial<CompanyPermissions>> = {
  OWNER: {
    updateCompanyProfile: true,
    updateLegalInfo: true,
    manageTeam: true,
    viewRFQs: true,
    createRFQs: true,
    respondToRFQs: true,
    manageRFQs: true,
    updateSocialProfile: true,
    postUpdates: true,
    manageConnections: true,
  },
  ADMIN: {
    updateCompanyProfile: true,
    updateLegalInfo: false,
    manageTeam: true,
    viewRFQs: true,
    createRFQs: true,
    respondToRFQs: true,
    manageRFQs: true,
    updateSocialProfile: true,
    postUpdates: true,
    manageConnections: true,
  },
  RFQ_MANAGER: {
    updateCompanyProfile: false,
    updateLegalInfo: false,
    manageTeam: false,
    viewRFQs: true,
    createRFQs: true,
    respondToRFQs: true,
    manageRFQs: true,
    updateSocialProfile: false,
    postUpdates: false,
    manageConnections: false,
  },
  SOCIAL_MANAGER: {
    updateCompanyProfile: false,
    updateLegalInfo: false,
    manageTeam: false,
    viewRFQs: true,
    createRFQs: false,
    respondToRFQs: false,
    manageRFQs: false,
    updateSocialProfile: true,
    postUpdates: true,
    manageConnections: true,
  },
  MEMBER: {
    updateCompanyProfile: false,
    updateLegalInfo: false,
    manageTeam: false,
    viewRFQs: true,
    createRFQs: false,
    respondToRFQs: false,
    manageRFQs: false,
    updateSocialProfile: false,
    postUpdates: false,
    manageConnections: false,
  },
}; 