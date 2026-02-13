#!/usr/bin/env bash
# AWS infrastructure setup: Lightsail instance + CloudFront distribution
# Prerequisites: aws configure (with eu-west-2 region)
# Usage: bash deploy/aws-setup.sh
set -euo pipefail

INSTANCE_NAME="thisisme-prod"
REGION="eu-west-2"
DOMAIN="api.hellohelloapp.co"
BUNDLE_ID="medium_3_0"       # 2 GB RAM, 2 vCPU, $20/mo
BLUEPRINT_ID="amazon_linux_2023"

echo "=== ThisIsMe AWS Infrastructure Setup ==="
echo ""

# ─────────────────────────────────────────────
# Step 1: Create Lightsail instance
# ─────────────────────────────────────────────
echo "--- Step 1: Lightsail Instance ---"

if aws lightsail get-instance --instance-name "$INSTANCE_NAME" --region "$REGION" &>/dev/null; then
  echo "Instance '$INSTANCE_NAME' already exists, skipping creation."
else
  echo "Creating Lightsail instance '$INSTANCE_NAME' in $REGION..."
  aws lightsail create-instances \
    --instance-names "$INSTANCE_NAME" \
    --availability-zone "${REGION}a" \
    --blueprint-id "$BLUEPRINT_ID" \
    --bundle-id "$BUNDLE_ID" \
    --region "$REGION"

  echo "Waiting for instance to be running..."
  for i in $(seq 1 30); do
    STATE=$(aws lightsail get-instance --instance-name "$INSTANCE_NAME" --region "$REGION" \
      --query 'instance.state.name' --output text 2>/dev/null || echo "pending")
    if [ "$STATE" = "running" ]; then
      echo "Instance is running."
      break
    fi
    echo "  Status: $STATE (attempt $i/30)..."
    sleep 10
  done
fi

# Allocate and attach a static IP (gives us a DNS name for CloudFront)
STATIC_IP_NAME="${INSTANCE_NAME}-ip"
if aws lightsail get-static-ip --static-ip-name "$STATIC_IP_NAME" --region "$REGION" &>/dev/null; then
  echo "Static IP '$STATIC_IP_NAME' already exists."
else
  echo "Allocating static IP..."
  aws lightsail allocate-static-ip --static-ip-name "$STATIC_IP_NAME" --region "$REGION"
  echo "Attaching static IP to instance..."
  aws lightsail attach-static-ip \
    --static-ip-name "$STATIC_IP_NAME" \
    --instance-name "$INSTANCE_NAME" \
    --region "$REGION"
fi

PUBLIC_IP=$(aws lightsail get-static-ip --static-ip-name "$STATIC_IP_NAME" --region "$REGION" \
  --query 'staticIp.ipAddress' --output text)
echo "Public IP: $PUBLIC_IP"

# Derive the EC2-style DNS name that CloudFront requires (no bare IPs allowed)
ORIGIN_DOMAIN="ec2-$(echo "$PUBLIC_IP" | tr '.' '-').${REGION}.compute.amazonaws.com"
echo "Origin domain: $ORIGIN_DOMAIN"

# Open port 8080
echo "Opening port 8080..."
aws lightsail open-instance-public-ports \
  --instance-name "$INSTANCE_NAME" \
  --region "$REGION" \
  --port-info fromPort=8080,toPort=8080,protocol=tcp 2>/dev/null || true

echo ""

# ─────────────────────────────────────────────
# Step 2: ACM certificate (must be us-east-1 for CloudFront)
# ─────────────────────────────────────────────
echo "--- Step 2: ACM Certificate ---"

# Check for existing cert
EXISTING_CERT=$(aws acm list-certificates --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn" --output text)

if [ -n "$EXISTING_CERT" ] && [ "$EXISTING_CERT" != "None" ]; then
  CERT_ARN="$EXISTING_CERT"
  echo "Certificate already exists: $CERT_ARN"
else
  echo "Requesting ACM certificate for $DOMAIN in us-east-1..."
  CERT_ARN=$(aws acm request-certificate \
    --domain-name "$DOMAIN" \
    --validation-method DNS \
    --region us-east-1 \
    --query 'CertificateArn' --output text)
  echo "Certificate ARN: $CERT_ARN"
fi

# Get DNS validation record
echo "Fetching DNS validation record..."
sleep 5  # ACM needs a moment to generate the validation record
VALIDATION=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord')

VALIDATION_NAME=$(echo "$VALIDATION" | python3 -c "import sys,json; print(json.load(sys.stdin)['Name'])")
VALIDATION_VALUE=$(echo "$VALIDATION" | python3 -c "import sys,json; print(json.load(sys.stdin)['Value'])")

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ADD THIS DNS RECORD TO VALIDATE THE CERTIFICATE:          ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "  Type:  CNAME"
echo "  Name:  $VALIDATION_NAME"
echo "  Value: $VALIDATION_VALUE"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check cert status
CERT_STATUS=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1 \
  --query 'Certificate.Status' --output text)

