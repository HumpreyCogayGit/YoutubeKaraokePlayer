#!/bin/bash

# Database Deployment Script (Bash version)
# This script deploys the complete database schema to your PostgreSQL database
# It will DROP all existing tables and recreate them - USE WITH CAUTION!

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Database Deployment Script${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    # Try to load from .env file
    if [ -f "server/.env" ]; then
        echo -e "${YELLOW}Loading environment from server/.env...${NC}"
        export $(cat server/.env | grep DATABASE_URL | xargs)
    fi
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL not found!${NC}"
    echo -e "${YELLOW}Please set the DATABASE_URL environment variable.${NC}"
    echo ""
    echo -e "${YELLOW}Example:${NC}"
    echo "  export DATABASE_URL='postgresql://user:pass@host:5432/dbname'"
    echo "  ./deploy-db.sh"
    echo "  or set in server/.env file"
    exit 1
fi

# Mask password in output
MASKED_URL=$(echo "$DATABASE_URL" | sed -E 's|://([^:]+):([^@]+)@|://\1:****@|')
echo -e "${YELLOW}Target Database: $MASKED_URL${NC}"
echo ""

# Warning
echo -e "${RED}⚠️  WARNING: This will DROP ALL EXISTING TABLES!${NC}"
echo -e "${RED}⚠️  ALL DATA WILL BE LOST!${NC}"
echo ""

read -p "Are you sure you want to continue? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}Deploying schema...${NC}"

# Run the schema file
SCHEMA_PATH="server/src/schema-complete.sql"

if [ ! -f "$SCHEMA_PATH" ]; then
    echo -e "${RED}ERROR: Schema file not found at $SCHEMA_PATH${NC}"
    exit 1
fi

echo -e "${CYAN}Executing SQL from $SCHEMA_PATH...${NC}"

# Execute with psql
if psql "$DATABASE_URL" -f "$SCHEMA_PATH"; then
    echo ""
    echo -e "${GREEN}✓ Database schema deployed successfully!${NC}"
    echo ""
    echo -e "${CYAN}Verifying tables...${NC}"
    
    # Verify tables exist
    psql "$DATABASE_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
    
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  Deployment Complete!${NC}"
    echo -e "${GREEN}============================================${NC}"
else
    echo ""
    echo -e "${RED}✗ Database deployment failed!${NC}"
    echo -e "${YELLOW}Check the error messages above.${NC}"
    exit 1
fi
