import axios from 'axios';
export class SoveSDK {
    constructor(config) {
        this.client = axios.create({
            baseURL: config.baseUrl || 'https://sove.africa/v1',
            headers: { 'x-api-key': config.apiKey, 'Content-Type': 'application/json' }
        });
    }
    async verifyUser(data) {
        try {
            const res = await this.client.post('/verify', data);
            return res.data;
        }
        catch (err) {
            throw err.response?.data || err.message;
        }
    }
    async getCredential(credentialId) {
        try {
            const res = await this.client.get(`/credential/${credentialId}`);
            return res.data;
        }
        catch (err) {
            throw err.response?.data || err.message;
        }
    }
    async sendTravelRule(data) {
        try {
            const res = await this.client.post('/arc/send', data);
            return res.data;
        }
        catch (err) {
            throw err.response?.data || err.message;
        }
    }
    async getTravelStatus(transferId) {
        try {
            const res = await this.client.get(`/arc/status/${transferId}`);
            return res.data;
        }
        catch (err) {
            throw err.response?.data || err.message;
        }
    }
    async healthCheck() {
        try {
            const res = await this.client.get('/health');
            return res.data;
        }
        catch (err) {
            throw err.response?.data || err.message;
        }
    }
}
export default SoveSDK;
