import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const invitationSchema = z.object({
  companyId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'member']),
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { companyId, email, role } = invitationSchema.parse(body)

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('company_members')
      .select('id')
      .eq('company_id', companyId)
      .eq('email', email)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this company' },
        { status: 400 }
      )
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('company_invitations')
      .select('id')
      .eq('company_id', companyId)
      .eq('email', email)
      .single()

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      )
    }

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('company_invitations')
      .insert([
        {
          company_id: companyId,
          email,
          role,
          status: 'pending',
        },
      ])
      .select()
      .single()

    if (error) {
      throw error
    }

    // TODO: Send invitation email
    // This would typically be handled by a background job/queue
    // For now, we'll just return success

    return NextResponse.json(invitation)
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const { data: invitations, error } = await supabase
      .from('company_invitations')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'pending')

    if (error) {
      throw error
    }

    return NextResponse.json(invitations)
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('company_invitations')
      .delete()
      .eq('id', invitationId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invitation:', error)
    return NextResponse.json(
      { error: 'Failed to delete invitation' },
      { status: 500 }
    )
  }
} 