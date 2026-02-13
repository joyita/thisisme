#!/usr/bin/env bash
# First-time setup for a fresh Lightsail instance (Amazon Linux 2023)
# Usage: scp this to the instance, then run: bash setup.sh
set -euo pipefail

echo "=== ThisIsMe Production Setup ==="

# Install Docker
echo "Installing Docker..."
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker "$USER"

# Install Docker Compose plugin
echo "Installing Docker Compose..."
sudo mkdir -p /usr/local/lib/docker/cli-plugins
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
sudo curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Clone repo
if [ ! -d "/home/$USER/thisisme" ]; then
  echo "Cloning repository..."
  git clone https://github.com/YOUR_ORG/thisisme.git "/home/$USER/thisisme"
else
  echo "Repository already exists, pulling latest..."
  cd "/home/$USER/thisisme" && git pull
fi

cd "/home/$USER/thisisme"

# Prompt for env file
if [ ! -f deploy/.env.prod ]; then
  echo ""
  echo "=== IMPORTANT ==="
  echo "Copy deploy/.env.prod.example to deploy/.env.prod and fill in your secrets:"
  echo "  cp deploy/.env.prod.example deploy/.env.prod"
  echo "  nano deploy/.env.prod"
  echo ""
  echo "Then run: bash deploy/deploy.sh"
else
  echo "deploy/.env.prod already exists."
  echo "Run: bash deploy/deploy.sh"
fi

echo ""
echo "=== Setup complete ==="
echo "Log out and back in for Docker group membership to take effect,"
echo "or run: newgrp docker"
