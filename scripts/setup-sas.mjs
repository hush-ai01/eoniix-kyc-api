
import { createSolanaClient } from 'gill';
import { getCreateCredentialInstruction, getCreateSchemaInstruction, deriveCredentialPda, deriveSchemaPda } from 'sas-lib';
import { readFileSync } from 'fs';
import pkg from '@solana/web3.js';
const { Keypair } = pkg;

const raw = JSON.parse(readFileSync('/home/codespace/.config/solana/sove-issuer.json', 'utf8'));
const keypair = Keypair.fromSecretKey(new Uint8Array(raw));
const address = keypair.publicKey.toBase58();
console.log('Issuer address:', address);

const issuerKeypair = {
  address,
  signTransactions: async (txs) => txs,
  signMessages: async (msgs) => msgs,
};

const client = createSolanaClient({ urlOrMoniker: 'devnet' });
const { sendAndConfirmTransaction } = client;

const CREDENTIAL_NAME = 'sove-kyc';
const [credentialPda] = await deriveCredentialPda({ authority: address, name: CREDENTIAL_NAME });
console.log('Credential PDA:', credentialPda);

const SCHEMA_NAME = 'sove-kyc-v1';
const [schemaPda] = await deriveSchemaPda({ credential: credentialPda, name: SCHEMA_NAME });
console.log('Schema PDA:', schemaPda);

console.log('SUCCESS - Add these to your .env:');
console.log('SOLANA_CREDENTIAL_ADDRESS=' + credentialPda);
console.log('SOLANA_SCHEMA_ADDRESS=' + schemaPda);
