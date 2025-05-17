DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
-- Migration to create the user_subscriptions table and set up initial RLS policies

-- 1. Create the user_subscriptions table
CREATE TABLE public.user_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    tier text NOT NULL, -- e.g., 'REGULAR', 'PREMIUM', 'PRO' (REGULAR might not be stored or have specific status)
    stripe_subscription_id text UNIQUE, -- Can be NULL if tier is 'REGULAR' and not managed by Stripe
    stripe_customer_id text, -- Can be NULL if tier is 'REGULAR'
    status text NOT NULL, -- e.g., 'active', 'canceled', 'past_due', 'incomplete', 'free_tier'
    current_period_start timestamp with time zone NULL,
    current_period_end timestamp with time zone NULL,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add comments to table and columns for clarity
COMMENT ON TABLE public.user_subscriptions IS 'Tracks user subscription tiers and Stripe information.';
COMMENT ON COLUMN public.user_subscriptions.user_id IS 'The user associated with this subscription. Each user has one primary subscription record.';
COMMENT ON COLUMN public.user_subscriptions.tier IS 'Subscription tier (e.g., ''REGULAR'', ''PREMIUM'', ''PRO'').';
COMMENT ON COLUMN public.user_subscriptions.stripe_subscription_id IS 'Stripe''s unique ID for the subscription. NULL for non-Stripe managed tiers.';
COMMENT ON COLUMN public.user_subscriptions.stripe_customer_id IS 'Stripe''s unique ID for the customer. NULL for non-Stripe managed tiers.';
COMMENT ON COLUMN public.user_subscriptions.status IS 'Current status (e.g., ''active'', ''canceled'', ''past_due'', ''incomplete'', ''free_tier'').';
COMMENT ON COLUMN public.user_subscriptions.current_period_start IS 'Start date of the current billing cycle from Stripe.';
COMMENT ON COLUMN public.user_subscriptions.current_period_end IS 'End date of the current billing cycle from Stripe.';
COMMENT ON COLUMN public.user_subscriptions.cancel_at_period_end IS 'If true, the subscription will be canceled at the end of the current period via Stripe.';

-- Create indexes for performance
DROP INDEX IF EXISTS idx_user_subscriptions_user_id;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id); -- Already unique, but good for FK lookups
DROP INDEX IF EXISTS idx_user_subscriptions_stripe_subscription_id;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id ON public.user_subscriptions(stripe_subscription_id);
DROP INDEX IF EXISTS idx_user_subscriptions_status;
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for user_subscriptions

-- Users can read their own subscription details
DROP POLICY IF EXISTS "Allow users to read their own subscription" ON public.user_subscriptions;
CREATE POLICY "Allow users to read their own subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT, UPDATE, DELETE are highly restricted. These should be managed by backend (e.g. Stripe webhooks via service_role or specific admin RPCs).
-- As a placeholder, only service_role can modify for now. This will be refined.
DROP POLICY IF EXISTS "Allow service_role to insert subscriptions" ON public.user_subscriptions;
CREATE POLICY "Allow service_role to insert subscriptions"
ON public.user_subscriptions
FOR INSERT
TO service_role -- Or a specific role for Stripe webhook processing
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role to update subscriptions" ON public.user_subscriptions;
CREATE POLICY "Allow service_role to update subscriptions"
ON public.user_subscriptions
FOR UPDATE
TO service_role -- Or a specific role for Stripe webhook processing
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role to delete subscriptions" ON public.user_subscriptions;
CREATE POLICY "Allow service_role to delete subscriptions"
ON public.user_subscriptions
FOR DELETE
TO service_role -- Or a specific role for Stripe webhook processing
USING (true);

-- Admins might need read access to all subscriptions via a secure view or SECURITY DEFINER function in the future.

-- Trigger to update updated_at on user_subscriptions update
-- Uses the same function defined in 20250520000000_create_posts_table.sql migration
DROP TRIGGER IF EXISTS handle_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER handle_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at(); 