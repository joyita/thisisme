#!/usr/bin/env bash
# Deploy / redeploy the application
# Usage: bash deploy/deploy.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

echo "=== ThisIsMe Deploy ==="

# Check env file exists
if [ ! -f deploy/.env.prod ]; then
  echo "ERROR: deploy/.env.prod not found."
  echo "Copy deploy/.env.prod.example to deploy/.env.prod and fill in your secrets."
  exit 1
fi

# Detect docker compose command (v2 plugin vs v1 standalone)
if docker compose version &>/dev/null; then
  DC="docker compose"
elif command -v docker-compose &>/dev/null; then
  DC="docker-compose"
else
  echo "ERROR: Neither 'docker compose' nor 'docker-compose' found."
  echo "Run deploy/setup.sh first to install Docker Compose."
  exit 1
fi

# Pull latest code
echo "Pulling latest code..."
git pull

# Build and restart
echo "Building and starting services..."
$DC -f docker-compose.prod.yml build --no-cache server
$DC -f docker-compose.prod.yml up -d

# Wait for health
echo "Waiting for server to be healthy..."
for i in $(seq 1 30); do
  if $DC -f docker-compose.prod.yml exec -T server wget -qO- http://localhost:8080/actuator/health 2>/dev/null | grep -q '"status":"UP"'; then
    echo "Server is healthy!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "WARNING: Server did not become healthy within 5 minutes."
    echo "Check logs: $DC -f docker-compose.prod.yml logs server"
    exit 1
  fi
  sleep 10
done

echo ""
echo "=== Deploy complete ==="
echo "Services:"
$DC -f docker-compose.prod.yml ps
