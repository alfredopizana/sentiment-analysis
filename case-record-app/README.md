# Case Record Management System

A comprehensive case record application that serves as a proof of concept for sentiment analysis integration in crisis management scenarios.

## Features

- **Dynamic Forms**: Different form paths based on crisis type
- **Sentiment Analysis Integration**: Automatic field updates with AI-powered sentiment analysis
- **Field Tracking**: Visual indicators for AI-updated vs manually overwritten fields
- **RESTful API**: Well-structured API following best practices
- **Modern UI**: Beautiful, responsive user interface
- **Comprehensive Testing**: Unit and integration tests
- **TypeScript**: Full type safety across the application

## Architecture

```
case-record-app/
├── client/          # React TypeScript frontend
├── server/          # Node.js Express backend
├── shared/          # Shared types and utilities
└── docs/           # API documentation
```

## Quick Start

1. Install all dependencies:
   ```bash
   npm run install:all
   ```

2. Start development servers:
   ```bash
   npm run dev
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

## Crisis Types Supported

- **Mental Health Crisis**
- **Domestic Violence**
- **Substance Abuse**
- **Child Welfare**
- **Elder Abuse**
- **General Emergency**

## Field Update Tracking

- 🤖 **AI Updated**: Fields automatically updated by sentiment analysis
- ✏️ **Manually Overwritten**: Fields modified by user after AI update
- 📝 **User Input**: Fields filled manually by user

## API Endpoints

- `GET /api/cases` - List all cases
- `POST /api/cases` - Create new case
- `GET /api/cases/:id` - Get specific case
- `PUT /api/cases/:id` - Update case
- `POST /api/cases/:id/analyze` - Trigger sentiment analysis
- `GET /api/crisis-types` - Get available crisis types

## Testing

```bash
# Run all tests
npm test

# Run server tests only
npm run test:server

# Run client tests only
npm run test:client
```

## Technology Stack

### Frontend
- React 18 with TypeScript
- Material-UI (MUI) for components
- React Hook Form for form management
- Axios for API calls
- React Router for navigation

### Backend
- Node.js with Express
- TypeScript
- MongoDB with Mongoose
- JWT authentication
- Swagger for API documentation
- Jest for testing

### Development Tools
- ESLint & Prettier
- Husky for git hooks
- Docker support
- CI/CD ready
