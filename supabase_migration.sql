-- ─── Eoniix KYC API — Supabase Schema ────────────────────────────────────────
-- Run this in your Supabase SQL editor.
-- These tables plug directly into Don's eNumber-to-DID linking work.

-- Table 1: eNumber → DID mapping (Don is building this)
-- If Don has already created this table, skip or merge as needed.
CREATE TABLE IF NOT EXISTS enumbers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enumber       TEXT UNIQUE NOT NULL,
  did           TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 2: KYC verification records
CREATE TABLE IF NOT EXISTS kyc_verifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id  UUID UNIQUE NOT NULL,
  enumber          TEXT NOT NULL REFERENCES enumbers(enumber),
  did              TEXT NOT NULL,
  country          TEXT NOT NULL,
  id_type          TEXT NOT NULL,
  verified_at      TIMESTAMPTZ NOT NULL,
  aml_clear        BOOLEAN NOT NULL DEFAULT TRUE,
  credential_id    TEXT,
  status           TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'revoked', 'expired')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_kyc_enumber ON kyc_verifications(enumber);
CREATE INDEX IF NOT EXISTS idx_kyc_did ON kyc_verifications(did);
CREATE INDEX IF NOT EXISTS idx_enumber_did ON enumbers(enumber);

-- Row Level Security: enable on both tables
ALTER TABLE enumbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_verifications ENABLE ROW LEVEL SECURITY;

-- Only the service role (your backend) can read/write these tables.
-- No public access. No anon access.
CREATE POLICY "service_role_only_mapping" ON enumbers
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_only_kyc" ON kyc_verifications
  USING (auth.role() = 'service_role');

-- ─── Done. ────────────────────────────────────────────────────────────────────
-- Verify by running: SELECT * FROM enumbers LIMIT 1;
