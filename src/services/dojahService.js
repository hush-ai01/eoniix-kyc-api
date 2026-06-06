/**
 * DojahService
 * In sandbox mode, returns mock verified responses.
 * Swap DOJAH_ENV=live in .env when real keys arrive.
 */

import axios from 'axios';

const BASE_URL = process.env.DOJAH_BASE_URL || 'https://api.dojah.io';
const APP_ID = process.env.DOJAH_APP_ID;
const PRIVATE_KEY = process.env.DOJAH_PRIVATE_KEY;
const IS_MOCK = !APP_ID || process.env.DOJAH_ENV === 'sandbox';

const dojahClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'AppId': APP_ID,
    'Authorization': PRIVATE_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

export async function verifyGovernmentId({ country, idType, idNumber }) {
  if (IS_MOCK) {
    return {
      verified: true,
      data: {
        first_name: 'Test',
        last_name: 'User',
        date_of_birth: '1990-01-01'
      },
      provider: 'dojah_mock',
      type: 'government_id'
    };
  }

  const endpoint = resolveIdEndpoint(country, idType);
  const response = await dojahClient.get(endpoint, {
    params: { [idType.toLowerCase()]: idNumber }
  });

  return {
    verified: response.data?.entity !== null,
    data: response.data?.entity || null,
    provider: 'dojah',
    type: 'government_id'
  };
}

export async function verifyBiometric({ selfieBase64, idImageBase64 }) {
  if (IS_MOCK) {
    return {
      verified: true,
      confidence: 99,
      livenessScore: 98,
      provider: 'dojah_mock',
      type: 'biometric'
    };
  }

  const payload = {
    selfie: selfieBase64,
    ...(idImageBase64 && { id: idImageBase64 })
  };

  const response = await dojahClient.post('/api/v1/kyc/selfie', payload);

  return {
    verified: response.data?.entity?.selfie_verified === true,
    confidence: response.data?.entity?.confidence_value || 0,
    livenessScore: response.data?.entity?.liveness_score || 0,
    provider: 'dojah',
    type: 'biometric'
  };
}

export async function screenAML({ firstName, lastName, dateOfBirth }) {
  if (IS_MOCK) {
    return {
      clear: true,
      matchStatus: 'no_match',
      matches: [],
      provider: 'dojah_mock',
      type: 'aml'
    };
  }

  const response = await dojahClient.post('/api/v1/aml/screening', {
    first_name: firstName,
    last_name: lastName,
    date_of_birth: dateOfBirth
  });

  const entity = response.data?.entity;

  return {
    clear: entity?.match_status === 'no_match',
    matchStatus: entity?.match_status || 'unknown',
    matches: entity?.matches || [],
    provider: 'dojah',
    type: 'aml'
  };
}

function resolveIdEndpoint(country, idType) {
  const map = {
    'NG:BVN':             '/api/v1/kyc/bvn',
    'NG:NIN':             '/api/v1/kyc/nin',
    'NG:PASSPORT':        '/api/v1/kyc/passport',
    'NG:DRIVERS_LICENSE': '/api/v1/kyc/dl',
    'ZA:NATIONAL_ID':     '/api/v1/kyc/za/id',
    'ZA:PASSPORT':        '/api/v1/kyc/passport',
    'KE:NATIONAL_ID':     '/api/v1/kyc/ke/id',
    'KE:PASSPORT':        '/api/v1/kyc/passport',
    'GH:DRIVERS_LICENSE': '/api/v1/kyc/gh/dl',
  };

  const key = `${country}:${idType}`;
  const endpoint = map[key];

  if (!endpoint) {
    throw new Error(`Unsupported country/ID type: ${country}/${idType}`);
  }

  return endpoint;
}
