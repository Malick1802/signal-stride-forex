-- Create helper functions for app settings management
CREATE OR REPLACE FUNCTION get_app_setting(setting_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    
    RETURN COALESCE(setting_value, 'HIGH');
END;
$$;

-- Create function to update app settings
CREATE OR REPLACE FUNCTION update_app_setting(setting_name text, setting_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    CASE setting_name
        WHEN 'signal_threshold_level' THEN
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
$$;