# Sentiment Analysis Performance Analyzer

A comprehensive performance analysis dashboard for monitoring and analyzing the effectiveness of sentiment analysis AI systems in crisis management scenarios.

## 🚀 Features

### Dashboard
- **Real-time Performance Metrics**: Monitor processing times, confidence scores, and efficiency
- **Time-based Analytics**: Track performance trends over different time periods
- **Crisis Type Analysis**: Compare performance across different crisis scenarios
- **Visual Charts**: Interactive charts and graphs for data visualization

### Analytics
- **Time Series Analysis**: Detailed performance trends over time
- **Efficiency Analysis**: AI effectiveness by crisis type and field updates
- **Correlation Analysis**: Relationship between processing time, confidence, and accuracy
- **Multi-metric Support**: Processing time, confidence scores, time saved, throughput

### Reports
- **Executive Summary**: High-level performance overview with key metrics
- **ROI Analysis**: Return on investment calculations with cost savings
- **Daily Trends**: Performance patterns and trends over time
- **Recommendations**: AI-generated suggestions for system improvements
- **Data Export**: CSV and JSON export capabilities

### System Health
- **Real-time Monitoring**: CPU, memory, and disk usage tracking
- **API Health**: Request success rates and response times
- **Queue Management**: Processing queue status and wait times
- **Alert System**: Automated alerts for system issues

## 📊 Key Metrics Tracked

### Performance Metrics
- Processing time per case
- Text analysis length and complexity
- Fields analyzed vs. fields updated
- Confidence scores and accuracy ratings
- User acceptance and override rates
- Error and warning counts

### Time Savings
- Estimated manual processing time
- Actual AI processing time
- Total time saved calculations
- Efficiency percentages

### System Metrics
- CPU, memory, and disk usage
- API request/response metrics
- Model performance and version tracking
- Queue length and processing throughput

## 🛠 Technology Stack

### Backend
- **Node.js** with Express and TypeScript
- **MongoDB** with Mongoose for data storage
- **Swagger** for API documentation
- **Jest** for testing

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for components and styling
- **Recharts** for data visualization
- **Axios** for API communication

### Infrastructure
- **Docker** support with docker-compose
- **Nginx** for production deployment
- **MongoDB** for time-series data storage

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or remote)
- Docker (optional)

### Installation

1. **Clone and setup:**
   ```bash
   cd performance-analyzer
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Configure environment:**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your MongoDB URI and other settings
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001
   - API Documentation: http://localhost:5001/api-docs

### Using Docker

```bash
docker-compose up -d
```

Access at:
- Frontend: http://localhost:3001
- Backend API: http://localhost:5001

## 📡 API Endpoints

### Analytics
- `GET /api/analytics/overview` - Performance overview with key metrics
- `GET /api/analytics/time-series` - Time-series performance data
- `GET /api/analytics/efficiency` - AI efficiency analysis

### Metrics
- `POST /api/metrics/performance` - Record performance metrics
- `POST /api/metrics/system` - Record system metrics
- `GET /api/metrics/performance/:caseId` - Get case-specific metrics
- `POST /api/metrics/bulk-performance` - Bulk metrics recording

### Reports
- `GET /api/reports/summary` - Comprehensive performance report
- `GET /api/reports/roi` - ROI analysis report
- `GET /api/reports/export` - Export data (CSV/JSON)

## 📈 Integration with Sentiment Analysis System

### Recording Performance Metrics

```javascript
// Example: Recording a performance metric
const performanceData = {
  caseId: "case-123",
  crisisType: "Mental Health Crisis",
  processingTimeMs: 1250,
  textLength: 500,
  fieldsAnalyzed: 8,
  fieldsUpdated: 6,
  confidenceScore: 0.85,
  estimatedManualTimeMs: 300000, // 5 minutes
  sentimentResults: [
    {
      field: "description",
      analyzedValue: "Patient shows signs of severe anxiety",
      confidence: 0.92,
      sentiment: "negative",
      emotionalIntensity: 0.8
    }
  ]
};

