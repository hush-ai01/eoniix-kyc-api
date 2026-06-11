const SOVE_API_BASE = 'https://eoniix-kyc-api.onrender.com';

export class SoveArc {
  constructor({ apiKey, baseUrl = SOVE_API_BASE } = {}) {
    if (!apiKey) throw new Error('SoveArc: apiKey is required');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  #headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey
    };
  }

  async #request(method, path, body) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.#headers(),
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new SoveArcError(data.error || 'Request failed', res.status, data);
    return data;
  }

  // Send a Travel Rule payload to a beneficiary CASP
  async send({ originatorENumber, originatorWallet, beneficiaryWallet, beneficiaryCaspId, originatorCaspId, amountZar, chainTransactionRef }) {
    if (!originatorENumber) throw new Error('send: originatorENumber is required');
    if (!originatorWallet) throw new Error('send: originatorWallet is required');
    if (!beneficiaryWallet) throw new Error('send: beneficiaryWallet is required');
    if (!beneficiaryCaspId) throw new Error('send: beneficiaryCaspId is required');
    if (!originatorCaspId) throw new Error('send: originatorCaspId is required');
    if (!amountZar) throw new Error('send: amountZar is required');

    return this.#request('POST', '/v1/arc/send', {
      originatorENumber,
      originatorWallet,
      beneficiaryWallet,
      beneficiaryCaspId,
      originatorCaspId,
      amountZar,
      chainTransactionRef
    });
  }

  // Get the status of a transmission by arcTransactionId
  async status(arcTransactionId) {
    if (!arcTransactionId) throw new Error('status: arcTransactionId is required');
    return this.#request('GET', `/v1/arc/status/${arcTransactionId}`);
  }

  // Acknowledge receipt of an inbound transmission
  async receive({ arcTransactionId, status }) {
    if (!arcTransactionId) throw new Error('receive: arcTransactionId is required');
    if (!status) throw new Error('receive: status is required');
    return this.#request('POST', '/v1/arc/receive', { arcTransactionId, status });
  }

  // Register your CASP with Sove Arc
  async registerCasp({ caspId, caspName, endpointUrl, publicKey, country, fscaLicensed }) {
    if (!caspId || !caspName || !endpointUrl || !publicKey || !country) {
      throw new Error('registerCasp: caspId, caspName, endpointUrl, publicKey and country are required');
    }
    return this.#request('POST', '/v1/arc/casps/register', {
      caspId, caspName, endpointUrl, publicKey, country, fscaLicensed
    });
  }

  // Look up which CASP owns a wallet address
  async lookupWallet(walletAddress) {
    if (!walletAddress) throw new Error('lookupWallet: walletAddress is required');
    return this.#request('GET', `/v1/arc/casps/lookup?wallet=${encodeURIComponent(walletAddress)}`);
  }
}

export class SoveArcError extends Error {
  constructor(message, statusCode, data) {
    super(message);
    this.name = 'SoveArcError';
    this.statusCode = statusCode;
    this.data = data;
  }
}