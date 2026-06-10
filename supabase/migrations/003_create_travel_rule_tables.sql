DROP TABLE IF EXISTS travel_rule_transfers;

CREATE TABLE IF NOT EXISTS casp_registry (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  casp_id        TEXT        NOT NULL UNIQUE,
  casp_name      TEXT        NOT NULL,
  endpoint_url   TEXT        NOT NULL,
  public_key     TEXT        NOT NULL,
  country        TEXT        NOT NULL,
  fsca_licensed  BOOLEAN     NOT NULL DEFAULT false,
  active         BOOLEAN     NOT NULL DEFAULT true,
  registered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_casp_country ON casp_registry(country);
CREATE INDEX idx_casp_active  ON casp_registry(active);

CREATE TABLE IF NOT EXISTS travel_rule_records (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_transaction_id    TEXT        NOT NULL UNIQUE,
  originator_casp_id    TEXT        NOT NULL REFERENCES casp_registry(casp_id),
  beneficiary_casp_id   TEXT        NOT NULL REFERENCES casp_registry(casp_id),
  originator_enumber    TEXT,
  originator_wallet     TEXT        NOT NULL,
  beneficiary_wallet    TEXT        NOT NULL,
  amount_zar            NUMERIC     NOT NULL,
  chain_transaction_ref TEXT,
  payload_hash          TEXT        NOT NULL,
  threshold             TEXT        NOT NULL CHECK (threshold IN ('full', 'reduced')),
  status                TEXT        NOT NULL CHECK (status IN ('sent', 'received', 'failed')),
  transmitted_at        TIMESTAMPTZ NOT NULL,
  received_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_arc_originator_enumber ON travel_rule_records(originator_enumber);
CREATE INDEX idx_arc_originator_casp    ON travel_rule_records(originator_casp_id);
CREATE INDEX idx_arc_beneficiary_casp   ON travel_rule_records(beneficiary_casp_id);
CREATE INDEX idx_arc_status             ON travel_rule_records(status);
CREATE INDEX idx_arc_threshold          ON travel_rule_records(threshold);
CREATE INDEX idx_arc_transmitted_at     ON travel_rule_records(transmitted_at);
