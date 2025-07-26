import { Router } from 'express';
import { PlatformType, WebhookPayload, WebhookEvent } from '../types';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger('WebhookRoutes');

// Middleware to parse webhook payloads
const parseWebhookPayload = (platformType: PlatformType) => {
  return (req: any, res: any, next: any) => {
    try {
      const payload: WebhookPayload = {
        platform: platformType,
        event: req.body.event || determineEventType(platformType, req.body),
        data: req.body,
        timestamp: new Date(),
        signature: req.headers['x-twilio-signature'] || req.headers['x-genesys-signature']
      };
      
      req.webhookPayload = payload;
      next();
    } catch (error) {
      logger.error('Error parsing webhook payload', { 
        platform: platformType, 
        error: (error as Error).message 
      });
      res.status(400).json({ error: 'Invalid webhook payload' });
    }
  };
};

// Twilio webhook endpoints
router.post('/twilio/voice', parseWebhookPayload(PlatformType.TWILIO), async (req, res) => {
  try {
    const payload: WebhookPayload = req.webhookPayload;
    
    logger.info('Twilio voice webhook received', { 
      event: payload.event,
      callSid: payload.data.CallSid 
    });

    // Process webhook through the main app
    // This would be injected or accessed through a service locator
    // await app.processWebhook(PlatformType.TWILIO, payload);

    // Respond with TwiML if needed
    if (payload.event === WebhookEvent.CONVERSATION_STARTED) {
      res.type('text/xml');
      res.send(`
        <Response>
          <Say>Thank you for calling. Your conversation is being analyzed for quality assurance.</Say>
          <Record action="/webhooks/twilio/recording" transcribe="true" />
        </Response>
      `);
    } else {
      res.status(200).json({ status: 'received' });
    }
  } catch (error) {
    logger.error('Error processing Twilio webhook', { error: (error as Error).message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/twilio/sms', parseWebhookPayload(PlatformType.TWILIO), async (req, res) => {
  try {
    const payload: WebhookPayload = req.webhookPayload;
    
    logger.info('Twilio SMS webhook received', { 
      from: payload.data.From,
      body: payload.data.Body 
    });

    // Process SMS webhook
    // await app.processWebhook(PlatformType.TWILIO, payload);

    res.status(200).json({ status: 'received' });
  } catch (error) {
    logger.error('Error processing Twilio SMS webhook', { error: (error as Error).message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/twilio/recording', parseWebhookPayload(PlatformType.TWILIO), async (req, res) => {
  try {
    const payload: WebhookPayload = req.webhookPayload;
    payload.event = WebhookEvent.RECORDING_AVAILABLE;
    
    logger.info('Twilio recording webhook received', { 
      callSid: payload.data.CallSid,
      recordingUrl: payload.data.RecordingUrl 
    });

    // Process recording webhook
    // await app.processWebhook(PlatformType.TWILIO, payload);

    res.status(200).json({ status: 'received' });
  } catch (error) {
    logger.error('Error processing Twilio recording webhook', { error: (error as Error).message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Genesys Cloud webhook endpoints
router.post('/genesys/conversation', parseWebhookPayload(PlatformType.GENESYS), async (req, res) => {
  try {
    const payload: WebhookPayload = req.webhookPayload;
    
    logger.info('Genesys conversation webhook received', { 
      event: payload.event,
      conversationId: payload.data.conversationId 
    });

    // Process webhook
    // await app.processWebhook(PlatformType.GENESYS, payload);

    res.status(200).json({ status: 'received' });
  } catch (error) {
    logger.error('Error processing Genesys webhook', { error: (error as Error).message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/genesys/message', parseWebhookPayload(PlatformType.GENESYS), async (req, res) => {
  try {
    const payload: WebhookPayload = req.webhookPayload;
    payload.event = WebhookEvent.MESSAGE_RECEIVED;
    
    logger.info('Genesys message webhook received', { 
      conversationId: payload.data.conversationId,
      messageType: payload.data.messageType 
    });

    // Process webhook
    // await app.processWebhook(PlatformType.GENESYS, payload);

    res.status(200).json({ status: 'received' });
  } catch (error) {
    logger.error('Error processing Genesys message webhook', { error: (error as Error).message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Generic webhook endpoint for testing
router.post('/generic', (req, res) => {
  logger.info('Generic webhook received', { 
    headers: req.headers,
    body: req.body 
  });
  
  res.status(200).json({ 
    status: 'received',
    timestamp: new Date().toISOString(),
    data: req.body
  });
});

// Webhook validation endpoints
router.get('/twilio/validate', (req, res) => {
  // Twilio webhook validation
  const { AccountSid, AuthToken } = req.query;
  
  if (AccountSid && AuthToken) {
    res.status(200).json({ 
      valid: true,
      message: 'Twilio webhook endpoint is ready' 
    });
  } else {
    res.status(400).json({ 
      valid: false,
      message: 'Missing AccountSid or AuthToken' 
    });
  }
});

router.get('/genesys/validate', (req, res) => {
  // Genesys webhook validation
  res.status(200).json({ 
    valid: true,
    message: 'Genesys webhook endpoint is ready' 
  });
});

// Helper function to determine event type from webhook data
function determineEventType(platformType: PlatformType, data: any): WebhookEvent {
  switch (platformType) {
    case PlatformType.TWILIO:
      if (data.CallStatus === 'ringing' || data.CallStatus === 'in-progress') {
        return WebhookEvent.CONVERSATION_STARTED;
      } else if (data.CallStatus === 'completed') {
        return WebhookEvent.CONVERSATION_ENDED;
      } else if (data.SpeechResult || data.Body) {
        return WebhookEvent.MESSAGE_RECEIVED;
      } else if (data.RecordingUrl) {
        return WebhookEvent.RECORDING_AVAILABLE;
      }
      break;
      
    case PlatformType.GENESYS:
      if (data.eventType === 'conversation.start') {
        return WebhookEvent.CONVERSATION_STARTED;
      } else if (data.eventType === 'conversation.end') {
        return WebhookEvent.CONVERSATION_ENDED;
      } else if (data.eventType === 'message') {
        return WebhookEvent.MESSAGE_RECEIVED;
      } else if (data.eventType === 'participant.join') {
        return WebhookEvent.PARTICIPANT_JOINED;
      } else if (data.eventType === 'participant.leave') {
        return WebhookEvent.PARTICIPANT_LEFT;
      }
      break;
  }
  
  return WebhookEvent.MESSAGE_RECEIVED; // Default fallback
}

export default router;
