# Conversation Analyzer

A real-time conversation analysis service that processes conversations from multiple communication platforms (Twilio, Genesys Cloud, WebSocket) and automatically creates/updates cases in the case record management system based on sentiment analysis and crisis detection.

## Features

### 🔌 **Platform Agnostic**
- **Twilio Integration**: Voice calls, SMS, and recordings
- **Genesys Cloud Integration**: Conversations, messages, and analytics
- **WebSocket Support**: Real-time testing and custom integrations
- **Extensible Architecture**: Easy to add new platforms

### 🧠 **Real-time Analysis**
- **Sentiment Analysis**: Continuous sentiment tracking throughout conversations
- **Crisis Detection**: Automatic detection of suicide risk, violence threats, domestic violence, etc.
- **Emotional State Analysis**: Recognition of anxiety, depression, anger, fear, and other emotions
- **Risk Assessment**: Dynamic risk level calculation (Low, Moderate, High, Imminent)

### 🚨 **Automated Actions**
- **Auto Case Creation**: Automatically creates cases in the case record system for high-risk situations
- **Supervisor Alerts**: Immediate notifications for imminent risk situations
- **Call Escalation**: Automatic escalation to crisis specialists
- **Follow-up Scheduling**: Automated follow-up scheduling based on risk level

### 📊 **Real-time Monitoring**
- **WebSocket Events**: Real-time updates for connected clients
- **Processing Statistics**: Queue size, processing times, risk distributions
- **Health Monitoring**: Adapter status, API connectivity, system health

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Twilio API    │    │  Genesys Cloud   │    │   WebSocket     │
│   (Voice/SMS)   │    │      API         │    │    Clients      │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          └──────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Conversation Analyzer  │
                    │     (Main Service)      │
                    └────────────┬────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌─────────▼─────────┐
│ Sentiment Analysis│  │ Conversation      │  │ Case Record       │
│     Service       │  │   Processor       │  │    Service        │
└───────────────────┘  └───────────────────┘  └─────────┬─────────┘
                                                         │
                                              ┌─────────▼─────────┐
                                              │ Case Record API   │
                                              │  (External API)   │
                                              └───────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- Redis (optional, for caching)
- Case Record API running (see ../case-record-app)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd conversation-analyzer
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the service:**
   ```bash
   npm run dev
   ```

4. **Access the service:**
   - HTTP API: http://localhost:6000
   - WebSocket: ws://localhost:6001
   - Health Check: http://localhost:6000/health

### Docker Setup

```bash
docker build -t conversation-analyzer .
docker run -p 6000:6000 -p 6001:6001 conversation-analyzer
```

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=6000
NODE_ENV=development

# Case Record API
CASE_RECORD_API_URL=http://localhost:5000/api
CASE_RECORD_API_KEY=your-api-key

# Sentiment Analysis API
SENTIMENT_API_URL=http://localhost:8000
SENTIMENT_API_KEY=your-sentiment-api-key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WEBHOOK_URL=https://your-domain.com/webhooks/twilio

# Genesys Cloud Configuration
GENESYS_CLIENT_ID=your-client-id
GENESYS_CLIENT_SECRET=your-client-secret
GENESYS_ENVIRONMENT=mypurecloud.com

# Processing Configuration
ANALYSIS_BATCH_SIZE=10
ANALYSIS_INTERVAL_MS=5000
AUTO_CASE_CREATION_ENABLED=true
CRISIS_SENTIMENT_THRESHOLD=-0.7
```

## Platform Integration

### Twilio Integration

1. **Configure Webhooks:**
   ```bash
   # Voice webhook URL
   https://your-domain.com/webhooks/twilio/voice
   
   # SMS webhook URL
   https://your-domain.com/webhooks/twilio/sms
   ```

2. **TwiML Response Example:**
   ```xml
   <Response>
     <Say>Thank you for calling. Your conversation is being analyzed.</Say>
     <Record action="/webhooks/twilio/recording" transcribe="true" />
   </Response>
   ```

### Genesys Cloud Integration

1. **Setup OAuth Client:**
   - Create OAuth client in Genesys Cloud
   - Configure webhook notifications
   - Set appropriate permissions

2. **Webhook Configuration:**
   ```bash
   # Conversation webhook
   https://your-domain.com/webhooks/genesys/conversation
   
   # Message webhook
   https://your-domain.com/webhooks/genesys/message
   ```

### WebSocket Integration

```javascript
const socket = io('ws://localhost:6001');

// Start a conversation
socket.emit('start_conversation', {
  userInfo: {
    name: 'John Doe',
    phone: '+1234567890'
  }
});

// Send messages
socket.emit('send_message', {
  content: 'I need help with my situation',
  messageType: 'text'
});

