import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemMetric extends Document {
  timestamp: Date;
  
  // System performance
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
  
  // API metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  
  // AI model metrics
  modelLoadTime?: number;
  modelVersion: string;
  
  // Throughput metrics
  casesProcessedPerHour: number;
  averageProcessingTime: number;
  
  // Queue metrics
  queueLength?: number;
  queueWaitTime?: number;
  
  // Error rates
  errorRate: number;
  warningRate: number;
}

const SystemMetricSchema = new Schema<ISystemMetric>({
  timestamp: { type: Date, default: Date.now, index: true },
  
  cpuUsagePercent: { type: Number, required: true, min: 0, max: 100 },
  memoryUsagePercent: { type: Number, required: true, min: 0, max: 100 },
  diskUsagePercent: { type: Number, required: true, min: 0, max: 100 },
  
  totalRequests: { type: Number, required: true, min: 0 },
  successfulRequests: { type: Number, required: true, min: 0 },
  failedRequests: { type: Number, required: true, min: 0 },
  averageResponseTime: { type: Number, required: true, min: 0 },
  
  modelLoadTime: Number,
  modelVersion: { type: String, required: true },
  
  casesProcessedPerHour: { type: Number, required: true, min: 0 },
  averageProcessingTime: { type: Number, required: true, min: 0 },
  
  queueLength: Number,
  queueWaitTime: Number,
  
  errorRate: { type: Number, required: true, min: 0, max: 1 },
  warningRate: { type: Number, required: true, min: 0, max: 1 }
});

// Indexes for time-series queries
SystemMetricSchema.index({ timestamp: -1 });

export default mongoose.model<ISystemMetric>('SystemMetric', SystemMetricSchema);
