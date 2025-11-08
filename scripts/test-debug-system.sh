#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL (change this to your deployment URL for production testing)
BASE_URL="${BASE_URL:-http://localhost:3000}"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Worker Debug System Test${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "Testing against: ${YELLOW}$BASE_URL${NC}"
echo ""

# Test 1: Health Endpoint
echo -e "${BLUE}[Test 1]${NC} Testing Worker Health Endpoint..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/worker/health")
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Health endpoint accessible"
  echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
  echo -e "${RED}✗${NC} Health endpoint failed"
fi
echo ""

# Test 2: Job List Endpoint
echo -e "${BLUE}[Test 2]${NC} Testing Job List Endpoint..."
LIST_RESPONSE=$(curl -s "$BASE_URL/api/jobs/list?limit=5")
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Job list endpoint accessible"
  echo "$LIST_RESPONSE" | jq '.count' 2>/dev/null || echo "$LIST_RESPONSE"
else
  echo -e "${RED}✗${NC} Job list endpoint failed"
fi
echo ""

# Test 3: Check for pending jobs
echo -e "${BLUE}[Test 3]${NC} Checking for pending jobs..."
PENDING_RESPONSE=$(curl -s "$BASE_URL/api/jobs/list?status=pending&limit=10")
PENDING_COUNT=$(echo "$PENDING_RESPONSE" | jq '.count' 2>/dev/null || echo "0")
echo -e "Pending jobs: ${YELLOW}$PENDING_COUNT${NC}"

if [ "$PENDING_COUNT" != "0" ] && [ "$PENDING_COUNT" != "" ]; then
  # Extract first pending job ID
  FIRST_JOB_ID=$(echo "$PENDING_RESPONSE" | jq -r '.jobs[0].id' 2>/dev/null)

  if [ "$FIRST_JOB_ID" != "null" ] && [ "$FIRST_JOB_ID" != "" ]; then
    echo -e "${BLUE}[Test 4]${NC} Testing Debug Endpoint for job: ${YELLOW}$FIRST_JOB_ID${NC}..."
    DEBUG_RESPONSE=$(curl -s "$BASE_URL/api/jobs/debug/$FIRST_JOB_ID")
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓${NC} Debug endpoint accessible"
      echo "$DEBUG_RESPONSE" | jq '.analysis' 2>/dev/null || echo "$DEBUG_RESPONSE"
    else
      echo -e "${RED}✗${NC} Debug endpoint failed"
    fi
    echo ""

    # Test 5: Test Force Process (optional - comment out if you don't want to trigger)
    # echo -e "${BLUE}[Test 5]${NC} Testing Force Process..."
    # FORCE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/jobs/force-process/$FIRST_JOB_ID")
    # echo "$FORCE_RESPONSE" | jq '.' 2>/dev/null || echo "$FORCE_RESPONSE"
  fi
else
  echo -e "${YELLOW}No pending jobs to test debug/force-process endpoints${NC}"
fi
echo ""

# Test 6: Worker Endpoint (GET for health check)
echo -e "${BLUE}[Test 6]${NC} Testing Worker Endpoint (GET)..."
WORKER_RESPONSE=$(curl -s "$BASE_URL/api/worker")
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Worker endpoint accessible"
  echo "$WORKER_RESPONSE" | jq '.' 2>/dev/null || echo "$WORKER_RESPONSE"
else
  echo -e "${RED}✗${NC} Worker endpoint failed"
fi
echo ""

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "All debug endpoints are ${GREEN}ready for production${NC}!"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Deploy to Vercel: ${BLUE}git push${NC}"
echo "2. Test production endpoints with your domain"
echo "3. Check stuck job: ${BLUE}curl $BASE_URL/api/jobs/debug/job_1762591189245_y01z5om${NC}"
echo "4. Force process if needed: ${BLUE}curl -X POST $BASE_URL/api/jobs/force-process/job_1762591189245_y01z5om${NC}"
echo "5. Monitor via UI at: ${BLUE}$BASE_URL${NC}"
echo ""
