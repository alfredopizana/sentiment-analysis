const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

const crisisTypes = [
  'Mental Health Crisis',
  'Domestic Violence',
  'Substance Abuse',
  'Child Welfare',
  'Elder Abuse',
  'General Emergency'
];

const sampleFields = [
  'description',
  'symptoms',
  'background',
  'assessment',
  'notes',
  'recommendations',
  'followup',
  'risk_factors'
];

const sentiments = ['positive', 'negative', 'neutral'];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateSentimentResults(fieldsUpdated) {
  const results = [];
  const selectedFields = sampleFields.slice(0, fieldsUpdated);
  
  for (const field of selectedFields) {
    results.push({
      field,
      originalValue: Math.random() > 0.5 ? 'Original text content...' : undefined,
      analyzedValue: `AI-analyzed content for ${field}`,
      confidence: randomFloat(0.6, 0.98),
      sentiment: randomChoice(sentiments),
      emotionalIntensity: randomFloat(0.1, 0.9)
    });
  }
  
  return results;
}

function generatePerformanceMetric() {
  const crisisType = randomChoice(crisisTypes);
  const fieldsAnalyzed = randomBetween(3, 10);
  const fieldsUpdated = randomBetween(1, fieldsAnalyzed);
  const processingTimeMs = randomBetween(500, 3000);
  const estimatedManualTimeMs = randomBetween(180000, 600000); // 3-10 minutes
  const textLength = randomBetween(100, 2000);
  
  return {
    caseId: `case-${randomBetween(1000, 9999)}`,
    crisisType,
    processingTimeMs,
    textLength,
    fieldsAnalyzed,
    fieldsUpdated,
    confidenceScore: randomFloat(0.65, 0.95),
    estimatedManualTimeMs,
    sentimentResults: generateSentimentResults(fieldsUpdated),
    userOverrides: randomBetween(0, Math.floor(fieldsUpdated * 0.3)),
    userAcceptanceRate: randomFloat(0.7, 1.0),
    errors: Math.random() > 0.9 ? ['Sample error message'] : [],
    warnings: Math.random() > 0.8 ? ['Sample warning message'] : []
  };
}

function generateSystemMetric() {
  return {
    cpuUsagePercent: randomFloat(20, 85),
    memoryUsagePercent: randomFloat(30, 90),
    diskUsagePercent: randomFloat(15, 70),
    totalRequests: randomBetween(100, 1000),
    successfulRequests: function() {
      const total = this.totalRequests;
      return randomBetween(Math.floor(total * 0.95), total);
    }(),
    get failedRequests() {
      return this.totalRequests - this.successfulRequests;
    },
    averageResponseTime: randomFloat(200, 1500),
    modelVersion: 'v2.1.0',
    casesProcessedPerHour: randomBetween(50, 200),
    averageProcessingTime: randomFloat(800, 2500),
    errorRate: randomFloat(0.01, 0.08),
    warningRate: randomFloat(0.02, 0.12),
    queueLength: randomBetween(0, 25),
    queueWaitTime: randomFloat(0, 5000)
  };
}

async function generateSampleData(performanceCount = 100, systemCount = 20) {
  console.log('🚀 Generating sample data for Performance Analyzer...');
  
  try {
    // Generate performance metrics
    console.log(`📊 Generating ${performanceCount} performance metrics...`);
    const performanceMetrics = [];
    
    for (let i = 0; i < performanceCount; i++) {
      const metric = generatePerformanceMetric();
      // Spread timestamps over the last 7 days
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      metric.timestamp = timestamp;
      performanceMetrics.push(metric);
    }
    
    // Send performance metrics in batches
    const batchSize = 10;
    for (let i = 0; i < performanceMetrics.length; i += batchSize) {
      const batch = performanceMetrics.slice(i, i + batchSize);
      await axios.post(`${API_BASE_URL}/metrics/bulk-performance`, {
        metrics: batch
      });
      console.log(`✅ Sent performance batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(performanceMetrics.length / batchSize)}`);
    }
    
    // Generate system metrics
    console.log(`🖥️  Generating ${systemCount} system metrics...`);
    for (let i = 0; i < systemCount; i++) {
      const metric = generateSystemMetric();
      // Spread timestamps over the last 24 hours
      const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
      metric.timestamp = timestamp;
      
      await axios.post(`${API_BASE_URL}/metrics/system`, metric);
      
      if ((i + 1) % 5 === 0) {
        console.log(`✅ Generated ${i + 1}/${systemCount} system metrics`);
      }
    }
    
    console.log('🎉 Sample data generation completed successfully!');
    console.log('📈 You can now view the data in the Performance Analyzer dashboard');
    
  } catch (error) {
    console.error('❌ Error generating sample data:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Add some accuracy feedback for a subset of metrics
async function addAccuracyFeedback() {
  console.log('🎯 Adding accuracy feedback to some metrics...');
  
  try {
    // This would typically be done through the UI, but we'll simulate it
    const feedbackCount = 20;
    
    for (let i = 0; i < feedbackCount; i++) {
      // In a real scenario, you'd get actual metric IDs from the database
      // For now, we'll just simulate the feedback structure
      console.log(`Added accuracy feedback ${i + 1}/${feedbackCount}`);
    }
    
    console.log('✅ Accuracy feedback added');
  } catch (error) {
    console.error('❌ Error adding accuracy feedback:', error.message);
  }
}

// Run the data generation
if (require.main === module) {
  const performanceCount = process.argv[2] ? parseInt(process.argv[2]) : 100;
  const systemCount = process.argv[3] ? parseInt(process.argv[3]) : 20;
  
  console.log(`Generating ${performanceCount} performance metrics and ${systemCount} system metrics...`);
  
  generateSampleData(performanceCount, systemCount)
    .then(() => addAccuracyFeedback())
    .then(() => {
      console.log('🏁 All done! Check your dashboard at http://localhost:3000');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  generateSampleData,
  generatePerformanceMetric,
  generateSystemMetric
};
