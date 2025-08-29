-- Add language_preference column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en';

-- Update any existing null values to 'en' 
UPDATE profiles SET language_preference = 'en' WHERE language_preference IS NULL;