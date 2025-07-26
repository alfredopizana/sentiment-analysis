import express from 'express';
import PerformanceMetric from '../models/PerformanceMetric';
import SystemMetric from '../models/SystemMetric';

const router = express.Router();

/**
 * @swagger
 * /api/reports/summary:
 *   get:
 *     summary: Generate comprehensive performance summary report
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report
 *     responses:
 *       200:
 *         description: Comprehensive performance report
 */
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    // Overall performance metrics
    const overallStats = await PerformanceMetric.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalCases: { $sum: 1 },
          totalProcessingTime: { $sum: '$processingTimeMs' },
          totalTimeSaved: { $sum: '$timeSavedMs' },
          avgConfidence: { $avg: '$confidenceScore' },
          totalFieldsAnalyzed: { $sum: '$fieldsAnalyzed' },
          totalFieldsUpdated: { $sum: '$fieldsUpdated' },
          avgUserAcceptance: { $avg: '$userAcceptanceRate' },
          totalErrors: { $sum: { $size: { $ifNull: ['$errors', []] } } },
          totalWarnings: { $sum: { $size: { $ifNull: ['$warnings', []] } } }
        }
      }
    ]);
    
    // Performance by crisis type
    const crisisTypePerformance = await PerformanceMetric.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$crisisType',
          cases: { $sum: 1 },
          avgProcessingTime: { $avg: '$processingTimeMs' },
          avgConfidence: { $avg: '$confidenceScore' },
          timeSaved: { $sum: '$timeSavedMs' },
          fieldsAnalyzed: { $sum: '$fieldsAnalyzed' },
          fieldsUpdated: { $sum: '$fieldsUpdated' },
          userAcceptance: { $avg: '$userAcceptanceRate' },
          errors: { $sum: { $size: { $ifNull: ['$errors', []] } } }
        }
      },
      {
        $project: {
          crisisType: '$_id',
          cases: 1,
          avgProcessingTime: { $round: ['$avgProcessingTime', 2] },
          avgConfidence: { $round: [{ $multiply: ['$avgConfidence', 100] }, 1] },
          timeSavedHours: { $round: [{ $divide: ['$timeSaved', 3600000] }, 2] },
          efficiency: { 
            $round: [
              { $multiply: [{ $divide: ['$fieldsUpdated', '$fieldsAnalyzed'] }, 100] }, 
              1
            ] 
          },
          userAcceptance: { $round: [{ $multiply: ['$userAcceptance', 100] }, 1] },
          errorRate: { $round: [{ $divide: ['$errors', '$cases'] }, 3] }
        }
      },
      { $sort: { cases: -1 } }
    ]);
    
    // Daily performance trends
    const dailyTrends = await PerformanceMetric.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          cases: { $sum: 1 },
          avgProcessingTime: { $avg: '$processingTimeMs' },
          avgConfidence: { $avg: '$confidenceScore' },
          timeSaved: { $sum: '$timeSavedMs' },
          errors: { $sum: { $size: { $ifNull: ['$errors', []] } } }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          cases: 1,
          avgProcessingTime: { $round: ['$avgProcessingTime', 2] },
          avgConfidence: { $round: [{ $multiply: ['$avgConfidence', 100] }, 1] },
          timeSavedHours: { $round: [{ $divide: ['$timeSaved', 3600000] }, 2] },
          errorRate: { $round: [{ $divide: ['$errors', '$cases'] }, 3] }
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    // System performance summary
    const systemPerformance = await SystemMetric.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          avgCpuUsage: { $avg: '$cpuUsagePercent' },
          avgMemoryUsage: { $avg: '$memoryUsagePercent' },
          avgResponseTime: { $avg: '$averageResponseTime' },
          totalRequests: { $sum: '$totalRequests' },
          totalErrors: { $sum: '$failedRequests' },
          avgThroughput: { $avg: '$casesProcessedPerHour' }
        }
      }
    ]);
    
    const stats = overallStats[0] || {};
    const systemStats = systemPerformance[0] || {};
    
    const report = {
      reportPeriod: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        durationDays: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      },
      executiveSummary: {
        totalCasesProcessed: stats.totalCases || 0,
        totalTimeSavedHours: Math.round((stats.totalTimeSaved || 0) / (1000 * 60 * 60) * 100) / 100,
        averageConfidenceScore: Math.round((stats.avgConfidence || 0) * 100),
        overallEfficiency: stats.totalFieldsAnalyzed > 0 ? 
          Math.round((stats.totalFieldsUpdated / stats.totalFieldsAnalyzed) * 100) : 0,
        userAcceptanceRate: Math.round((stats.avgUserAcceptance || 0) * 100),
        errorRate: stats.totalCases > 0 ? 
          Math.round((stats.totalErrors / stats.totalCases) * 100) / 100 : 0
      },
      performanceMetrics: {
        averageProcessingTime: Math.round((stats.totalProcessingTime || 0) / (stats.totalCases || 1)),
        totalFieldsAnalyzed: stats.totalFieldsAnalyzed || 0,
        totalFieldsUpdated: stats.totalFieldsUpdated || 0,
        totalErrors: stats.totalErrors || 0,
        totalWarnings: stats.totalWarnings || 0
      },
      crisisTypeBreakdown: crisisTypePerformance,
      dailyTrends,
      systemPerformance: {
        averageCpuUsage: Math.round((systemStats.avgCpuUsage || 0) * 100) / 100,
        averageMemoryUsage: Math.round((systemStats.avgMemoryUsage || 0) * 100) / 100,
        averageResponseTime: Math.round((systemStats.avgResponseTime || 0) * 100) / 100,
        totalApiRequests: systemStats.totalRequests || 0,
        apiErrorRate: systemStats.totalRequests > 0 ? 
          Math.round((systemStats.totalErrors / systemStats.totalRequests) * 100) / 100 : 0,
        averageThroughput: Math.round((systemStats.avgThroughput || 0) * 100) / 100
      },
      recommendations: generateRecommendations(stats, crisisTypePerformance, systemStats)
    };
    
    res.json(report);
  } catch (error) {
    console.error('Error generating summary report:', error);
    res.status(500).json({ error: 'Failed to generate summary report' });
  }
});

