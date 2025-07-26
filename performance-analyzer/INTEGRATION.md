# Integration Guide: Performance Analyzer with Sentiment Analysis System

This guide explains how to integrate the Performance Analyzer with your existing sentiment analysis system, specifically the case record management application.

## 🔗 Integration Overview

The Performance Analyzer tracks and analyzes the performance of your sentiment analysis AI by collecting metrics during the analysis process and providing comprehensive dashboards and reports.

## 📊 Integration Points

### 1. Performance Metrics Collection

#### During Sentiment Analysis
When your sentiment analysis system processes a case, collect these metrics:

```javascript
// In your sentiment analysis service
class SentimentAnalysisService {
  async analyzeCase(caseData) {
    const startTime = Date.now();
    
    try {
      // Your existing sentiment analysis logic
      const analysisResult = await this.performAnalysis(caseData);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Record performance metrics
      await this.recordPerformanceMetrics({
        caseId: caseData.id,
        crisisType: caseData.crisisType,
        processingTimeMs: processingTime,
        textLength: this.calculateTextLength(caseData),
        fieldsAnalyzed: analysisResult.fieldsAnalyzed,
        fieldsUpdated: analysisResult.fieldsUpdated,
        confidenceScore: analysisResult.averageConfidence,
        estimatedManualTimeMs: this.estimateManualTime(caseData),
        sentimentResults: analysisResult.fieldResults,
        errors: analysisResult.errors || [],
        warnings: analysisResult.warnings || []
      });
      
      return analysisResult;
    } catch (error) {
      // Record error metrics
      await this.recordErrorMetrics(caseData.id, error);
      throw error;
    }
  }
  
  async recordPerformanceMetrics(metrics) {
    try {
      await fetch('http://localhost:5001/api/metrics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics)
      });
    } catch (error) {
      console.error('Failed to record performance metrics:', error);
      // Don't fail the main process if metrics recording fails
    }
  }
}
```

#### Calculating Text Length
```javascript
calculateTextLength(caseData) {
  const textFields = ['description', 'symptoms', 'background', 'notes'];
  return textFields.reduce((total, field) => {
    return total + (caseData[field]?.length || 0);
  }, 0);
}
```

#### Estimating Manual Time
```javascript
estimateManualTime(caseData) {
  // Base time for reading and understanding the case
  let baseTime = 120000; // 2 minutes
  
  // Add time based on text complexity
  const textLength = this.calculateTextLength(caseData);
  const readingTime = (textLength / 200) * 60000; // 200 words per minute
  
  // Add time for analysis and documentation
  const analysisTime = 180000; // 3 minutes
  
  // Crisis type complexity factor
  const complexityFactors = {
    'Mental Health Crisis': 1.5,
    'Domestic Violence': 1.3,
    'Substance Abuse': 1.2,
    'Child Welfare': 1.4,
    'Elder Abuse': 1.3,
    'General Emergency': 1.0
  };
  
  const factor = complexityFactors[caseData.crisisType] || 1.0;
  
  return (baseTime + readingTime + analysisTime) * factor;
}
```

### 2. System Metrics Collection

#### Server-Level Monitoring
```javascript
// In your main application server
const os = require('os');
const process = require('process');

class SystemMonitor {
  constructor() {
    this.requestCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.responseTimes = [];
    
    // Record system metrics every 5 minutes
    setInterval(() => this.recordSystemMetrics(), 5 * 60 * 1000);
  }
  
  trackRequest(responseTime, success = true) {
    this.requestCount++;
    this.responseTimes.push(responseTime);
    
    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
    }
    
    // Keep only last 100 response times for average calculation
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }
  
  async recordSystemMetrics() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsagePercent = ((totalMem - freeMem) / totalMem) * 100;
    
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;
    
    const errorRate = this.requestCount > 0 
      ? this.failureCount / this.requestCount 
      : 0;
    
    const systemMetrics = {
      cpuUsagePercent: Math.min(cpuUsage, 100),
      memoryUsagePercent: Math.min(memoryUsagePercent, 100),
      diskUsagePercent: await this.getDiskUsage(),
      totalRequests: this.requestCount,
      successfulRequests: this.successCount,
      failedRequests: this.failureCount,
      averageResponseTime: avgResponseTime,
      modelVersion: process.env.AI_MODEL_VERSION || 'v1.0.0',
      casesProcessedPerHour: this.calculateThroughput(),
      averageProcessingTime: avgResponseTime,
      errorRate: errorRate,
      warningRate: 0.02 // You can track warnings separately
    };
    
    try {
      await fetch('http://localhost:5001/api/metrics/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemMetrics)
      });
      
      // Reset counters
      this.requestCount = 0;
      this.successCount = 0;
      this.failureCount = 0;
      this.responseTimes = [];
    } catch (error) {
      console.error('Failed to record system metrics:', error);
    }
  }
  
  calculateThroughput() {
    // Calculate cases processed in the last hour
    // This is a simplified version - you might want to track this more precisely
    return Math.round(this.successCount * (60 / 5)); // Extrapolate from 5-minute interval
  }
  
  async getDiskUsage() {
    // Simplified disk usage calculation
    // In production, you might want to use a more accurate method
    return 45; // Placeholder
  }
}

// Initialize system monitor
const systemMonitor = new SystemMonitor();

// Middleware to track requests
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    systemMonitor.trackRequest(responseTime, success);
  });
  
  next();
});
```

