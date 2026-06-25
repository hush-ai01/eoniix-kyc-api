# Repository hygiene summary

This cleanup removes local/generated files that should not live in source control.

## Removed

- `eoniix-kyc-api.zip`: generated source archive that can drift from the real repository contents.
- `supabase/.temp/*`: local Supabase CLI state, including project linkage and local service version files.
- `tatus`: stray status/debug artifact.

## Updated

- Expanded `.gitignore` for environment files, generated archives, logs, coverage output, key material, and Supabase local state.

## Why

Keeping generated archives and local Supabase state in git makes review noisy, can leak environment-specific metadata, and makes future checkouts less reliable. The source files, migrations, and Supabase config remain tracked.
