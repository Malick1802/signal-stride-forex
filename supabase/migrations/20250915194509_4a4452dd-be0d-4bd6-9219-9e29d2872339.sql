-- Simple update to support ULTRA level in app_settings
-- Just update the function to handle ULTRA without constraint changes

CREATE OR REPLACE FUNCTION public.update_app_setting(setting_name text, setting_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    CASE setting_name
        WHEN 'signal_threshold_level' THEN
            -- Validate the threshold level
            IF setting_value NOT IN ('HIGH', 'MEDIUM', 'LOW', 'ULTRA') THEN
                RAISE EXCEPTION 'Invalid signal threshold level. Must be HIGH, MEDIUM, LOW, or ULTRA';
            END IF;
            
            UPDATE app_settings 
            SET signal_threshold_level = setting_value,
                updated_at = NOW()
            WHERE singleton = true;
            
            -- Insert if no record exists
            IF NOT FOUND THEN
                INSERT INTO app_settings (singleton, signal_threshold_level, updated_at)
                VALUES (true, setting_value, NOW());
            END IF;
        ELSE
            RAISE EXCEPTION 'Unknown setting name: %', setting_name;
    END CASE;
END;
$function$;