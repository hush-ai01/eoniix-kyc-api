CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_name TEXT NOT NULL CHECK (btrim(partner_name) <> ''),
    key_prefix TEXT NOT NULL UNIQUE CHECK (btrim(key_prefix) <> ''),
    key_hash BYTEA NOT NULL UNIQUE,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    casp_id TEXT REFERENCES casp_registry(casp_id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS api_keys_key_prefix_idx ON api_keys (key_prefix);
CREATE INDEX IF NOT EXISTS api_keys_status_idx ON api_keys (status);
CREATE INDEX IF NOT EXISTS api_keys_casp_id_idx ON api_keys (casp_id);

CREATE TABLE IF NOT EXISTS api_key_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (btrim(event_type) <> ''),
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'
);
