# Known Dependency Risk — @solana/web3.js transitive uuid vulnerability

`npm audit` flags a moderate-severity buffer bounds check issue in `uuid`,
pulled in transitively via `@solana/web3.js` -> `jayson` -> `uuid`.

- We are on `@solana/web3.js@1.98.4`, the latest stable 1.x release.
- The only fix path is `@solana/web3.js@2.x` or `3.0.0-rc`, both a full
  API rewrite — forcing this would break Sove's Solana Attestation
  Service integration.
- Upstream (Solana Labs) has not patched this in their latest 1.x release,
  meaning this is a shared ecosystem risk, not unique to Sove.
- Assessed and accepted as low-risk pending Solana's own dependency update,
  as of [today's date]. Revisit when @solana/web3.js 2.x reaches full
  stable release and SDK migration is feasible.
