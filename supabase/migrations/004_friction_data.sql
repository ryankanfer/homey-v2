ALTER TABLE public.buyer_profiles
  ADD COLUMN IF NOT EXISTS friction_data JSONB NOT NULL DEFAULT '{}';

ALTER TABLE public.renter_profiles
  ADD COLUMN IF NOT EXISTS friction_data JSONB NOT NULL DEFAULT '{}';
