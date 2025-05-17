import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

/**
 * Submits a flag for a piece of content (post or comment).
 *
 * @param contentId The ID of the post or comment being flagged.
 * @param contentType The type of content: 'post' or 'comment'.
 * @param reason An optional reason provided by the user for flagging.
 * @param userId The ID of the user submitting the flag.
 * @returns An object with data (the newly created flag record) or an error.
 */
export const submitFlag = async (
  contentId: string,
  contentType: 'post' | 'comment',
  reason: string | null,
  userId: string
) => {
  const supabase = createClientComponentClient<Database>();

  if (!userId) {
    console.error('User ID is required to submit a flag.');
    return { data: null, error: { message: 'User not authenticated.' } };
  }
  if (!contentId) {
    console.error('Content ID is required to submit a flag.');
    return { data: null, error: { message: 'Content ID missing.' } };
  }

  let flagData: any = {
    user_id: userId,
    reason: reason,
    // status will default to 'pending_review' in the database
  };

  let tableName: string;

  if (contentType === 'post') {
    tableName = 'post_flags';
    flagData.post_id = contentId;
  } else if (contentType === 'comment') {
    tableName = 'comment_flags';
    flagData.comment_id = contentId;
  } else {
    console.error('Invalid content type for flagging.');
    return { data: null, error: { message: 'Invalid content type.' } };
  }

  const { data, error } = await supabase
    .from(tableName)
    .insert(flagData)
    .select()
    .single();

  if (error) {
    console.error(`Error submitting ${contentType} flag:`, error);
    // Check for unique constraint violation (user already flagged this content)
    if (error.code === '23505') { // Postgres unique violation error code
      return { data: null, error: { message: 'You have already flagged this content.' } };
    }
  }

  return { data, error };
}; 