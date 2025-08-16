-- Add language preference column to profiles table
ALTER TABLE public.profiles ADD COLUMN language_preference TEXT DEFAULT 'en';