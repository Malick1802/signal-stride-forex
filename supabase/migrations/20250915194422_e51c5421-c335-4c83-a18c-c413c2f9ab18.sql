-- Add ULTRA threshold level to app_settings
ALTER TABLE public.app_settings 
ALTER COLUMN signal_threshold_level TYPE TEXT;

-- Update the check constraint to include ULTRA
-- Note: We'll use a validation trigger instead of CHECK constraint for better flexibility
DROP CONSTRAINT IF EXISTS app_settings_signal_threshold_level_check;

-- Update the get_app_setting function to handle ULTRA level
CREATE OR REPLACE FUNCTION public.get_app_setting(setting_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    setting_value text;
BEGIN
    CASE setting_name
        WHEN 'signal_threshold_level' THEN
            SELECT signal_threshold_level INTO setting_value 
            FROM app_settings 
            WHERE singleton = true;
        ELSE
            RETURN NULL;
    END CASE;
    
    -- Default to HIGH if no setting found, allow ULTRA as valid value
    RETURN COALESCE(setting_value, 'HIGH');
END;
$function$;