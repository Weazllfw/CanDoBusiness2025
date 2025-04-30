import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  UserCompanyRole, 
  CreateRoleInput, 
  UpdateRoleInput, 
  RoleWithUserDetails,
  RoleInvitation,
  CompanyRole
} from '../types';

const supabase = createClientComponentClient();

export async function createRole(input: CreateRoleInput): Promise<UserCompanyRole> {
  const { data, error } = await supabase
    .from('user_company_roles')
    .insert([{
      ...input,
      status: 'PENDING',
      joinedAt: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateRole(input: UpdateRoleInput): Promise<UserCompanyRole> {
  const { data, error } = await supabase
    .from('user_company_roles')
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

export async function getRoleById(id: string): Promise<RoleWithUserDetails | null> {
  const { data, error } = await supabase
    .from('user_company_roles')
    .select(`
      *,
      user:users (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.full_name,
      avatarUrl: data.user.avatar_url
    }
  };
}

export async function getCompanyRoles(companyId: string): Promise<RoleWithUserDetails[]> {
  const { data, error } = await supabase
    .from('user_company_roles')
    .select(`
      *,
      user:users (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('company_id', companyId);

  if (error) throw error;

  return (data || []).map(role => ({
    ...role,
    user: {
      id: role.user.id,
      email: role.user.email,
      fullName: role.user.full_name,
      avatarUrl: role.user.avatar_url
    }
  }));
}

export async function getUserRoles(userId: string): Promise<UserCompanyRole[]> {
  const { data, error } = await supabase
    .from('user_company_roles')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

export async function inviteUserToCompany(
  email: string,
  companyId: string,
  role: CompanyRole,
  invitedBy: string
): Promise<RoleInvitation> {
  // Create invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('role_invitations')
    .insert([{
      email,
      companyId,
      role,
      invitedBy,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }])
    .select()
    .single();

  if (inviteError) throw inviteError;

  // TODO: Send invitation email
  // This would typically be handled by a Supabase Edge Function or similar

  return invitation;
}

export async function acceptInvitation(invitationId: string, userId: string): Promise<UserCompanyRole> {
  // Start a transaction
  const { data: invitation, error: getError } = await supabase
    .from('role_invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (getError) throw getError;
  if (!invitation) throw new Error('Invitation not found');
  if (invitation.status !== 'PENDING') throw new Error('Invitation is no longer valid');

  // Create the role
  const { data: role, error: roleError } = await supabase
    .from('user_company_roles')
    .insert([{
      userId,
      companyId: invitation.companyId,
      role: invitation.role,
      status: 'ACTIVE',
      invitedBy: invitation.invitedBy,
      joinedAt: new Date().toISOString()
    }])
    .select()
    .single();

  if (roleError) throw roleError;

  // Update invitation status
  const { error: updateError } = await supabase
    .from('role_invitations')
    .update({ status: 'ACCEPTED' })
    .eq('id', invitationId);

  if (updateError) throw updateError;

  return role;
}

export async function removeRole(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_company_roles')
    .update({ status: 'REMOVED' })
    .eq('id', id);

  if (error) throw error;
} 