await fetch('/api/metrics/performance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(performanceData)
});
```

### System Metrics Integration

```javascript
// Example: Recording system metrics
const systemData = {
  cpuUsagePercent: 65,
  memoryUsagePercent: 78,
  diskUsagePercent: 45,
  totalRequests: 1500,
  successfulRequests: 1485,
  failedRequests: 15,
  averageResponseTime: 850,
  modelVersion: "v2.1.0",
  casesProcessedPerHour: 120,
  averageProcessingTime: 1200,
  errorRate: 0.01,
  warningRate: 0.02
};

await fetch('/api/metrics/system', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(systemData)
});
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=5001
MONGODB_URI=mongodb://localhost:27017/sentiment_performance
NODE_ENV=development

# Optional: JWT for future authentication
JWT_SECRET=your-jwt-secret-key
```

### MongoDB Indexes

The application automatically creates indexes for optimal performance:
- Time-based queries on `timestamp`
- Crisis type filtering on `crisisType`
- Case-specific queries on `caseId`

## 📊 Dashboard Features

### Performance Overview
- Total cases processed
- Average processing time
- Total time saved
- Average confidence score
- Field update efficiency
- User acceptance rate

### Time Series Charts
- Processing time trends
- Confidence score evolution
- Throughput analysis
- Error rate tracking

### Crisis Type Analysis
- Performance comparison by crisis type
- Efficiency ratings
- Time savings breakdown
- Confidence score distribution

## 🧪 Testing

```bash
# Run all tests
npm test

# Run server tests
npm run test:server

# Run client tests
npm run test:client

# Watch mode
npm run test:watch
```

## 📦 Deployment

### Production Build

```bash
# Build server
cd server && npm run build

# Build client
cd client && npm run build
```

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔍 Monitoring and Alerts

The system provides built-in monitoring for:
- High CPU usage (>90%)
- High memory usage (>95%)
- High error rates (>10%)
- Long queue lengths (>20 items)
- Slow response times

## 🤝 Integration Examples

### With Case Record App

```javascript
// In your case record app, after sentiment analysis
const analysisResult = await analyzeSentiment(caseData);

// Record the performance metrics
await recordPerformanceMetric({
  caseId: caseData.id,
  crisisType: caseData.crisisType,
  processingTimeMs: analysisResult.processingTime,
  // ... other metrics
});
```

### Batch Processing

```javascript
// For bulk analysis operations
const metrics = await Promise.all(
  cases.map(async (case) => {
    const result = await analyzeSentiment(case);
    return {
      caseId: case.id,
      // ... metrics
    };
  })
);

await fetch('/api/metrics/bulk-performance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ metrics })
});
```

## 📋 Performance Optimization

### Database Optimization
- Proper indexing for time-series queries
- Aggregation pipelines for analytics
- Connection pooling for high throughput

### Frontend Optimization
- Lazy loading of components
- Memoization of expensive calculations
- Efficient chart rendering with virtualization

### API Optimization
- Response caching for frequently accessed data
- Pagination for large datasets
- Compression for API responses

## 🔒 Security Considerations

- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- Security headers in production
- Environment variable protection

## 📚 API Documentation

Full API documentation is available at `/api-docs` when running the server. The documentation includes:
- Endpoint descriptions
- Request/response schemas
- Example requests
- Error codes and handling

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**
   - Check MongoDB is running
   - Verify connection string in `.env`
   - Check network connectivity

2. **High Memory Usage**
   - Monitor large aggregation queries
   - Implement data retention policies
   - Use pagination for large datasets

3. **Slow Performance**
   - Check database indexes
   - Monitor system resources
   - Optimize aggregation pipelines

## 📈 Future Enhancements

- Machine learning model performance tracking
- Predictive analytics for system load
- Advanced alerting and notification system
- Integration with external monitoring tools
- Multi-tenant support for different organizations

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

For support and questions:
- Check the API documentation at `/api-docs`
- Review the troubleshooting section
- Create an issue in the repository