if [ "$CERT_STATUS" != "ISSUED" ]; then
  echo "Certificate status: $CERT_STATUS"
  echo "Waiting for certificate validation... (add the DNS record above, then wait)"
  echo "Press Ctrl+C to skip waiting — you can re-run this script later."
  echo ""
  for i in $(seq 1 60); do
    CERT_STATUS=$(aws acm describe-certificate \
      --certificate-arn "$CERT_ARN" \
      --region us-east-1 \
      --query 'Certificate.Status' --output text)
    if [ "$CERT_STATUS" = "ISSUED" ]; then
      echo "Certificate issued!"
      break
    fi
    echo "  Still waiting... ($i/60, status: $CERT_STATUS)"
    sleep 30
  done

  if [ "$CERT_STATUS" != "ISSUED" ]; then
    echo "Certificate not yet validated. Add the DNS record and re-run this script."
    echo "Saving progress — CloudFront will be created on the next run."
    echo ""
    echo "CERT_ARN=$CERT_ARN" > /tmp/thisisme-aws-setup-state.txt
    echo "PUBLIC_IP=$PUBLIC_IP" >> /tmp/thisisme-aws-setup-state.txt
    exit 0
  fi
fi

echo ""

# ─────────────────────────────────────────────
# Step 3: CloudFront distribution
# ─────────────────────────────────────────────
echo "--- Step 3: CloudFront Distribution ---"

# Check for existing distribution
EXISTING_DIST=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items[0]=='$DOMAIN'].Id" --output text 2>/dev/null)

if [ -n "$EXISTING_DIST" ] && [ "$EXISTING_DIST" != "None" ]; then
  echo "CloudFront distribution already exists: $EXISTING_DIST"
  CF_DOMAIN=$(aws cloudfront get-distribution --id "$EXISTING_DIST" \
    --query 'Distribution.DomainName' --output text)
else
  echo "Creating CloudFront distribution..."

  # Create distribution config
  DIST_CONFIG=$(cat <<JSONEOF
{
  "CallerReference": "thisisme-$(date +%s)",
  "Aliases": {
    "Quantity": 1,
    "Items": ["$DOMAIN"]
  },
  "DefaultRootObject": "",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "lightsail-origin",
        "DomainName": "$ORIGIN_DOMAIN",
        "CustomOriginConfig": {
          "HTTPPort": 8080,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          },
          "OriginReadTimeout": 60,
          "OriginKeepaliveTimeout": 5
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "lightsail-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "OriginRequestPolicyId": "216adef6-5c7f-47e4-b989-5492eafa07d3",
    "Compress": true
  },
  "Comment": "ThisIsMe API - api.hellohelloapp.co",
  "Enabled": true,
  "ViewerCertificate": {
    "ACMCertificateArn": "$CERT_ARN",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "HttpVersion": "http2"
}
JSONEOF
)

  DIST_RESULT=$(echo "$DIST_CONFIG" | aws cloudfront create-distribution \
    --distribution-config file:///dev/stdin)

  DIST_ID=$(echo "$DIST_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['Distribution']['Id'])")
  CF_DOMAIN=$(echo "$DIST_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['Distribution']['DomainName'])")
  echo "Distribution created: $DIST_ID"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  INFRASTRUCTURE READY — ADD THESE DNS RECORDS:             ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                            ║"
echo "║  API endpoint:                                             ║"
echo "  Type:  CNAME"
echo "  Name:  api.hellohelloapp.co"
echo "  Value: $CF_DOMAIN"
echo "║                                                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "=== Summary ==="
echo "Lightsail IP:        $PUBLIC_IP"
echo "CloudFront domain:   $CF_DOMAIN"
echo "Certificate ARN:     $CERT_ARN"
echo ""
echo "=== Next Steps ==="
echo "1. Add the DNS CNAME record above"
echo "2. SSH to $PUBLIC_IP and run setup.sh + deploy.sh"
echo "3. Deploy frontend to Vercel: cd ui && vercel --prod"
echo "4. Add Vercel domain as CNAME for hellohelloapp.co"
