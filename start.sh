#!/bin/bash

echo "🚀 Starting Agent Supervisor System..."

# Increase Node.js heap memory (can be overridden by pre-set NODE_OPTIONS)
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=8192}"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Received interrupt signal. Cleaning up..."
    echo "📦 Stopping Docker Compose containers..."
    docker compose down
    echo "✅ Cleanup completed!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Function to check if Elasticsearch is ready
check_elasticsearch() {
    echo "⏳ Checking if Elasticsearch is ready..."
    curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1
    return $?
}

# Start Elasticsearch with Docker Compose
echo "📦 Starting Elasticsearch with Docker Compose..."
docker compose up -d

# Wait for Elasticsearch to be ready
echo "⏳ Waiting for Elasticsearch to be ready..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if check_elasticsearch; then
        echo "✅ Elasticsearch is ready!"
        break
    else
        echo "⏳ Attempt $attempt/$max_attempts - Elasticsearch not ready yet, waiting 2 seconds..."
        sleep 2
        attempt=$((attempt + 1))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Elasticsearch failed to start within 60 seconds"
    echo "🔍 Checking Docker Compose logs..."
    docker compose logs elasticsearch
    exit 1
fi

# Verify Elasticsearch is running without security
echo "🔍 Verifying Elasticsearch configuration..."
health_response=$(curl -s http://localhost:9200/_cluster/health)
echo "📊 Elasticsearch health: $health_response"

# Build and run the main TypeScript application (skip if cache present)

echo "🔨 Building TypeScript application..."
yarn build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi


echo "🎯 Starting Agent Supervisor System..."
yarn start

# Cleanup after normal completion
echo "🏁 Agent Supervisor System completed!"
echo "📦 Stopping Docker Compose containers..."
docker compose down
echo "✅ Cleanup completed!"
