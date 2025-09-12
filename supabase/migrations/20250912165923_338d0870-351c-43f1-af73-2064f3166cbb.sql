-- Add threshold level validation and ensure default value
ALTER TABLE app_settings 
ADD CONSTRAINT signal_threshold_level_check 
CHECK (signal_threshold_level IN ('HIGH', 'MEDIUM', 'LOW'));

-- Update existing record to ensure it's HIGH (current behavior)
UPDATE app_settings SET signal_threshold_level = 'HIGH' WHERE singleton = true;

-- Insert default record if none exists
INSERT INTO app_settings (singleton, signal_threshold_level, updated_at)
SELECT true, 'HIGH', NOW()
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE singleton = true);