#!/bin/bash

echo "🚀 Setting up Sentiment Analysis Performance Analyzer..."

# Create directories
mkdir -p server client scripts

# Setup server
echo "📦 Setting up server..."
cd server
npm init -y
npm install express cors helmet morgan compression dotenv
npm install mongoose jsonwebtoken bcryptjs
npm install swagger-jsdoc swagger-ui-express
npm install @types/node @types/express @types/cors @types/morgan typescript ts-node nodemon --save-dev
npm install jest @types/jest supertest @types/supertest --save-dev

# Setup client
echo "📦 Setting up client..."
cd ../client
npx create-react-app . --template typescript
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material @mui/x-charts @mui/x-data-grid
npm install axios react-router-dom @types/react-router-dom
npm install recharts date-fns

# Setup scripts
echo "📦 Setting up utility scripts..."
cd ../scripts
npm install

cd ..

echo "✅ Setup complete!"
echo ""
echo "🚀 Quick Start:"
echo "1. Copy server/.env.example to server/.env and configure MongoDB URI"
echo "2. Run 'npm run dev' to start the development servers"
echo "3. Run 'cd scripts && npm run generate-data' to create sample data"
echo ""
echo "📊 Access Points:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:5001"
echo "- API Docs: http://localhost:5001/api-docs"
