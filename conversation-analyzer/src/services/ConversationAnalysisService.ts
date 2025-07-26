import axios from 'axios';
import { 
  ConversationSession, 
  ConversationAnalysis, 
  ConversationMessage,
  CrisisIndicator,
  CrisisType,
  RiskLevel,
  SentimentPoint,
  EmotionalState
} from '../types';
import { config } from '../config/config';
import { createLogger } from '../utils/logger';

export class ConversationAnalysisService {
  private logger = createLogger('ConversationAnalysisService');
  private sentimentApiClient;

  constructor() {
    this.sentimentApiClient = axios.create({
      baseURL: config.sentimentApi.url,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${config.sentimentApi.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async analyzeConversation(session: ConversationSession): Promise<ConversationAnalysis> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting conversation analysis', { 
        sessionId: session.id,
        messageCount: session.messages.length 
      });

      // Analyze individual messages
      const sentimentPoints = await this.analyzeSentimentTrend(session.messages);
      
      // Detect crisis indicators
      const crisisIndicators = await this.detectCrisisIndicators(session.messages);
      
      // Extract key phrases
      const keyPhrases = await this.extractKeyPhrases(session.messages);
      
      // Analyze emotional states
      const emotionalStates = await this.analyzeEmotionalStates(session.messages);
      
      // Calculate overall metrics
      const overallSentiment = this.calculateOverallSentiment(sentimentPoints);
      const riskLevel = this.calculateRiskLevel(crisisIndicators, overallSentiment);
      const recommendedActions = this.generateRecommendations(crisisIndicators, riskLevel, emotionalStates);
      
      const processingTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(sentimentPoints, crisisIndicators);

      const analysis: ConversationAnalysis = {
        overallSentiment,
        sentimentTrend: sentimentPoints,
        crisisIndicators,
        keyPhrases,
        emotionalStates,
        riskLevel,
        recommendedActions,
        confidence,
        processingTime,
        lastAnalyzedAt: new Date()
      };

      this.logger.info('Conversation analysis completed', {
        sessionId: session.id,
        processingTime,
        riskLevel,
        confidence,
        crisisIndicatorCount: crisisIndicators.length
      });

      return analysis;
    } catch (error) {
      this.logger.error('Error analyzing conversation', { 
        sessionId: session.id, 
        error: (error as Error).message 
      });
      
      // Return fallback analysis
      return this.createFallbackAnalysis(session, Date.now() - startTime);
    }
  }

  private async analyzeSentimentTrend(messages: ConversationMessage[]): Promise<SentimentPoint[]> {
    const sentimentPoints: SentimentPoint[] = [];
    
    for (const message of messages) {
      if (message.speaker === 'caller' && message.content.trim().length > 0) {
        try {
          const sentiment = await this.analyzeSingleMessage(message.content);
          sentimentPoints.push({
            timestamp: message.timestamp,
            sentiment: sentiment.score,
            confidence: sentiment.confidence,
            messageId: message.id
          });
        } catch (error) {
          this.logger.warn('Failed to analyze message sentiment', { 
            messageId: message.id, 
            error: (error as Error).message 
          });
          
          // Use fallback sentiment analysis
          const fallbackSentiment = this.getFallbackSentiment(message.content);
          sentimentPoints.push({
            timestamp: message.timestamp,
            sentiment: fallbackSentiment.score,
            confidence: fallbackSentiment.confidence,
            messageId: message.id
          });
        }
      }
    }
    
    return sentimentPoints;
  }

  private async analyzeSingleMessage(text: string): Promise<{ score: number; confidence: number }> {
    try {
      const response = await this.sentimentApiClient.post('/analyze', {
        text,
        options: {
          includeEmotions: true,
          includeCrisisIndicators: true
        }
      });
      
      return {
        score: response.data.sentiment.score,
        confidence: response.data.sentiment.confidence
      };
    } catch (error) {
      // Fallback to local analysis if API is unavailable
      return this.getFallbackSentiment(text);
    }
  }

