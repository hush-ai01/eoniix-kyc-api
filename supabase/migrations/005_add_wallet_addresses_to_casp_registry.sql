ALTER TABLE casp_registry
ADD COLUMN IF NOT EXISTS wallet_addresses TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX idx_casp_wallet_addresses ON casp_registry USING GIN(wallet_addresses);