/**
 * @swagger
 * /api/reports/roi:
 *   get:
 *     summary: Generate ROI (Return on Investment) report
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: hourlyRate
 *         schema:
 *           type: number
 *         description: Hourly rate for manual processing (default: 25)
 *     responses:
 *       200:
 *         description: ROI analysis report
 */
router.get('/roi', async (req, res) => {
  try {
    const { hourlyRate = 25, timeRange = '30d' } = req.query;
    const rate = parseFloat(hourlyRate as string);
    
    const timeRanges = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    };
    
    const startTime = new Date(Date.now() - timeRanges[timeRange as keyof typeof timeRanges]);
    
    const roiData = await PerformanceMetric.aggregate([
      { $match: { timestamp: { $gte: startTime } } },
      {
        $group: {
          _id: null,
          totalCases: { $sum: 1 },
          totalTimeSavedMs: { $sum: '$timeSavedMs' },
          totalProcessingTimeMs: { $sum: '$processingTimeMs' },
          totalEstimatedManualTimeMs: { $sum: '$estimatedManualTimeMs' },
          avgConfidence: { $avg: '$confidenceScore' }
        }
      }
    ]);
    
    const data = roiData[0] || {};
    const timeSavedHours = (data.totalTimeSavedMs || 0) / (1000 * 60 * 60);
    const costSavings = timeSavedHours * rate;
    const processingHours = (data.totalProcessingTimeMs || 0) / (1000 * 60 * 60);
    const manualHours = (data.totalEstimatedManualTimeMs || 0) / (1000 * 60 * 60);
    
    // Estimate system costs (simplified)
    const estimatedSystemCostPerHour = 5; // AWS/infrastructure costs
    const systemCosts = processingHours * estimatedSystemCostPerHour;
    
    const roi = {
      period: timeRange,
      metrics: {
        totalCases: data.totalCases || 0,
        timeSavedHours: Math.round(timeSavedHours * 100) / 100,
        processingHours: Math.round(processingHours * 100) / 100,
        manualHours: Math.round(manualHours * 100) / 100,
        averageConfidence: Math.round((data.avgConfidence || 0) * 100)
      },
      financial: {
        hourlyRate: rate,
        costSavings: Math.round(costSavings * 100) / 100,
        systemCosts: Math.round(systemCosts * 100) / 100,
        netSavings: Math.round((costSavings - systemCosts) * 100) / 100,
        roiPercentage: systemCosts > 0 ? 
          Math.round(((costSavings - systemCosts) / systemCosts) * 100) : 0
      },
      efficiency: {
        timeReduction: manualHours > 0 ? 
          Math.round((timeSavedHours / manualHours) * 100) : 0,
        costPerCase: data.totalCases > 0 ? 
          Math.round((systemCosts / data.totalCases) * 100) / 100 : 0,
        savingsPerCase: data.totalCases > 0 ? 
          Math.round((costSavings / data.totalCases) * 100) / 100 : 0
      }
    };
    
    res.json(roi);
  } catch (error) {
    console.error('Error generating ROI report:', error);
    res.status(500).json({ error: 'Failed to generate ROI report' });
  }
});

