#!/bin/bash
# Vercel Deployment Script for Gabon COD Platform

set -e

echo "=========================================="
echo "Gabon COD Platform - Vercel Deployment"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Check if user is logged in
echo -e "${YELLOW}Checking Vercel login status...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}Please login to Vercel:${NC}"
    vercel login
fi

# Pull environment variables
echo -e "${YELLOW}Pulling environment variables...${NC}"
vercel env pull .env.local

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

# Deploy to Vercel
echo -e "${YELLOW}Deploying to Vercel...${NC}"
vercel --prod

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}Check your app at the URL above${NC}"
