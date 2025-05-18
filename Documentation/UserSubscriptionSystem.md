# User Subscription System

## 1. Overview

The User Subscription System manages user subscription tiers and integrates with Stripe for payment processing. It supports multiple subscription levels with different feature sets and handles the complete subscription lifecycle.

## 2. Database Schema

### 2.1. `user_subscriptions` Table

*   **Core Fields:**
    ```sql
    CREATE TABLE public.user_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
        tier text NOT NULL,
        stripe_subscription_id text UNIQUE,
        stripe_customer_id text,
        status text NOT NULL,
        current_period_start timestamptz NULL,
        current_period_end timestamptz NULL,
        cancel_at_period_end boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
    );
    ```

### 2.2. Subscription Tiers
*   **REGULAR (Free):**
    *   Basic platform access
    *   Limited feature set
    *   No Stripe integration required

*   **PREMIUM:**
    *   Enhanced features
    *   Priority support
    *   Stripe-managed billing

*   **PRO:**
    *   Full platform access
    *   Advanced features
    *   Premium support
    *   Stripe-managed billing

### 2.3. Subscription Status
*   `active`: Current subscription
*   `canceled`: Terminated subscription
*   `past_due`: Payment issues
*   `incomplete`: Setup pending
*   `free_tier`: Basic access

## 3. Security

### 3.1. RLS Policies

*   **User Access:**
    ```sql
    -- Users can read their own subscription
    CREATE POLICY "Allow users to read their own subscription"
    ON public.user_subscriptions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
    ```

*   **Service Role Access:**
    ```sql
    -- Service role can manage subscriptions
    CREATE POLICY "Allow service_role to insert subscriptions"
    ON public.user_subscriptions
    FOR INSERT
    TO service_role
    WITH CHECK (true);
    ```

### 3.2. Data Protection
*   Stripe IDs securely stored
*   Payment info handled by Stripe
*   Audit logging enabled
*   Secure webhook processing

## 4. Stripe Integration

### 4.1. Customer Management
*   Customer creation
*   Payment method storage
*   Billing information
*   Customer portal access

### 4.2. Subscription Management
*   Subscription creation
*   Plan changes
*   Cancellation handling
*   Renewal processing

### 4.3. Webhook Handling
*   Payment success/failure
*   Subscription updates
*   Customer updates
*   Dispute management

## 5. Feature Access Control

### 5.1. Tier-Based Features
*   Feature flags system
*   Access level checks
*   Usage limitations
*   Premium content access

### 5.2. Implementation
```typescript
interface SubscriptionFeatures {
    maxCompanies: number;
    maxRFQs: number;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
}

const TIER_FEATURES: Record<string, SubscriptionFeatures> = {
    REGULAR: {
        maxCompanies: 1,
        maxRFQs: 5,
        advancedAnalytics: false,
        prioritySupport: false,
        customBranding: false
    },
    PREMIUM: {
        maxCompanies: 3,
        maxRFQs: 20,
        advancedAnalytics: true,
        prioritySupport: false,
        customBranding: false
    },
    PRO: {
        maxCompanies: 10,
        maxRFQs: 100,
        advancedAnalytics: true,
        prioritySupport: true,
        customBranding: true
    }
};
```

## 6. Subscription Lifecycle

### 6.1. Initial Setup
1.  User selects plan
2.  Stripe checkout session
3.  Payment processing
4.  Subscription activation

### 6.2. Management
1.  Plan upgrades/downgrades
2.  Payment method updates
3.  Billing cycle tracking
4.  Usage monitoring

### 6.3. Cancellation
1.  Cancellation request
2.  Grace period handling
3.  Feature access removal
4.  Data retention policy

## 7. Error Handling

### 7.1. Payment Failures
*   Retry logic
*   User notifications
*   Grace period
*   Account restrictions

### 7.2. System Errors
*   Webhook failures
*   Sync issues
*   Data inconsistencies
*   Recovery procedures

## 8. Notifications

### 8.1. User Notifications
*   Payment reminders
*   Subscription changes
*   Feature updates
*   Trial expiration

### 8.2. Admin Notifications
*   Payment failures
*   Subscription changes
*   System issues
*   Usage alerts

## 9. Analytics

### 9.1. Subscription Metrics
*   Active subscriptions
*   Conversion rates
*   Churn analysis
*   Revenue tracking

### 9.2. Usage Analytics
*   Feature utilization
*   User engagement
*   Upgrade patterns
*   Retention metrics

## 10. Future Enhancements

*   Custom plan builder
*   Team subscriptions
*   Usage-based billing
*   Multi-currency support
*   Referral program
*   Subscription bundles