import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Case Record Management API',
      version: '1.0.0',
      description: 'API for managing crisis case records with sentiment analysis integration',
      contact: {
        name: 'API Support',
        email: 'support@caserecord.com'
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Cases',
        description: 'Case record management endpoints',
      },
      {
        name: 'Utilities',
        description: 'Utility endpoints for application support',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
