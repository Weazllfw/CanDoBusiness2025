-- supabase/migrations/20240510000000_configure_realtime_for_messages.sql

-- 1. Set REPLICA IDENTITY for the messages table
-- This is necessary for Realtime to properly track changes, especially for UPDATE/DELETE events.
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 2. Add the messages table to the Supabase Realtime publication
-- This ensures that changes to the table are broadcasted.
-- Supabase typically uses a publication named 'supabase_realtime'.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
        RAISE NOTICE 'Added public.messages to supabase_realtime publication.';
    ELSE
        RAISE NOTICE 'public.messages already in supabase_realtime publication. Skipping ADD.';
    END IF;
  ELSE
    RAISE WARNING 'Publication supabase_realtime does not exist. public.messages not added to any publication by this script.';
    -- As an alternative, older Supabase projects might use a publication per schema like 'public'.
    -- Consider enabling and adapting the logic below if 'supabase_realtime' is not the correct publication name for your project.
    /*
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'public' AND schemaname = 'public' AND tablename = 'messages'
        ) THEN
            ALTER PUBLICATION public ADD TABLE public.messages;
            RAISE NOTICE 'Added public.messages to public publication.';
        ELSE
            RAISE NOTICE 'public.messages already in public publication. Skipping ADD.';
        END IF;
    ELSE
        RAISE WARNING 'Publication public also does not exist.';
    END IF;
    */
  END IF;
END $$;

-- Grant select on pg_publication to postgres role if it's missing, which can cause issues with Realtime status checks.
-- This is usually default, but good to ensure.
GRANT SELECT ON TABLE pg_publication TO postgres;
GRANT SELECT ON TABLE pg_publication_tables TO postgres;

DO $$ BEGIN
  RAISE NOTICE 'Realtime configuration script for public.messages completed.';
END $$; 