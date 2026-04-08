-- Migration: agent_clients source tracking + agent_invitations table
-- Run BEFORE deploying code changes that write the source column.

-- 1. Add source column to agent_clients (nullable, default 'unknown')
ALTER TABLE agent_clients
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'unknown';

-- 2. agent_invitations — for buyers whose agent is not yet on homey
CREATE TABLE IF NOT EXISTS agent_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_email text NOT NULL,
  agent_name text,
  invited_by_client_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  preview_token text NOT NULL,  -- signed JWT, 48h expiry, scoped to non-sensitive fields
  created_at timestamptz DEFAULT now(),
  converted_at timestamptz,     -- set when agent signs up and gets linked
  UNIQUE(agent_email, invited_by_client_id)
);

-- Enable RLS
ALTER TABLE agent_invitations ENABLE ROW LEVEL SECURITY;

-- Buyers can create invitations for themselves only
CREATE POLICY "buyer_create_invitations" ON agent_invitations
  FOR INSERT WITH CHECK (invited_by_client_id = auth.uid());

-- Buyers can view their own invitations
CREATE POLICY "buyer_view_own_invitations" ON agent_invitations
  FOR SELECT USING (invited_by_client_id = auth.uid());

-- 3. Trigger: when an agent signs up, auto-convert pending invitations
CREATE OR REPLACE FUNCTION handle_agent_invitation_on_signup()
RETURNS trigger AS $$
BEGIN
  -- Only run if the new user is an agent (check user_metadata)
  IF (NEW.raw_user_meta_data->>'role') = 'agent' THEN
    -- Mark matching invitations as converted
    UPDATE agent_invitations
    SET converted_at = now()
    WHERE agent_email = NEW.email AND converted_at IS NULL;

    -- Create agent_clients records for each converted invitation
    INSERT INTO agent_clients (agent_id, client_id, status, source)
    SELECT NEW.id, invited_by_client_id, 'pending', 'buyer_search'
    FROM agent_invitations
    WHERE agent_email = NEW.email
      AND converted_at IS NOT NULL
    ON CONFLICT (agent_id, client_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_agent_signup_link_invitations
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_agent_invitation_on_signup();
