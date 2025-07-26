import express from 'express';
import PerformanceMetric from '../models/PerformanceMetric';
import SystemMetric from '../models/SystemMetric';

const router = express.Router();

/**
 * @swagger
 * /api/metrics/performance:
 *   post:
 *     summary: Record a new performance metric
 *     tags: [Metrics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - caseId
 *               - crisisType
 *               - processingTimeMs
 *               - textLength
 *               - fieldsAnalyzed
 *               - fieldsUpdated
 *               - confidenceScore
 *               - estimatedManualTimeMs
 *     responses:
 *       201:
 *         description: Performance metric recorded successfully
 */
router.post('/performance', async (req, res) => {
  try {
    const metric = new PerformanceMetric({
      ...req.body,
      timeSavedMs: req.body.estimatedManualTimeMs - req.body.processingTimeMs
    });
    
    await metric.save();
    
    res.status(201).json({
      message: 'Performance metric recorded successfully',
      id: metric._id
    });
  } catch (error) {
    console.error('Error recording performance metric:', error);
    res.status(500).json({ error: 'Failed to record performance metric' });
  }
});

/**
 * @swagger
 * /api/metrics/system:
 *   post:
 *     summary: Record system metrics
 *     tags: [Metrics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cpuUsagePercent
 *               - memoryUsagePercent
 *               - diskUsagePercent
 *               - totalRequests
 *               - successfulRequests
 *               - failedRequests
 *               - averageResponseTime
 *               - modelVersion
 *               - casesProcessedPerHour
 *               - averageProcessingTime
 *               - errorRate
 *               - warningRate
 *     responses:
 *       201:
 *         description: System metric recorded successfully
 */
router.post('/system', async (req, res) => {
  try {
    const metric = new SystemMetric(req.body);
    await metric.save();
    
    res.status(201).json({
      message: 'System metric recorded successfully',
      id: metric._id
    });
  } catch (error) {
    console.error('Error recording system metric:', error);
    res.status(500).json({ error: 'Failed to record system metric' });
  }
});

/**
 * @swagger
 * /api/metrics/performance/{caseId}:
 *   get:
 *     summary: Get performance metrics for a specific case
 *     tags: [Metrics]
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Performance metrics for the case
 */
router.get('/performance/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const metrics = await PerformanceMetric.find({ caseId }).sort({ timestamp: -1 });
    
    if (metrics.length === 0) {
      return res.status(404).json({ error: 'No metrics found for this case' });
    }
    
    res.json({
      caseId,
      metrics,
      summary: {
        totalAnalyses: metrics.length,
        avgProcessingTime: metrics.reduce((sum, m) => sum + m.processingTimeMs, 0) / metrics.length,
        avgConfidence: metrics.reduce((sum, m) => sum + m.confidenceScore, 0) / metrics.length,
        totalTimeSaved: metrics.reduce((sum, m) => sum + m.timeSavedMs, 0),
        lastAnalyzed: metrics[0].timestamp
      }
    });
  } catch (error) {
    console.error('Error fetching case metrics:', error);
    res.status(500).json({ error: 'Failed to fetch case metrics' });
  }
});

/**
 * @swagger
 * /api/metrics/bulk-performance:
 *   post:
 *     summary: Record multiple performance metrics at once
 *     tags: [Metrics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Bulk metrics recorded successfully
 */
router.post('/bulk-performance', async (req, res) => {
  try {
    const { metrics } = req.body;
    
    if (!Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({ error: 'Invalid metrics array' });
    }
    
    const processedMetrics = metrics.map(metric => ({
      ...metric,
      timeSavedMs: metric.estimatedManualTimeMs - metric.processingTimeMs
    }));
    
    const result = await PerformanceMetric.insertMany(processedMetrics);
    
    res.status(201).json({
      message: 'Bulk metrics recorded successfully',
      count: result.length,
      ids: result.map(m => m._id)
    });
  } catch (error) {
    console.error('Error recording bulk metrics:', error);
    res.status(500).json({ error: 'Failed to record bulk metrics' });
  }
});

/**
 * @swagger
 * /api/metrics/accuracy-feedback:
 *   post:
 *     summary: Update accuracy feedback for a performance metric
 *     tags: [Metrics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - metricId
 *               - accuracyScore
 *               - humanVerified
 *     responses:
 *       200:
 *         description: Accuracy feedback updated successfully
 */
router.post('/accuracy-feedback', async (req, res) => {
  try {
    const { metricId, accuracyScore, humanVerified, userOverrides } = req.body;
    
    const metric = await PerformanceMetric.findByIdAndUpdate(
      metricId,
      {
        accuracyScore,
        humanVerified,
        ...(userOverrides !== undefined && { userOverrides }),
        userAcceptanceRate: userOverrides !== undefined ? 
          1 - (userOverrides / (metric?.fieldsUpdated || 1)) : undefined
      },
      { new: true }
    );
    
    if (!metric) {
      return res.status(404).json({ error: 'Metric not found' });
    }
    
    res.json({
      message: 'Accuracy feedback updated successfully',
      metric
    });
  } catch (error) {
    console.error('Error updating accuracy feedback:', error);
    res.status(500).json({ error: 'Failed to update accuracy feedback' });
  }
});

/**
 * @swagger
 * /api/metrics/system/latest:
 *   get:
 *     summary: Get latest system metrics
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Latest system metrics
 */
router.get('/system/latest', async (req, res) => {
  try {
    const latestMetric = await SystemMetric.findOne({}, {}, { sort: { timestamp: -1 } });
    
    if (!latestMetric) {
      return res.status(404).json({ error: 'No system metrics found' });
    }
    
    res.json(latestMetric);
  } catch (error) {
    console.error('Error fetching latest system metrics:', error);
    res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
});

export default router;
