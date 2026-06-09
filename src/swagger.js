import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sove Identity API',
      version: '1.0.0',
      description: 'Web3-native KYC verification with portable on-chain credentials. Built for African fintechs.',
      contact: {
        name: 'Sove Support',
        email: 'hello@sove.io'
      }
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
      { url: 'https://api.sove.io', description: 'Production' }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key'
        }
      },
      schemas: {
        VerifyRequest: {
          type: 'object',
          required: ['eNumber', 'country', 'idType', 'idNumber', 'selfieBase64'],
          properties: {
            eNumber: { type: 'string', example: 'ENT-000001', description: 'The user eNumber identifier' },
            country: { type: 'string', example: 'NG', description: 'ISO 3166-1 alpha-2 country code' },
            idType: { type: 'string', enum: ['BVN', 'NIN', 'NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE'], example: 'BVN' },
            idNumber: { type: 'string', example: '22222222222' },
            selfieBase64: { type: 'string', description: 'Base64 encoded selfie image' },
            idImageBase64: { type: 'string', description: 'Base64 encoded ID document image (optional)' }
          }
        },
        VerifyResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'verified' },
            eNumber: { type: 'string', example: 'ENT-000001' },
            verificationId: { type: 'string', example: 'd3621ab0-db7c-4576-8a47-afb1dcca4e2c' },
            credentialId: { type: 'string', example: 'cred-d1f21425-cdca-471d-b469-84c8f4fd00e5' },
            zkProofUrl: { type: 'string', example: 'https://issuer.sove.io/credentials/cred-xxx/proof' },
            amlClear: { type: 'boolean', example: true },
            verifiedAt: { type: 'string', format: 'date-time' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'No DID found for eNumber ENT-000001.' }
          }
        }
      }
    },
    security: [{ ApiKeyAuth: [] }]
  },
  apis: ['./src/routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);
