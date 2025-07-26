import express from 'express';
import PerformanceMetric from '../models/PerformanceMetric';
import SystemMetric from '../models/SystemMetric';

const router = express.Router();

/**
 * @swagger
 * /api/analytics/overview:
 *   get:
 *     summary: Get performance overview statistics
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *         description: Time range for analytics
 *     responses:
 *       200:
 *         description: Performance overview data
 */
router.get('/overview', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    const timeRanges = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const startTime = new Date(Date.now() - timeRanges[timeRange as keyof typeof timeRanges]);
    
    // Performance metrics aggregation
    const performanceStats = await PerformanceMetric.aggregate([
      { $match: { timestamp: { $gte: startTime } } },
      {
        $group: {
          _id: null,
          totalCases: { $sum: 1 },
          avgProcessingTime: { $avg: '$processingTimeMs' },
          totalTimeSaved: { $sum: '$timeSavedMs' },
          avgConfidence: { $avg: '$confidenceScore' },
          totalFieldsAnalyzed: { $sum: '$fieldsAnalyzed' },
          totalFieldsUpdated: { $sum: '$fieldsUpdated' },
          avgUserAcceptance: { $avg: '$userAcceptanceRate' },
          totalErrors: { $sum: { $size: { $ifNull: ['$errors', []] } } }
        }
      }
    ]);
    
    // Crisis type breakdown
    const crisisTypeStats = await PerformanceMetric.aggregate([
      { $match: { timestamp: { $gte: startTime } } },
      {
        $group: {
          _id: '$crisisType',
          count: { $sum: 1 },
          avgProcessingTime: { $avg: '$processingTimeMs' },
          avgConfidence: { $avg: '$confidenceScore' },
          timeSaved: { $sum: '$timeSavedMs' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // System performance
    const systemStats = await SystemMetric.findOne(
      { timestamp: { $gte: startTime } },
      {},
      { sort: { timestamp: -1 } }
    );
    
    const stats = performanceStats[0] || {
      totalCases: 0,
      avgProcessingTime: 0,
      totalTimeSaved: 0,
      avgConfidence: 0,
      totalFieldsAnalyzed: 0,
      totalFieldsUpdated: 0,
      avgUserAcceptance: 0,
      totalErrors: 0
    };
    
    res.json({
      timeRange,
      overview: {
        totalCases: stats.totalCases,
        averageProcessingTime: Math.round(stats.avgProcessingTime || 0),
        totalTimeSavedHours: Math.round((stats.totalTimeSaved || 0) / (1000 * 60 * 60) * 100) / 100,
        averageConfidence: Math.round((stats.avgConfidence || 0) * 100),
        fieldsAnalyzed: stats.totalFieldsAnalyzed,
        fieldsUpdated: stats.totalFieldsUpdated,
        userAcceptanceRate: Math.round((stats.avgUserAcceptance || 0) * 100),
        errorCount: stats.totalErrors,
        efficiency: stats.totalFieldsAnalyzed > 0 ? 
          Math.round((stats.totalFieldsUpdated / stats.totalFieldsAnalyzed) * 100) : 0
      },
      crisisTypes: crisisTypeStats,
      systemHealth: systemStats ? {
        cpuUsage: systemStats.cpuUsagePercent,
        memoryUsage: systemStats.memoryUsagePercent,
        errorRate: Math.round(systemStats.errorRate * 100),
        throughput: systemStats.casesProcessedPerHour
      } : null
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

/**
 * @swagger
 * /api/analytics/time-series:
 *   get:
 *     summary: Get time-series performance data
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [processingTime, confidence, timeSaved, throughput]
 *         description: Metric to analyze
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [hour, day]
 *         description: Time interval for grouping
 *     responses:
 *       200:
 *         description: Time-series data
 */
router.get('/time-series', async (req, res) => {
  try {
    const { metric = 'processingTime', interval = 'hour', timeRange = '24h' } = req.query;
    
    const timeRanges = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const startTime = new Date(Date.now() - timeRanges[timeRange as keyof typeof timeRanges]);
    
    const groupBy = interval === 'hour' ? {
      year: { $year: '$timestamp' },
      month: { $month: '$timestamp' },
      day: { $dayOfMonth: '$timestamp' },
      hour: { $hour: '$timestamp' }
    } : {
      year: { $year: '$timestamp' },
      month: { $month: '$timestamp' },
      day: { $dayOfMonth: '$timestamp' }
    };
    
    const metricField = {
      processingTime: '$processingTimeMs',
      confidence: '$confidenceScore',
      timeSaved: '$timeSavedMs',
      throughput: 1
    }[metric as string] || '$processingTimeMs';
    
    const aggregation = {
      processingTime: { $avg: metricField },
      confidence: { $avg: metricField },
      timeSaved: { $sum: metricField },
      throughput: { $sum: metricField }
    }[metric as string] || { $avg: metricField };
    
    const timeSeriesData = await PerformanceMetric.aggregate([
      { $match: { timestamp: { $gte: startTime } } },
      {
        $group: {
          _id: groupBy,
          value: aggregation,
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);
    
    res.json({
      metric,
      interval,
      timeRange,
      data: timeSeriesData.map(item => ({
        timestamp: new Date(
          item._id.year,
          item._id.month - 1,
          item._id.day,
          item._id.hour || 0
        ).toISOString(),
        value: Math.round((item.value || 0) * 100) / 100,
        count: item.count
      }))
    });
  } catch (error) {
    console.error('Time series error:', error);
    res.status(500).json({ error: 'Failed to fetch time series data' });
  }
});

/**
 * @swagger
 * /api/analytics/efficiency:
 *   get:
 *     summary: Get AI efficiency metrics
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Efficiency analysis data
 */
router.get('/efficiency', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    const timeRanges = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const startTime = new Date(Date.now() - timeRanges[timeRange as keyof typeof timeRanges]);
    
    // Efficiency by crisis type
    const efficiencyByType = await PerformanceMetric.aggregate([
      { $match: { timestamp: { $gte: startTime } } },
      {
        $group: {
          _id: '$crisisType',
          totalFields: { $sum: '$fieldsAnalyzed' },
          updatedFields: { $sum: '$fieldsUpdated' },
          avgConfidence: { $avg: '$confidenceScore' },
          avgProcessingTime: { $avg: '$processingTimeMs' },
          totalTimeSaved: { $sum: '$timeSavedMs' },
          userAcceptance: { $avg: '$userAcceptanceRate' },
          cases: { $sum: 1 }
        }
      },
      {
        $project: {
          crisisType: '$_id',
          efficiency: {
            $multiply: [
              { $divide: ['$updatedFields', '$totalFields'] },
              100
            ]
          },
          avgConfidence: { $multiply: ['$avgConfidence', 100] },
          avgProcessingTime: '$avgProcessingTime',
          timeSavedHours: { $divide: ['$totalTimeSaved', 3600000] },
          userAcceptance: { $multiply: ['$userAcceptance', 100] },
          cases: '$cases'
        }
      },
      { $sort: { efficiency: -1 } }
    ]);
    
    // Processing time vs accuracy correlation
    const correlationData = await PerformanceMetric.aggregate([
      { $match: { timestamp: { $gte: startTime }, accuracyScore: { $exists: true } } },
      {
        $project: {
          processingTime: '$processingTimeMs',
          accuracy: { $multiply: ['$accuracyScore', 100] },
          confidence: { $multiply: ['$confidenceScore', 100] }
        }
      }
    ]);
    
    res.json({
      timeRange,
      efficiencyByType,
      correlationData,
      summary: {
        totalTypes: efficiencyByType.length,
        avgEfficiency: efficiencyByType.reduce((sum, item) => sum + item.efficiency, 0) / efficiencyByType.length || 0,
        bestPerforming: efficiencyByType[0]?.crisisType || 'N/A',
        totalTimeSaved: efficiencyByType.reduce((sum, item) => sum + item.timeSavedHours, 0)
      }
    });
  } catch (error) {
    console.error('Efficiency analysis error:', error);
    res.status(500).json({ error: 'Failed to fetch efficiency data' });
  }
});

export default router;
