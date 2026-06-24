#!/bin/bash
set -e

echo "Pulling latest changes..."
git pull origin main

echo "Building and restarting containers..."
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

echo "Running migrations..."
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy

echo "Deploy successful!"

# run:
# chmod +x deploy.sh
# ./deploy.sh