/**
 * @swagger
 * /api/reports/export:
 *   get:
 *     summary: Export performance data as CSV
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *         description: Export format
 *     responses:
 *       200:
 *         description: Exported data
 */
router.get('/export', async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    const data = await PerformanceMetric.find({
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: -1 });
    
    if (format === 'csv') {
      const csvHeaders = [
        'Timestamp', 'Case ID', 'Crisis Type', 'Processing Time (ms)',
        'Text Length', 'Fields Analyzed', 'Fields Updated', 'Confidence Score',
        'Time Saved (ms)', 'User Acceptance Rate', 'Errors', 'Warnings'
      ];
      
      const csvRows = data.map(metric => [
        metric.timestamp.toISOString(),
        metric.caseId,
        metric.crisisType,
        metric.processingTimeMs,
        metric.textLength,
        metric.fieldsAnalyzed,
        metric.fieldsUpdated,
        metric.confidenceScore,
        metric.timeSavedMs,
        metric.userAcceptanceRate,
        metric.errors?.length || 0,
        metric.warnings?.length || 0
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=performance_data.csv');
      res.send(csvContent);
    } else {
      res.json(data);
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

function generateRecommendations(stats: any, crisisTypes: any[], systemStats: any): string[] {
  const recommendations: string[] = [];
  
  // Performance recommendations
  if (stats.avgConfidence < 0.8) {
    recommendations.push('Consider retraining the AI model to improve confidence scores');
  }
  
  if (stats.avgUserAcceptance < 0.7) {
    recommendations.push('Review AI suggestions that are frequently overridden by users');
  }
  
  // Crisis type specific recommendations
  const lowPerformingTypes = crisisTypes.filter(type => type.avgConfidence < 80);
  if (lowPerformingTypes.length > 0) {
    recommendations.push(`Focus on improving AI performance for: ${lowPerformingTypes.map(t => t.crisisType).join(', ')}`);
  }
  
  // System recommendations
  if (systemStats.avgCpuUsage > 80) {
    recommendations.push('Consider scaling up compute resources to handle processing load');
  }
  
  if (systemStats.avgMemoryUsage > 85) {
    recommendations.push('Monitor memory usage and consider optimizing AI model memory footprint');
  }
  
  if (systemStats.apiErrorRate > 5) {
    recommendations.push('Investigate and address API errors to improve system reliability');
  }
  
  // Efficiency recommendations
  const efficiency = stats.totalFieldsAnalyzed > 0 ? 
    (stats.totalFieldsUpdated / stats.totalFieldsAnalyzed) * 100 : 0;
  
  if (efficiency < 60) {
    recommendations.push('Review field selection criteria to improve AI update efficiency');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('System is performing well. Continue monitoring for optimization opportunities.');
  }
  
  return recommendations;
}

export default router;