### 3. User Interaction Tracking

#### Tracking User Overrides
```javascript
// In your case management frontend
class CaseFormHandler {
  constructor() {
    this.aiUpdatedFields = new Set();
    this.userOverrides = new Set();
  }
  
  handleAIUpdate(fieldName, value) {
    this.aiUpdatedFields.add(fieldName);
    // Update the form field
    this.updateField(fieldName, value);
  }
  
  handleUserEdit(fieldName, value) {
    if (this.aiUpdatedFields.has(fieldName)) {
      this.userOverrides.add(fieldName);
    }
    this.updateField(fieldName, value);
  }
  
  async submitCase(caseData) {
    // Submit the case normally
    const result = await this.saveCaseData(caseData);
    
    // Record user interaction metrics
    if (this.aiUpdatedFields.size > 0) {
      await this.recordUserInteraction(caseData.id);
    }
    
    return result;
  }
  
  async recordUserInteraction(caseId) {
    const userAcceptanceRate = this.aiUpdatedFields.size > 0 
      ? 1 - (this.userOverrides.size / this.aiUpdatedFields.size)
      : 1;
    
    try {
      // Find the latest performance metric for this case
      const response = await fetch(`http://localhost:5001/api/metrics/performance/${caseId}`);
      const caseMetrics = await response.json();
      
      if (caseMetrics.metrics && caseMetrics.metrics.length > 0) {
        const latestMetric = caseMetrics.metrics[0];
        
        // Update with user feedback
        await fetch('http://localhost:5001/api/metrics/accuracy-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metricId: latestMetric._id,
            userOverrides: this.userOverrides.size,
            userAcceptanceRate: userAcceptanceRate,
            humanVerified: true
          })
        });
      }
    } catch (error) {
      console.error('Failed to record user interaction:', error);
    }
  }
}
```

### 4. Batch Processing Integration

#### For Bulk Analysis Operations
```javascript
class BatchProcessor {
  async processCaseBatch(cases) {
    const metrics = [];
    const startTime = Date.now();
    
    for (const caseData of cases) {
      try {
        const caseStartTime = Date.now();
        const result = await this.analyzeSingleCase(caseData);
        const caseEndTime = Date.now();
        
        metrics.push({
          caseId: caseData.id,
          crisisType: caseData.crisisType,
          processingTimeMs: caseEndTime - caseStartTime,
          textLength: this.calculateTextLength(caseData),
          fieldsAnalyzed: result.fieldsAnalyzed,
          fieldsUpdated: result.fieldsUpdated,
          confidenceScore: result.averageConfidence,
          estimatedManualTimeMs: this.estimateManualTime(caseData),
          sentimentResults: result.fieldResults,
          errors: result.errors || [],
          warnings: result.warnings || []
        });
      } catch (error) {
        console.error(`Failed to process case ${caseData.id}:`, error);
        // Record error metric
        metrics.push({
          caseId: caseData.id,
          crisisType: caseData.crisisType,
          processingTimeMs: 0,
          textLength: 0,
          fieldsAnalyzed: 0,
          fieldsUpdated: 0,
          confidenceScore: 0,
          estimatedManualTimeMs: 0,
          sentimentResults: [],
          errors: [error.message]
        });
      }
    }
    
    // Record all metrics in bulk
    try {
      await fetch('http://localhost:5001/api/metrics/bulk-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics })
      });
    } catch (error) {
      console.error('Failed to record batch metrics:', error);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`Processed ${cases.length} cases in ${totalTime}ms`);
    
