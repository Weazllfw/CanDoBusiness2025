# CanDo Business Network - Supabase Backend

This directory contains the Supabase configuration and database migrations for the CanDo Business Network platform.

## Database Schema

The database consists of three main tables:

1. `companies` - Stores business profiles
2. `posts` - Stores social feed posts and RFQs
3. `messages` - Stores direct messages between companies

## Security

The database uses Row Level Security (RLS) policies to ensure:

- Companies are viewable by everyone
- Users can only modify their own companies
- Posts are viewable by everyone
- Only company owners can create/modify posts
- Messages are only viewable by the involved parties
- Users can only send messages from companies they own

## Setup Instructions

1. Create a new Supabase project
2. Install Supabase CLI
3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
4. Apply migrations:
   ```bash
   supabase db push
   ```

## Environment Variables

The following environment variables need to be set in the frontend application:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Database Functions

- `get_user_companies(user_id UUID)` - Returns all companies owned by a user

## Development Guidelines

1. Always create new migrations for schema changes
2. Test RLS policies thoroughly
3. Document any new functions or policies
4. Consider performance implications of new indexes 