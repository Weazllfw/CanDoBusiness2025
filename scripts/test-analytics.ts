import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { clearTestAnalytics, verifyAnalyticsEvent } from '@/lib/test-analytics'
import { Analytics } from '@/lib/analytics'

async function testAnalytics() {
  const supabase = createClientComponentClient<Database>();
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user logged in');
      return;
    }

    console.log('Starting analytics test...');
    
    // Clear any existing test data
    await clearTestAnalytics(user.id);
    
    // Test 1: Regular user (no analytics should be collected)
    console.log('\nTest 1: Regular user analytics');
    await Analytics.trackPostView(user.id, 'test-post-1');
    const regularUserResult = await verifyAnalyticsEvent(user.id, 'post_view', { postId: 'test-post-1' });
    console.log('Regular user analytics collected:', regularUserResult);
    console.log('Expected: false');

    // Test 2: Upgrade to Pro
    console.log('\nUpgrading user to Pro...');
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        tier: 'PRO',
        status: 'active',
        created_at: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (subError) {
      console.error('Error upgrading to Pro:', subError);
      return;
    }

    // Test 3: Pro user post view
    console.log('\nTest 3: Pro user post view');
    await Analytics.trackPostView(user.id, 'test-post-2');
    const postViewResult = await verifyAnalyticsEvent(user.id, 'post_view', { postId: 'test-post-2' });
    console.log('Post view analytics collected:', postViewResult);
    console.log('Expected: true');

    // Test 4: Pro user media view
    console.log('\nTest 4: Pro user media view');
    await Analytics.trackMediaView(user.id, 'test-post-2', 0, 'image/jpeg');
    const mediaViewResult = await verifyAnalyticsEvent(user.id, 'media_view', {
      postId: 'test-post-2',
      mediaIndex: 0,
      mediaType: 'image/jpeg'
    });
    console.log('Media view analytics collected:', mediaViewResult);
    console.log('Expected: true');

    // Test 5: Pro user engagement
    console.log('\nTest 5: Pro user engagement');
    await Analytics.trackPostEngagement(user.id, 'test-post-2', 'like');
    const engagementResult = await verifyAnalyticsEvent(user.id, 'post_like', { postId: 'test-post-2' });
    console.log('Post engagement analytics collected:', engagementResult);
    console.log('Expected: true');

    // Test 6: Downgrade to Regular
    console.log('\nDowngrading user to Regular...');
    await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id);

    // Test 7: Regular user after downgrade
    console.log('\nTest 7: Regular user after downgrade');
    await Analytics.trackPostView(user.id, 'test-post-3');
    const regularAgainResult = await verifyAnalyticsEvent(user.id, 'post_view', { postId: 'test-post-3' });
    console.log('Regular user analytics collected:', regularAgainResult);
    console.log('Expected: false');

    // Clean up
    console.log('\nCleaning up test data...');
    await clearTestAnalytics(user.id);
    await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', user.id);

    console.log('\nAnalytics test complete!');

  } catch (error) {
    console.error('Error during analytics test:', error);
  }
}

// Run the test
testAnalytics(); 