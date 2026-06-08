import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ENumberRecord = {
  id: string;
  e_number: string;
  did: string | null;
};

type Database = {
  public: {
    Tables: {
      enumbers: {
        Row: ENumberRecord & {
          did_created_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          e_number: string;
          did?: string | null;
          did_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          e_number?: string;
          did?: string | null;
          did_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type Supabase = ReturnType<typeof createClient<Database>>;

type CreateIdentityResponse = {
  identifier?: string;
};

const jsonHeaders = {
  "Content-Type": "application/json",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return Deno.env.get(name)?.trim() || fallback;
}

function assertIssuerUrlAllowed(url: string): void {
  const parsed = new URL(url);

  if (parsed.protocol === "https:") {
    return;
  }

  const allowInsecure = Deno.env.get("ALLOW_INSECURE_ISSUER_URL") === "true";
  const localHosts = new Set([
    "localhost",
    "127.0.0.1",
    "host.docker.internal",
  ]);

  if (
    parsed.protocol === "http:" && allowInsecure &&
    localHosts.has(parsed.hostname)
  ) {
    return;
  }

  throw new Error(
    "ISSUER_API_URL must use HTTPS unless ALLOW_INSECURE_ISSUER_URL=true for a local issuer host",
  );
}

function normalizeIssuerUrl(url: string): string {
  const normalized = url.replace(/\/+$/, "");
  assertIssuerUrlAllowed(normalized);
  return normalized;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value);
}

function createIdentityPayload(displayName: string): Record<string, unknown> {
  const credentialStatusType = Deno.env.get("ISSUER_CREDENTIAL_STATUS_TYPE")
    ?.trim();

  return {
    didMetadata: {
      method: optionalEnv("ISSUER_DID_METHOD", "polygonid"),
      blockchain: optionalEnv("ISSUER_DID_BLOCKCHAIN", "polygon"),
      network: optionalEnv("ISSUER_DID_NETWORK", "amoy"),
      type: optionalEnv("ISSUER_DID_KEY_TYPE", "BJJ"),
    },
    ...(credentialStatusType ? { credentialStatusType } : {}),
    displayName,
  };
}

async function fetchExistingENumber(
  supabase: Supabase,
  enumberId: string,
): Promise<ENumberRecord> {
  const { data, error } = await supabase
    .from("enumbers")
    .select("id,e_number,did")
    .eq("id", enumberId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "eNumber record not found");
  }

  if (!data.e_number || typeof data.e_number !== "string") {
    throw new Error("eNumber record is missing e_number");
  }

  return data as ENumberRecord;
}

async function createIssuerIdentity(enumber: ENumberRecord): Promise<string> {
  const issuerUrl = normalizeIssuerUrl(requiredEnv("ISSUER_API_URL"));
  const issuerUser = requiredEnv("ISSUER_API_AUTH_USER");
  const issuerPassword = requiredEnv("ISSUER_API_AUTH_PASSWORD");
  const credentials = btoa(`${issuerUser}:${issuerPassword}`);

  const response = await fetch(`${issuerUrl}/v2/identities`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createIdentityPayload(enumber.e_number)),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Issuer API returned ${response.status}: ${errorBody}`);
  }

  const identity = await response.json() as CreateIdentityResponse;

  if (!identity.identifier) {
    throw new Error("Issuer API response did not include an identifier");
  }

  return identity.identifier;
}

async function saveDid(
  supabase: Supabase,
  enumberId: string,
  did: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("enumbers")
    .update({ did, did_created_at: new Date().toISOString() })
    .eq("id", enumberId)
    .is("did", null)
    .select("did")
    .single();

  if (!error && data?.did) {
    return data.did;
  }

  const { data: existing, error: existingError } = await supabase
    .from("enumbers")
    .select("did")
    .eq("id", enumberId)
    .single();

  if (existingError || !existing?.did) {
    throw new Error(existingError?.message || "Failed to persist DID");
  }

  return existing.did;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const { enumber_id: enumberId } = await req.json();

    if (!isUuid(enumberId)) {
      return jsonResponse({ error: "enumber_id must be a valid UUID" }, 400);
    }

    const supabase = createClient<Database>(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const enumber = await fetchExistingENumber(supabase, enumberId);

    if (enumber.did) {
      return jsonResponse({ did: enumber.did, created: false });
    }

    const did = await createIssuerIdentity(enumber);
    const savedDid = await saveDid(supabase, enumberId, did);

    return jsonResponse({ did: savedDid, created: savedDid === did }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[enumber_to_did]", message);
    return jsonResponse({ error: message }, 500);
  }
});
