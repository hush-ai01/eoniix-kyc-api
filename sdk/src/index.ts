import axios, { AxiosInstance } from 'axios';

export interface SoveConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface VerifyRequest {
  eNumber: string;
  idNumber: string;
  idType: 'SA_ID' | 'BVN' | 'NIN';
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  biometricData?: string;
}

export interface TravelRuleSend {
  originatorCaspId: string;
  beneficiaryCaspId: string;
  amount: number;
  currency: string;
  originator: { name: string; idNumber: string; country: string };
  beneficiary: { name: string; idNumber?: string; country: string };
}

export class SoveSDK {
  private client: AxiosInstance;

  constructor(config: SoveConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://sove.africa/v1',
      headers: { 'x-api-key': config.apiKey, 'Content-Type': 'application/json' }
    });
  }

  async verifyUser(data: VerifyRequest) {
    try {
      const res = await this.client.post('/verify', data);
      return res.data;
    } catch (err: any) {
      throw err.response?.data || err.message;
    }
  }

  async getCredential(credentialId: string) {
    try {
      const res = await this.client.get(`/credential/${credentialId}`);
      return res.data;
    } catch (err: any) {
      throw err.response?.data || err.message;
    }
  }

  async sendTravelRule(data: TravelRuleSend) {
    try {
      const res = await this.client.post('/arc/send', data);
      return res.data;
    } catch (err: any) {
      throw err.response?.data || err.message;
    }
  }

  async getTravelStatus(transferId: string) {
    try {
      const res = await this.client.get(`/arc/status/${transferId}`);
      return res.data;
    } catch (err: any) {
      throw err.response?.data || err.message;
    }
  }

  async healthCheck() {
    try {
      const res = await this.client.get('/health');
      return res.data;
    } catch (err: any) {
      throw err.response?.data || err.message;
    }
  }
}

export default SoveSDK;
