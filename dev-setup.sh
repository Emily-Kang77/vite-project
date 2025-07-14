#!/bin/bash

echo "🚀 Setting up development environment..."

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker-compose down -v

# Rebuild backend with latest changes
echo "🔨 Rebuilding backend..."
docker-compose build --no-cache backend

# Start everything up
echo "🚀 Starting all services..."
docker-compose up -d

# Wait a moment for services to start
echo "⏳ Waiting for services to initialize..."
sleep 10

# Show logs
echo "📋 Showing backend logs..."
docker-compose logs -f backend 