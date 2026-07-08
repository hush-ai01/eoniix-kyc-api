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
    originator: {
        name: string;
        idNumber: string;
        country: string;
    };
    beneficiary: {
        name: string;
        idNumber?: string;
        country: string;
    };
}
export declare class SoveSDK {
    private client;
    constructor(config: SoveConfig);
    verifyUser(data: VerifyRequest): Promise<any>;
    getCredential(credentialId: string): Promise<any>;
    sendTravelRule(data: TravelRuleSend): Promise<any>;
    getTravelStatus(transferId: string): Promise<any>;
    healthCheck(): Promise<any>;
}
export default SoveSDK;