    return metrics;
  }
}
```

## 🔧 Configuration

### Environment Variables
Add these to your main application's environment:

```bash
# Performance Analyzer Integration
PERFORMANCE_ANALYZER_URL=http://localhost:5001
ENABLE_PERFORMANCE_TRACKING=true
AI_MODEL_VERSION=v2.1.0

# Optional: Batch size for bulk operations
METRICS_BATCH_SIZE=50
```

### Error Handling
```javascript
class MetricsCollector {
  constructor(config = {}) {
    this.enabled = config.enabled !== false;
    this.apiUrl = config.apiUrl || 'http://localhost:5001/api';
    this.batchSize = config.batchSize || 50;
    this.retryAttempts = config.retryAttempts || 3;
  }
  
  async recordMetric(endpoint, data, retries = 0) {
    if (!this.enabled) return;
    
    try {
      await fetch(`${this.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        timeout: 5000 // 5 second timeout
      });
    } catch (error) {
      console.error(`Failed to record metric (attempt ${retries + 1}):`, error);
      
      if (retries < this.retryAttempts) {
        // Exponential backoff
        const delay = Math.pow(2, retries) * 1000;
        setTimeout(() => {
          this.recordMetric(endpoint, data, retries + 1);
        }, delay);
      }
    }
  }
}
```

## 📈 Dashboard Access

Once integrated, you can access comprehensive analytics at:

- **Dashboard**: http://localhost:3000 - Real-time performance overview
- **Analytics**: Detailed performance trends and correlations
- **Reports**: Executive summaries and ROI analysis
- **System Health**: Real-time system monitoring

## 🧪 Testing Integration

### Sample Integration Test
```javascript
// test/integration/performance-analyzer.test.js
const request = require('supertest');
const app = require('../app');

describe('Performance Analyzer Integration', () => {
  test('should record performance metrics during case analysis', async () => {
    const caseData = {
      id: 'test-case-123',
      crisisType: 'Mental Health Crisis',
      description: 'Test case description...'
    };
    
    // Analyze case (this should trigger metrics recording)
    const response = await request(app)
      .post('/api/cases/analyze')
      .send(caseData)
      .expect(200);
    
    // Verify metrics were recorded
    const metricsResponse = await request('http://localhost:5001')
      .get(`/api/metrics/performance/${caseData.id}`)
      .expect(200);
    
    expect(metricsResponse.body.metrics).toHaveLength(1);
    expect(metricsResponse.body.metrics[0].caseId).toBe(caseData.id);
  });
});
```

## 🚀 Deployment Considerations

### Production Setup
1. **Separate Database**: Use a dedicated MongoDB instance for performance data
2. **Load Balancing**: Consider load balancing for high-volume environments
3. **Data Retention**: Implement data retention policies for large datasets
4. **Monitoring**: Set up alerts for system health metrics

### Security
1. **API Authentication**: Add authentication to performance analyzer APIs
2. **Network Security**: Use HTTPS and proper network segmentation
3. **Data Privacy**: Ensure sensitive case data is not logged in metrics

## 📊 Custom Metrics

You can extend the system with custom metrics:

```javascript
// Custom metric example
const customMetric = {
  caseId: 'case-123',
  crisisType: 'Mental Health Crisis',
  // ... standard fields ...
  
  // Custom fields
  customMetrics: {
    modelComplexity: 0.75,
    dataQuality: 0.88,
    userSatisfaction: 4.2,
    processingSteps: 12
  }
};

await fetch('/api/metrics/performance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(customMetric)
});
```

## 🔍 Troubleshooting

### Common Issues
1. **Metrics Not Appearing**: Check network connectivity and API endpoints
2. **High Memory Usage**: Implement batching for large datasets
3. **Slow Performance**: Optimize database queries and add indexes

### Debug Mode
```javascript
const metricsCollector = new MetricsCollector({
  enabled: true,
  debug: true, // Enable debug logging
  apiUrl: process.env.PERFORMANCE_ANALYZER_URL
});
```

This integration guide provides a comprehensive approach to connecting your sentiment analysis system with the Performance Analyzer for complete visibility into AI performance and system health.
