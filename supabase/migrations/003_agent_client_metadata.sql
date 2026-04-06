ALTER TABLE agent_clients ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
