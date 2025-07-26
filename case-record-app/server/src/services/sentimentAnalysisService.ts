import axios from 'axios';
import { config } from '../config/config';
import {
  SentimentAnalysisRequest,
  SentimentAnalysisResponse,
  CrisisType,
  EmotionalState,
  RiskLevel,
  CaseRecord,
  UpdateSource
} from '../types';

export class SentimentAnalysisService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = config.sentimentAnalysis.apiUrl;
    this.apiKey = config.sentimentAnalysis.apiKey;
  }

  /**
   * Analyze sentiment of given text
   */
  async analyzeSentiment(request: SentimentAnalysisRequest): Promise<SentimentAnalysisResponse> {
    try {
      // If sentiment analysis API is not available, return mock data
      if (!this.apiUrl || this.apiUrl === 'http://localhost:8000') {
        return this.getMockSentimentAnalysis(request);
      }

      const response = await axios.post(
        `${this.apiUrl}/analyze`,
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.data as SentimentAnalysisResponse;
    } catch (error) {
      console.error('Sentiment analysis API error:', error);
      // Fallback to mock data if API fails
      return this.getMockSentimentAnalysis(request);
    }
  }

  /**
   * Analyze case record and update relevant fields
   */
  async analyzeCaseRecord(caseRecord: any): Promise<any> {
    try {
      // Combine relevant text fields for analysis
      const textToAnalyze = this.extractTextFromCase(caseRecord);
      
      const analysisRequest: SentimentAnalysisRequest = {
        text: textToAnalyze,
        context: `Crisis Type: ${caseRecord.crisisType}`,
        crisisType: caseRecord.crisisType
      };

      const analysis = await this.analyzeSentiment(analysisRequest);
      
      // Update case record with analysis results
      const updatedCase = this.applySentimentAnalysis(caseRecord, analysis);
      
      return updatedCase;
    } catch (error) {
      console.error('Error analyzing case record:', error);
      throw new Error('Failed to analyze case record');
    }
  }

  /**
   * Extract relevant text from case record for analysis
   */
  private extractTextFromCase(caseRecord: any): string {
    const textParts: string[] = [];

    // Crisis description
    if (caseRecord.crisisDetails?.description) {
      textParts.push(caseRecord.crisisDetails.description);
    }

    // Risk factors
    if (caseRecord.crisisDetails?.riskFactors?.length) {
      textParts.push(`Risk factors: ${caseRecord.crisisDetails.riskFactors.join(', ')}`);
    }

    // Immediate needs
    if (caseRecord.crisisDetails?.immediateNeeds?.length) {
      textParts.push(`Immediate needs: ${caseRecord.crisisDetails.immediateNeeds.join(', ')}`);
    }

    // Crisis-specific details
    const crisisDetails = this.extractCrisisSpecificText(caseRecord);
    if (crisisDetails) {
      textParts.push(crisisDetails);
    }

    // Assessment notes
    if (caseRecord.assessment?.cognitiveState) {
      textParts.push(`Cognitive state: ${caseRecord.assessment.cognitiveState}`);
    }
    if (caseRecord.assessment?.physicalCondition) {
      textParts.push(`Physical condition: ${caseRecord.assessment.physicalCondition}`);
    }
    if (caseRecord.assessment?.socialSupport) {
      textParts.push(`Social support: ${caseRecord.assessment.socialSupport}`);
    }

    return textParts.join('. ');
  }

  /**
   * Extract crisis-specific text details
   */
  private extractCrisisSpecificText(caseRecord: any): string {
    const { crisisType, crisisDetails } = caseRecord;
    const parts: string[] = [];

    switch (crisisType) {
      case CrisisType.MENTAL_HEALTH:
        if (crisisDetails.mentalHealthDetails) {
          const mh = crisisDetails.mentalHealthDetails;
          if (mh.mentalHealthHistory) parts.push(`Mental health history: ${mh.mentalHealthHistory}`);
          if (mh.triggerEvents?.length) parts.push(`Trigger events: ${mh.triggerEvents.join(', ')}`);
        }
        break;

      case CrisisType.DOMESTIC_VIOLENCE:
        if (crisisDetails.domesticViolenceDetails) {
          const dv = crisisDetails.domesticViolenceDetails;
          parts.push(`Relationship to abuser: ${dv.relationshipToAbuser}`);
        }
        break;

      case CrisisType.SUBSTANCE_ABUSE:
        if (crisisDetails.substanceAbuseDetails) {
          const sa = crisisDetails.substanceAbuseDetails;
          if (sa.substanceType?.length) parts.push(`Substances: ${sa.substanceType.join(', ')}`);
        }
        break;

      case CrisisType.CHILD_WELFARE:
        if (crisisDetails.childWelfareDetails) {
          const cw = crisisDetails.childWelfareDetails;
          parts.push(`Child age: ${cw.childAge}`);
        }
        break;

      case CrisisType.ELDER_ABUSE:
        if (crisisDetails.elderAbuseDetails) {
          const ea = crisisDetails.elderAbuseDetails;
          parts.push(`Elder age: ${ea.elderAge}, Caregiver: ${ea.caregiverRelationship}`);
        }
        break;
    }

    return parts.join('. ');
  }

  /**
   * Apply sentiment analysis results to case record
   */
  private applySentimentAnalysis(caseRecord: any, analysis: SentimentAnalysisResponse): any {
    const updatedCase = { ...caseRecord };

    // Update sentiment score
    if (!updatedCase.assessment) updatedCase.assessment = {};
    updatedCase.assessment.sentimentScore = analysis.score;

    // Track field update
    updatedCase.addFieldUpdate?.(
      'assessment.sentimentScore',
      analysis.score,
      UpdateSource.AI_SENTIMENT_ANALYSIS,
      updatedCase.assessment.sentimentScore,
      analysis.confidence
    );

    // Update emotional state
    const emotionalStates = Object.entries(analysis.emotions)
      .filter(([_, score]) => score > 0.3)
      .map(([emotion, _]) => emotion as EmotionalState);

    if (emotionalStates.length > 0) {
      updatedCase.assessment.emotionalState = emotionalStates;
      updatedCase.addFieldUpdate?.(
        'assessment.emotionalState',
        emotionalStates,
        UpdateSource.AI_SENTIMENT_ANALYSIS,
        updatedCase.assessment.emotionalState,
        analysis.confidence
      );
    }

    // Update risk level based on risk indicators
    const newRiskLevel = this.calculateRiskLevel(analysis.riskIndicators, caseRecord.crisisType);
    if (newRiskLevel !== updatedCase.assessment.riskLevel) {
      updatedCase.assessment.riskLevel = newRiskLevel;
      updatedCase.addFieldUpdate?.(
        'assessment.riskLevel',
        newRiskLevel,
        UpdateSource.AI_SENTIMENT_ANALYSIS,
        updatedCase.assessment.riskLevel,
        analysis.confidence
      );
    }

    // Add AI recommendations
    if (analysis.recommendations.length > 0) {
      updatedCase.assessment.recommendations = [
        ...(updatedCase.assessment.recommendations || []),
        ...analysis.recommendations
      ];
      updatedCase.addFieldUpdate?.(
        'assessment.recommendations',
        updatedCase.assessment.recommendations,
        UpdateSource.AI_SENTIMENT_ANALYSIS,
        updatedCase.assessment.recommendations,
        analysis.confidence
      );
    }

    return updatedCase;
  }

  /**
   * Calculate risk level based on risk indicators
   */
  private calculateRiskLevel(riskIndicators: any, crisisType: CrisisType): RiskLevel {
    let riskScore = 0;

    // Base risk calculation
    Object.values(riskIndicators).forEach((score: any) => {
      riskScore += score;
    });

    // Crisis-type specific adjustments
    switch (crisisType) {
      case CrisisType.MENTAL_HEALTH:
        if (riskIndicators.suicidal > 0.7) return RiskLevel.IMMINENT;
        break;
      case CrisisType.DOMESTIC_VIOLENCE:
        if (riskIndicators.violence > 0.8) return RiskLevel.IMMINENT;
        break;
      case CrisisType.SUBSTANCE_ABUSE:
        if (riskIndicators.substance > 0.8) return RiskLevel.HIGH;
        break;
    }

    // General risk level calculation
    if (riskScore > 2.5) return RiskLevel.IMMINENT;
    if (riskScore > 1.5) return RiskLevel.HIGH;
    if (riskScore > 0.8) return RiskLevel.MODERATE;
    return RiskLevel.LOW;
  }

  /**
   * Mock sentiment analysis for development/testing
   */
  private getMockSentimentAnalysis(request: SentimentAnalysisRequest): SentimentAnalysisResponse {
    const text = request.text.toLowerCase();
    
    // Simple keyword-based mock analysis
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let score = 0;
    
    const negativeKeywords = ['sad', 'angry', 'hurt', 'pain', 'afraid', 'scared', 'hopeless', 'depressed', 'anxious'];
    const positiveKeywords = ['happy', 'good', 'better', 'hope', 'calm', 'safe', 'support'];
    
    const negativeCount = negativeKeywords.filter(word => text.includes(word)).length;
    const positiveCount = positiveKeywords.filter(word => text.includes(word)).length;
    
    if (negativeCount > positiveCount) {
      sentiment = 'negative';
      score = -Math.min(0.8, negativeCount * 0.2);
    } else if (positiveCount > negativeCount) {
      sentiment = 'positive';
      score = Math.min(0.8, positiveCount * 0.2);
    }

    // Mock emotional states
    const emotions: { [key in EmotionalState]?: number } = {};
    if (text.includes('anxious') || text.includes('worried')) emotions[EmotionalState.ANXIOUS] = 0.7;
    if (text.includes('sad') || text.includes('depressed')) emotions[EmotionalState.DEPRESSED] = 0.6;
    if (text.includes('angry') || text.includes('mad')) emotions[EmotionalState.ANGRY] = 0.5;
    if (text.includes('afraid') || text.includes('scared')) emotions[EmotionalState.FEARFUL] = 0.8;

    // Mock risk indicators
    const riskIndicators = {
      suicidal: text.includes('suicide') || text.includes('kill myself') ? 0.9 : 0.1,
      violence: text.includes('hurt') || text.includes('violence') ? 0.6 : 0.2,
      substance: text.includes('drugs') || text.includes('alcohol') ? 0.5 : 0.1,
      neglect: text.includes('neglect') || text.includes('abandon') ? 0.4 : 0.1
    };

    // Mock recommendations
    const recommendations: string[] = [];
    if (riskIndicators.suicidal > 0.5) {
      recommendations.push('Immediate suicide risk assessment required');
      recommendations.push('Consider psychiatric evaluation');
    }
    if (riskIndicators.violence > 0.5) {
      recommendations.push('Safety planning needed');
      recommendations.push('Consider law enforcement involvement');
    }
    if ((emotions[EmotionalState.ANXIOUS] || 0) > 0.5) {
      recommendations.push('Anxiety management techniques recommended');
    }

    return {
      sentiment,
      score,
      confidence: 0.75,
      emotions,
      riskIndicators,
      recommendations
    };
  }
}

export const sentimentAnalysisService = new SentimentAnalysisService();
