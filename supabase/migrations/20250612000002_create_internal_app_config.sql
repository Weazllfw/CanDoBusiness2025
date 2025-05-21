-- Migration: create_internal_app_config
-- Description: Creates an internal table for application configuration and a helper function to retrieve settings.

-- Create schema if it doesn't exist (though it should)
CREATE SCHEMA IF NOT EXISTS internal;

-- Table for application configuration
CREATE TABLE IF NOT EXISTS internal.app_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE internal.app_config IS 'Stores internal application configuration settings.';
COMMENT ON COLUMN internal.app_config.key IS 'The unique key for the configuration setting (e.g., "admin_email").';
COMMENT ON COLUMN internal.app_config.value IS 'The value of the configuration setting.';
COMMENT ON COLUMN internal.app_config.description IS 'A brief description of what the configuration setting is for.';

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION internal.set_updated_at_on_app_config()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_config_updated_at ON internal.app_config;
CREATE TRIGGER trg_app_config_updated_at
BEFORE UPDATE ON internal.app_config
FOR EACH ROW
EXECUTE FUNCTION internal.set_updated_at_on_app_config();

-- Insert initial admin_email configuration
INSERT INTO internal.app_config (key, value, description)
VALUES ('admin_email', 'rmarshall@itmarshall.net', 'The primary email address used for system-generated administrative notifications.')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Helper function to retrieve a configuration value
CREATE OR REPLACE FUNCTION internal.get_app_config(p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE -- Can be STABLE as config values are not expected to change within a single query execution.
SECURITY DEFINER -- To allow access to internal.app_config from other security contexts if needed.
AS $$
DECLARE
    v_value TEXT;
BEGIN
    SELECT value INTO v_value FROM internal.app_config WHERE key = p_key;
    RETURN v_value;
END;
$$;

COMMENT ON FUNCTION internal.get_app_config(TEXT) IS 'Retrieves a configuration value from internal.app_config by its key.';

-- Grant execute on the helper function (selectively, if needed, otherwise internal functions are often not granted broadly)
-- For now, assuming RPCs using this will be SECURITY DEFINER and can access internal schema objects.
-- If public RPCs need to call this and are SECURITY INVOKER, then authenticated role would need execute.
-- GRANT EXECUTE ON FUNCTION internal.get_app_config(TEXT) TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'Table internal.app_config and helper function internal.get_app_config created/updated.';
END $$; 