  private async detectCrisisIndicators(messages: ConversationMessage[]): Promise<CrisisIndicator[]> {
    const indicators: CrisisIndicator[] = [];
    const callerMessages = messages.filter(m => m.speaker === 'caller');
    const fullText = callerMessages.map(m => m.content).join(' ');
    
    // Crisis keywords and patterns
    const crisisPatterns = {
      [CrisisType.SUICIDE_RISK]: {
        keywords: ['suicide', 'kill myself', 'end it all', 'not worth living', 'better off dead', 'want to die'],
        patterns: [/want to (die|kill myself)/i, /life is not worth/i, /end it all/i]
      },
      [CrisisType.MENTAL_HEALTH]: {
        keywords: ['depressed', 'anxiety', 'panic', 'hopeless', 'overwhelmed', 'can\'t cope'],
        patterns: [/feel so (depressed|hopeless|overwhelmed)/i, /can't (cope|handle)/i]
      },
      [CrisisType.DOMESTIC_VIOLENCE]: {
        keywords: ['hit me', 'hurt me', 'abusive', 'scared of', 'threatens me', 'violent'],
        patterns: [/(he|she) (hits|hurts|threatens) me/i, /scared of (him|her)/i]
      },
      [CrisisType.SUBSTANCE_ABUSE]: {
        keywords: ['overdose', 'too much', 'can\'t stop', 'addiction', 'withdrawal', 'drugs', 'alcohol'],
        patterns: [/can't stop (drinking|using)/i, /took too much/i]
      },
      [CrisisType.VIOLENCE_THREAT]: {
        keywords: ['hurt someone', 'kill them', 'make them pay', 'revenge', 'weapon'],
        patterns: [/want to hurt/i, /going to kill/i, /make (him|her|them) pay/i]
      }
    };

    for (const [crisisType, config] of Object.entries(crisisPatterns)) {
      const matchedKeywords: string[] = [];
      const matchedMessageIds: string[] = [];
      
      // Check keywords
      config.keywords.forEach(keyword => {
        if (fullText.toLowerCase().includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
        }
      });
      
      // Check patterns
      config.patterns.forEach(pattern => {
        if (pattern.test(fullText)) {
          matchedKeywords.push(pattern.source);
        }
      });
      
      // Find which messages contain the indicators
      callerMessages.forEach(message => {
        const hasIndicator = config.keywords.some(keyword => 
          message.content.toLowerCase().includes(keyword.toLowerCase())
        ) || config.patterns.some(pattern => pattern.test(message.content));
        
        if (hasIndicator) {
          matchedMessageIds.push(message.id);
        }
      });
      
      if (matchedKeywords.length > 0) {
        const severity = Math.min(matchedKeywords.length / config.keywords.length, 1);
        const confidence = matchedKeywords.length >= 2 ? 0.8 : 0.6;
        
        indicators.push({
          type: crisisType as CrisisType,
          severity,
          confidence,
          keywords: matchedKeywords,
          messageIds: matchedMessageIds,
          description: this.generateCrisisDescription(crisisType as CrisisType, matchedKeywords)
        });
      }
    }
    
    return indicators.sort((a, b) => b.severity - a.severity);
  }

  private async extractKeyPhrases(messages: ConversationMessage[]): Promise<string[]> {
    const callerMessages = messages.filter(m => m.speaker === 'caller');
    const text = callerMessages.map(m => m.content).join(' ');
    
    // Simple keyword extraction (in production, use NLP library)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private async analyzeEmotionalStates(messages: ConversationMessage[]): Promise<EmotionalState[]> {
    const emotionalStates: EmotionalState[] = [];
    const callerMessages = messages.filter(m => m.speaker === 'caller');
    
    // Emotion detection patterns
    const emotionPatterns = {
      anger: ['angry', 'mad', 'furious', 'rage', 'hate'],
      fear: ['scared', 'afraid', 'terrified', 'frightened', 'worried'],
      sadness: ['sad', 'depressed', 'crying', 'tears', 'heartbroken'],
      anxiety: ['anxious', 'nervous', 'panic', 'stressed', 'overwhelmed'],
      despair: ['hopeless', 'helpless', 'worthless', 'pointless', 'give up']
    };
    
    for (const [emotion, keywords] of Object.entries(emotionPatterns)) {
      let intensity = 0;
      let matchCount = 0;
      let startTime: Date | null = null;
      let endTime: Date | null = null;
      
      callerMessages.forEach(message => {
        const messageIntensity = keywords.reduce((acc, keyword) => {
          const matches = (message.content.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
          return acc + matches;
        }, 0);
        
        if (messageIntensity > 0) {
          intensity += messageIntensity;
          matchCount++;
          
          if (!startTime) startTime = message.timestamp;
          endTime = message.timestamp;
        }
      });
      
      if (matchCount > 0 && startTime) {
        const normalizedIntensity = Math.min(intensity / callerMessages.length, 1);
        const confidence = Math.min(matchCount / callerMessages.length * 2, 1);
        const duration = endTime ? endTime.getTime() - startTime.getTime() : 0;
        
        emotionalStates.push({
          emotion,
          intensity: normalizedIntensity,
          confidence,
          duration,
          startTime,
          endTime: endTime || startTime
        });
      }
    }
    
    return emotionalStates.sort((a, b) => b.intensity - a.intensity);
  }

  private calculateOverallSentiment(sentimentPoints: SentimentPoint[]): number {
    if (sentimentPoints.length === 0) return 0;
    
    // Weight more recent messages higher
    let weightedSum = 0;
    let totalWeight = 0;
    
    sentimentPoints.forEach((point, index) => {
      const weight = Math.pow(1.1, index); // More recent messages have higher weight
      weightedSum += point.sentiment * point.confidence * weight;
      totalWeight += point.confidence * weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private calculateRiskLevel(indicators: CrisisIndicator[], overallSentiment: number): RiskLevel {
    // High-risk indicators
    const highRiskTypes = [CrisisType.SUICIDE_RISK, CrisisType.VIOLENCE_THREAT];
    const hasHighRiskIndicator = indicators.some(i => 
      highRiskTypes.includes(i.type) && i.severity > 0.5
    );
    
    if (hasHighRiskIndicator) {
      return RiskLevel.IMMINENT;
    }
    
    // Calculate risk score
    let riskScore = 0;
    
    // Sentiment contribution (negative sentiment increases risk)
    if (overallSentiment < -0.7) riskScore += 0.4;
    else if (overallSentiment < -0.4) riskScore += 0.2;
    
    // Crisis indicators contribution
    indicators.forEach(indicator => {
      riskScore += indicator.severity * indicator.confidence * 0.3;
    });
    
    // Multiple indicators increase risk
    if (indicators.length > 2) riskScore += 0.2;
    
    if (riskScore >= 0.8) return RiskLevel.IMMINENT;
    if (riskScore >= 0.6) return RiskLevel.HIGH;
    if (riskScore >= 0.3) return RiskLevel.MODERATE;
    return RiskLevel.LOW;
  }

  private generateRecommendations(
    indicators: CrisisIndicator[], 
    riskLevel: RiskLevel, 
    emotionalStates: EmotionalState[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Risk-based recommendations
    switch (riskLevel) {
      case RiskLevel.IMMINENT:
        recommendations.push('IMMEDIATE INTERVENTION REQUIRED');
        recommendations.push('Contact emergency services');
        recommendations.push('Do not leave caller alone');
        break;
      case RiskLevel.HIGH:
        recommendations.push('Escalate to supervisor immediately');
        recommendations.push('Consider emergency services');
        recommendations.push('Implement safety planning');
        break;
      case RiskLevel.MODERATE:
        recommendations.push('Increase monitoring frequency');
        recommendations.push('Schedule follow-up within 24 hours');
        break;
    }
    
    // Crisis-specific recommendations
    indicators.forEach(indicator => {
      switch (indicator.type) {
        case CrisisType.SUICIDE_RISK:
          recommendations.push('Conduct suicide risk assessment');
          recommendations.push('Remove means of self-harm');
          recommendations.push('Activate crisis response team');
          break;
        case CrisisType.DOMESTIC_VIOLENCE:
          recommendations.push('Provide safety planning resources');
          recommendations.push('Connect with domestic violence services');
          recommendations.push('Document incident details');
          break;
        case CrisisType.SUBSTANCE_ABUSE:
          recommendations.push('Assess for overdose risk');
          recommendations.push('Provide addiction resources');
          recommendations.push('Consider medical evaluation');
          break;
      }
    });
    
    // Emotion-based recommendations
    const dominantEmotion = emotionalStates[0];
    if (dominantEmotion) {
      switch (dominantEmotion.emotion) {
        case 'anxiety':
          recommendations.push('Use calming techniques');
          recommendations.push('Provide grounding exercises');
          break;
        case 'anger':
          recommendations.push('De-escalation techniques');
          recommendations.push('Allow venting in safe manner');
          break;
        case 'despair':
          recommendations.push('Focus on hope and support');
          recommendations.push('Identify coping resources');
          break;
      }
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  private calculateConfidence(sentimentPoints: SentimentPoint[], indicators: CrisisIndicator[]): number {
    if (sentimentPoints.length === 0) return 0;
    
    const avgSentimentConfidence = sentimentPoints.reduce((sum, point) => sum + point.confidence, 0) / sentimentPoints.length;
    const avgIndicatorConfidence = indicators.length > 0 
      ? indicators.reduce((sum, indicator) => sum + indicator.confidence, 0) / indicators.length 
      : 0.5;
    
    return (avgSentimentConfidence + avgIndicatorConfidence) / 2;
  }

  private getFallbackSentiment(text: string): { score: number; confidence: number } {
    // Simple fallback sentiment analysis
    const positiveWords = ['good', 'great', 'happy', 'better', 'hope', 'thank', 'help'];
    const negativeWords = ['bad', 'terrible', 'sad', 'worse', 'hate', 'hurt', 'pain', 'kill', 'die'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 0.1;
      if (negativeWords.includes(word)) score -= 0.1;
    });
    
    return {
      score: Math.max(-1, Math.min(1, score)),
      confidence: 0.5 // Lower confidence for fallback
    };
  }

  private generateCrisisDescription(crisisType: CrisisType, keywords: string[]): string {
    const descriptions = {
      [CrisisType.SUICIDE_RISK]: `Suicide risk indicators detected: ${keywords.join(', ')}`,
      [CrisisType.MENTAL_HEALTH]: `Mental health crisis indicators: ${keywords.join(', ')}`,
      [CrisisType.DOMESTIC_VIOLENCE]: `Domestic violence indicators: ${keywords.join(', ')}`,
      [CrisisType.SUBSTANCE_ABUSE]: `Substance abuse indicators: ${keywords.join(', ')}`,
      [CrisisType.VIOLENCE_THREAT]: `Violence threat indicators: ${keywords.join(', ')}`,
      [CrisisType.CHILD_WELFARE]: `Child welfare concerns: ${keywords.join(', ')}`,
      [CrisisType.ELDER_ABUSE]: `Elder abuse indicators: ${keywords.join(', ')}`,
      [CrisisType.GENERAL_EMERGENCY]: `General emergency indicators: ${keywords.join(', ')}`
    };
    
    return descriptions[crisisType] || `Crisis indicators detected: ${keywords.join(', ')}`;
  }

  private createFallbackAnalysis(session: ConversationSession, processingTime: number): ConversationAnalysis {
    return {
      overallSentiment: 0,
      sentimentTrend: [],
      crisisIndicators: [],
      keyPhrases: [],
      emotionalStates: [],
      riskLevel: RiskLevel.LOW,
      recommendedActions: ['Analysis failed - manual review required'],
      confidence: 0,
      processingTime,
      lastAnalyzedAt: new Date()
    };
  }
}
