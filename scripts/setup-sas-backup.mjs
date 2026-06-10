import { createSolanaClient, createTransaction } from 'gill';
import { loadKeypairSignerFromFile } from 'gill/node';
import {
  getCreateCredentialInstruction,
  getCreateSchemaInstruction,
  deriveCredentialPda,
  deriveSchemaPda,
} from 'sas-lib';

const issuer = await loadKeypairSignerFromFile('/home/codespace/.config/solana/sove-issuer.json');
console.log('Issuer:', issuer.address);

const client = createSolanaClient({ urlOrMoniker: 'devnet' });
const { rpc, sendAndConfirmTransaction } = client;

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

const CREDENTIAL_NAME = 'sove-kyc';
const [credentialPda] = await deriveCredentialPda({ authority: issuer.address, name: CREDENTIAL_NAME });
console.log('Credential PDA:', credentialPda);

const SCHEMA_NAME = 'sove-kyc-v1';
const [schemaPda] = await deriveSchemaPda({ credential: credentialPda, name: SCHEMA_NAME });
console.log('Schema PDA:', schemaPda);

const createCredentialIx = getCreateCredentialInstruction({
  payer: issuer,
  credential: credentialPda,
  authority: issuer,
  name: CREDENTIAL_NAME,
  signers: [issuer.address],
});

const createSchemaIx = getCreateSchemaInstruction({
  payer: issuer,
  credential: credentialPda,
  schema: schemaPda,
  authority: issuer,
  name: SCHEMA_NAME,
  fieldNames: ['eNumber', 'country', 'idType', 'amlClear', 'verifiedAt'],
  fieldTypes: [0, 0, 0, 3, 0],
});

const tx = createTransaction({
  version: 0,
  feePayer: issuer,
  instructions: [createCredentialIx, createSchemaIx],
  latestBlockhash,
});

const sig = await sendAndConfirmTransaction(tx, { commitment: 'confirmed' });
console.log('SUCCESS - Transaction:', sig);
console.log('SOLANA_CREDENTIAL_ADDRESS=' + credentialPda);
console.log('SOLANA_SCHEMA_ADDRESS=' + schemaPda);