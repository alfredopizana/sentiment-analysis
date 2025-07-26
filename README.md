# Sentiment Analysis for Crisis Management

This repository contains a comprehensive sentiment analysis system designed for crisis management scenarios, featuring a case record management application that demonstrates real-world integration of AI-powered sentiment analysis.

## Project Structure

```
sentiment-analysis-base/
├── text_analyzer/          # Core sentiment analysis engine
├── case-record-app/        # Full-stack case management application
└── README.md              # This file
```

## Components

### 1. Text Analyzer (`text_analyzer/`)
Core sentiment analysis engine with support for crisis-specific text analysis.

### 2. Case Record App (`case-record-app/`)
A comprehensive case record management system that serves as a proof of concept for sentiment analysis integration in crisis management scenarios.

**Features:**
- **Dynamic Forms**: Different form paths based on crisis type
- **Sentiment Analysis Integration**: Automatic field updates with AI-powered sentiment analysis
- **Field Tracking**: Visual indicators for AI-updated vs manually overwritten fields
- **RESTful API**: Well-structured API following best practices
- **Modern UI**: Beautiful, responsive user interface built with React and Material-UI
- **Comprehensive Testing**: Unit and integration tests
- **TypeScript**: Full type safety across the application

**Crisis Types Supported:**
- Mental Health Crisis
- Domestic Violence
- Substance Abuse
- Child Welfare
- Elder Abuse
- General Emergency

## Quick Start

### Case Record Application

1. Navigate to the case record app:
   ```bash
   cd case-record-app
   ```

2. Run the setup script:
   ```bash
   ./setup.sh
   ```

3. Start the application:
   ```bash
   npm run dev
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

### Using Docker

```bash
cd case-record-app
docker-compose up
```

## Technology Stack

### Backend
- Node.js with Express and TypeScript
- MongoDB with Mongoose
- JWT authentication
- Swagger API documentation
- Comprehensive testing with Jest

### Frontend
- React 18 with TypeScript
- Material-UI (MUI) for components
- React Hook Form for form management
- React Router for navigation
- Axios for API calls

### Development Tools
- ESLint & Prettier
- Docker support
- CI/CD ready configuration

## Field Update Tracking

The system provides visual indicators for field updates:

- 🤖 **AI Updated**: Fields automatically updated by sentiment analysis
- ✏️ **Manually Overwritten**: Fields modified by user after AI update
- 📝 **User Input**: Fields filled manually by user

## API Endpoints

- `GET /api/cases` - List all cases with filtering and pagination
- `POST /api/cases` - Create new case
- `GET /api/cases/:id` - Get specific case details
- `PUT /api/cases/:id` - Update case
- `POST /api/cases/:id/analyze` - Trigger sentiment analysis
- `GET /api/crisis-types` - Get available crisis types
- `GET /api/health` - Health check endpoint

## Testing

```bash
# Run all tests
npm test

# Run server tests only
npm run test:server

# Run client tests only
npm run test:client
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.
