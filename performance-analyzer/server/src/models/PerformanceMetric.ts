import mongoose, { Document, Schema } from 'mongoose';

export interface IPerformanceMetric extends Document {
  timestamp: Date;
  caseId: string;
  crisisType: string;
  
  // Processing metrics
  processingTimeMs: number;
  textLength: number;
  fieldsAnalyzed: number;
  fieldsUpdated: number;
  
  // Accuracy metrics
  confidenceScore: number;
  humanVerified?: boolean;
  accuracyScore?: number;
  
  // Sentiment analysis results
  sentimentResults: {
    field: string;
    originalValue?: string;
    analyzedValue: string;
    confidence: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    emotionalIntensity: number;
  }[];
  
  // Time savings
  estimatedManualTimeMs: number;
  timeSavedMs: number;
  
  // System metrics
  cpuUsage?: number;
  memoryUsage?: number;
  
  // Error tracking
  errors?: string[];
  warnings?: string[];
  
  // User interaction
  userOverrides: number;
  userAcceptanceRate: number;
}

const PerformanceMetricSchema = new Schema<IPerformanceMetric>({
  timestamp: { type: Date, default: Date.now, index: true },
  caseId: { type: String, required: true, index: true },
  crisisType: { type: String, required: true, index: true },
  
  processingTimeMs: { type: Number, required: true },
  textLength: { type: Number, required: true },
  fieldsAnalyzed: { type: Number, required: true },
  fieldsUpdated: { type: Number, required: true },
  
  confidenceScore: { type: Number, required: true, min: 0, max: 1 },
  humanVerified: { type: Boolean },
  accuracyScore: { type: Number, min: 0, max: 1 },
  
  sentimentResults: [{
    field: { type: String, required: true },
    originalValue: String,
    analyzedValue: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    sentiment: { type: String, enum: ['positive', 'negative', 'neutral'], required: true },
    emotionalIntensity: { type: Number, required: true, min: 0, max: 1 }
  }],
  
  estimatedManualTimeMs: { type: Number, required: true },
  timeSavedMs: { type: Number, required: true },
  
  cpuUsage: Number,
  memoryUsage: Number,
  
  errors: [String],
  warnings: [String],
  
  userOverrides: { type: Number, default: 0 },
  userAcceptanceRate: { type: Number, default: 1, min: 0, max: 1 }
});

// Indexes for performance
PerformanceMetricSchema.index({ timestamp: -1 });
PerformanceMetricSchema.index({ crisisType: 1, timestamp: -1 });
PerformanceMetricSchema.index({ caseId: 1 });

export default mongoose.model<IPerformanceMetric>('PerformanceMetric', PerformanceMetricSchema);