// Listen for analysis updates
socket.on('analysis_updated', (analysis) => {
  console.log('Risk Level:', analysis.riskLevel);
  console.log('Sentiment:', analysis.overallSentiment);
});
```

## API Endpoints

### Conversations
- `GET /api/conversations` - List active conversations
- `GET /api/conversations/:id` - Get conversation details
- `POST /api/conversations/:id/analyze` - Force analyze conversation
- `GET /api/conversations/:id/analysis` - Get conversation analysis

### System
- `GET /api/adapters` - Get platform adapter status
- `GET /api/stats` - Get processing statistics
- `GET /api/config` - Get configuration
- `PUT /api/config` - Update configuration

### Testing
- `POST /api/test/webhook` - Test webhook processing
- `POST /api/test/conversation` - Create test conversation

### Webhooks
- `POST /webhooks/twilio/voice` - Twilio voice webhook
- `POST /webhooks/twilio/sms` - Twilio SMS webhook
- `POST /webhooks/genesys/conversation` - Genesys conversation webhook

## Crisis Detection

The system automatically detects various crisis indicators:

### Suicide Risk
- Keywords: "suicide", "kill myself", "end it all", "not worth living"
- Patterns: "want to die", "life is not worth", "end it all"
- **Action**: Immediate intervention, emergency services contact

### Violence Threats
- Keywords: "hurt someone", "kill them", "weapon", "revenge"
- Patterns: "want to hurt", "going to kill", "make them pay"
- **Action**: Immediate intervention, law enforcement contact

### Domestic Violence
- Keywords: "hit me", "hurt me", "abusive", "scared of", "threatens me"
- Patterns: "he/she hits me", "scared of him/her"
- **Action**: Safety planning, legal advocacy

### Mental Health Crisis
- Keywords: "depressed", "anxiety", "panic", "hopeless", "overwhelmed"
- Patterns: "feel so depressed", "can't cope", "can't handle"
- **Action**: Mental health evaluation, crisis counseling

### Substance Abuse
- Keywords: "overdose", "too much", "can't stop", "addiction", "withdrawal"
- Patterns: "can't stop drinking/using", "took too much"
- **Action**: Medical evaluation, addiction counseling

## Real-time Events

The system emits real-time events via WebSocket:

```javascript
// Session events
socket.on('session:created', (session) => { /* New conversation started */ });
socket.on('session:ended', (session, result) => { /* Conversation ended */ });

// Message events
socket.on('message:received', (message) => { /* New message in conversation */ });

// Analysis events
socket.on('analysis:updated', (analysis) => { /* Analysis results updated */ });

// Alert events
socket.on('supervisor:alert', (alert) => { /* High-risk situation detected */ });
socket.on('call:escalate', (escalation) => { /* Call needs escalation */ });

// Case events
socket.on('case:updated', (caseInfo) => { /* Case created or updated */ });
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint
```

### Test Conversation Example

```bash
curl -X POST http://localhost:6000/api/test/conversation \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "websocket",
    "messages": [
      {
        "speaker": "caller",
        "content": "I feel really depressed and hopeless"
      },
      {
        "speaker": "caller", 
        "content": "I have been thinking about ending it all"
      }
    ]
  }'
```

## Monitoring and Health Checks

### Health Check Endpoint
```bash
curl http://localhost:6000/health
```

**Response:**
```json
{
  "healthy": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "conversation-analyzer",
  "version": "1.0.0",
  "adapters": {
    "twilio": { "healthy": true, "details": {...} },
    "genesys": { "healthy": true, "details": {...} },
    "websocket": { "healthy": true, "details": {...} }
  },
  "processing": {
    "queueSize": 2,
    "processedCount": 15
  },
  "uptime": 3600
}
```

### Processing Statistics
```bash
curl http://localhost:6000/api/stats
```

## Deployment

### Production Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Set production environment variables**

3. **Start with PM2:**
   ```bash
   pm2 start dist/index.js --name conversation-analyzer
   ```

### Docker Deployment

```bash
docker build -t conversation-analyzer .
docker run -d \
  --name conversation-analyzer \
  -p 6000:6000 \
  -p 6001:6001 \
  -e NODE_ENV=production \
  -e CASE_RECORD_API_URL=https://api.example.com \
  conversation-analyzer
```

## Security Considerations

- **API Key Authentication**: All API endpoints require valid API keys
- **Webhook Signature Validation**: Twilio and Genesys webhooks are validated
- **Rate Limiting**: Configurable rate limits for API and webhook endpoints
- **CORS Configuration**: Proper CORS setup for cross-origin requests
- **Input Validation**: All inputs are validated and sanitized

## Troubleshooting

### Common Issues

1. **Adapter Connection Failures**
   - Check API credentials
   - Verify network connectivity
   - Review webhook URLs

2. **Analysis Not Working**
   - Check sentiment analysis API connectivity
   - Verify case record API is running
   - Review processing configuration

3. **WebSocket Connection Issues**
   - Check firewall settings
   - Verify WebSocket port is open
   - Review CORS configuration

### Logs

Logs are written to:
- Console (development)
- File: `logs/conversation-analyzer.log`
- Error file: `logs/conversation-analyzer-error.log`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details
