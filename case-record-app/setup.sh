#!/bin/bash

# Case Record Management System Setup Script

echo "🚀 Setting up Case Record Management System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. Some features may not work."
fi

# Create environment files
echo "📝 Creating environment files..."

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
else
    echo "ℹ️  .env file already exists"
fi

if [ ! -f server/.env ]; then
    cp server/.env.example server/.env
    echo "✅ Created server/.env file from template"
else
    echo "ℹ️  server/.env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."

# Install root dependencies
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

echo "✅ All dependencies installed successfully!"

# Build server
echo "🔨 Building server..."
cd server
npm run build
cd ..

echo "✅ Server built successfully!"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p backups

echo "✅ Directories created!"

# Set up database (if MongoDB is running locally)
echo "🗄️  Setting up database..."
if command -v mongosh &> /dev/null; then
    echo "Setting up MongoDB indexes..."
    mongosh case-record-db --eval "
        db.caserecords.createIndex({ 'caseNumber': 1 }, { unique: true });
        db.caserecords.createIndex({ 'crisisType': 1 });
        db.caserecords.createIndex({ 'status': 1 });
        db.caserecords.createIndex({ 'priority': 1 });
        db.caserecords.createIndex({ 'assessment.riskLevel': 1 });
        db.caserecords.createIndex({ 'createdAt': -1 });
        db.caserecords.createIndex({ 'updatedAt': -1 });
        print('Database indexes created successfully');
    "
    echo "✅ Database indexes created!"
else
    echo "ℹ️  MongoDB shell not found. Database setup skipped."
fi

# Make scripts executable
chmod +x scripts/*.sh 2>/dev/null || true

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update the .env files with your configuration"
echo "2. Start MongoDB (if not using Docker)"
echo "3. Run the application:"
echo ""
echo "   Using npm:"
echo "   npm run dev"
echo ""
echo "   Using Docker:"
echo "   docker-compose up"
echo ""
echo "📚 Documentation:"
echo "   - API Documentation: http://localhost:5000/api-docs"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:5000"
echo ""
echo "🔧 Development commands:"
echo "   npm run dev          - Start both client and server"
echo "   npm run test         - Run all tests"
echo "   npm run build        - Build for production"
echo ""
echo "Happy coding! 🚀"
