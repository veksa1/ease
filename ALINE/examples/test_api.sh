#!/bin/bash
# Example API calls for ALINE service

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8000"

echo -e "${BLUE}ALINE API Examples${NC}\n"

# 1. Health check
echo -e "${GREEN}1. Health Check${NC}"
curl -s -X GET "${BASE_URL}/health" | python3 -m json.tool
echo -e "\n"

# 2. Daily risk prediction
echo -e "${GREEN}2. Daily Risk Prediction${NC}"
curl -s -X POST "${BASE_URL}/risk/daily" \
  -H "Content-Type: application/json" \
  -d @examples/requests/daily_risk.json | python3 -m json.tool
echo -e "\n"

# 3. Policy recommendations
echo -e "${GREEN}3. Policy Recommendations (Top-K Hours)${NC}"
curl -s -X POST "${BASE_URL}/policy/topk" \
  -H "Content-Type: application/json" \
  -d @examples/requests/policy_topk.json | python3 -m json.tool
echo -e "\n"

echo -e "${BLUE}Done!${NC}"
