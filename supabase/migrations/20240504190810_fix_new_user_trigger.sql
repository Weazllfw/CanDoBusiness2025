-- Recreate the function to ensure it exists and is up-to-date
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public -- Explicitly set search path to public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name, email)
    VALUES (
        NEW.id, 
        NEW.raw_user_meta_data->>'full_name', -- Check if full_name is passed during signup
        NEW.email
    );
    RETURN NEW;
END;
$$;

-- Drop the potentially broken trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger correctly
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user(); 