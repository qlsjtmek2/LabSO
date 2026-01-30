#!/bin/bash

#
# Riot API Key Validator
#
# Validates Riot API key by making test requests and checking rate limits.
#
# Usage:
#   ./validate-api-key.sh [API_KEY]
#
# If API_KEY not provided, reads from RIOT_API_KEY environment variable.
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Key
API_KEY="${1:-$RIOT_API_KEY}"

if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: No API key provided${NC}"
    echo "Usage: $0 [API_KEY]"
    echo "Or set RIOT_API_KEY environment variable"
    exit 1
fi

echo -e "${BLUE}=== Riot API Key Validator ===${NC}\n"

# Test 1: Check key format
echo -e "${YELLOW}[1/5] Checking API key format...${NC}"
if [ ${#API_KEY} -lt 20 ]; then
    echo -e "${RED}✗ API key seems too short (${#API_KEY} characters)${NC}"
    exit 1
else
    echo -e "${GREEN}✓ API key format OK (${#API_KEY} characters)${NC}\n"
fi

# Test 2: Verify key with DataDragon (no auth needed)
echo -e "${YELLOW}[2/5] Testing DataDragon access...${NC}"
DDRAGON_URL="https://ddragon.leagueoflegends.com/api/versions.json"
DDRAGON_RESPONSE=$(curl -s "$DDRAGON_URL")

if [ -z "$DDRAGON_RESPONSE" ]; then
    echo -e "${RED}✗ Failed to access DataDragon${NC}"
    exit 1
else
    VERSION=$(echo "$DDRAGON_RESPONSE" | grep -o '"[0-9]\+\.[0-9]\+\.[0-9]\+"' | head -1 | tr -d '"')
    echo -e "${GREEN}✓ DataDragon accessible (latest version: $VERSION)${NC}\n"
fi

# Test 3: Test API key with Summoner endpoint
echo -e "${YELLOW}[3/5] Testing API key validity...${NC}"
TEST_URL="https://kr.api.riotgames.com/lol/platform/v3/champion-rotations"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Riot-Token: $API_KEY" "$TEST_URL")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ API key is valid${NC}\n"
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${RED}✗ API key is invalid (401 Unauthorized)${NC}"
    exit 1
elif [ "$HTTP_CODE" = "403" ]; then
    echo -e "${RED}✗ API key is forbidden/blacklisted (403 Forbidden)${NC}"
    exit 1
elif [ "$HTTP_CODE" = "429" ]; then
    echo -e "${YELLOW}⚠ Rate limit hit (429) - key is valid but rate limited${NC}\n"
else
    echo -e "${YELLOW}⚠ Unexpected response: $HTTP_CODE${NC}\n"
fi

# Test 4: Check rate limit headers
echo -e "${YELLOW}[4/5] Checking rate limit headers...${NC}"
RESPONSE_HEADERS=$(curl -s -D - -H "X-Riot-Token: $API_KEY" "$TEST_URL" | grep -i "X-.*Rate-Limit")

if [ -z "$RESPONSE_HEADERS" ]; then
    echo -e "${YELLOW}⚠ No rate limit headers found${NC}\n"
else
    echo -e "${GREEN}Rate limit info:${NC}"
    echo "$RESPONSE_HEADERS" | while IFS= read -r line; do
        echo "  $line"
    done
    echo ""

    # Parse and display limits
    APP_LIMIT=$(echo "$RESPONSE_HEADERS" | grep "X-App-Rate-Limit:" | cut -d':' -f2- | tr -d '\r')
    APP_COUNT=$(echo "$RESPONSE_HEADERS" | grep "X-App-Rate-Limit-Count:" | cut -d':' -f2- | tr -d '\r')

    if [ -n "$APP_LIMIT" ] && [ -n "$APP_COUNT" ]; then
        # Extract 1-second limit
        LIMIT_1S=$(echo "$APP_LIMIT" | cut -d',' -f1 | cut -d':' -f1 | tr -d ' ')
        COUNT_1S=$(echo "$APP_COUNT" | cut -d',' -f1 | cut -d':' -f1 | tr -d ' ')

        # Extract 2-minute limit
        LIMIT_2M=$(echo "$APP_LIMIT" | cut -d',' -f2 | cut -d':' -f1 | tr -d ' ')
        COUNT_2M=$(echo "$APP_COUNT" | cut -d',' -f2 | cut -d':' -f1 | tr -d ' ')

        echo -e "${BLUE}Current usage:${NC}"
        echo -e "  1-second window: ${COUNT_1S}/${LIMIT_1S} requests"
        echo -e "  2-minute window: ${COUNT_2M}/${LIMIT_2M} requests"

        # Calculate percentages
        if [ "$LIMIT_1S" -gt 0 ] 2>/dev/null; then
            PERCENT_1S=$((COUNT_1S * 100 / LIMIT_1S))
            if [ "$PERCENT_1S" -gt 80 ]; then
                echo -e "  ${RED}⚠ Warning: Using ${PERCENT_1S}% of 1-second limit${NC}"
            fi
        fi

        echo ""
    fi
fi

# Test 5: Determine key type (development vs production)
echo -e "${YELLOW}[5/5] Determining API key type...${NC}"

if [ -n "$LIMIT_1S" ]; then
    if [ "$LIMIT_1S" -eq 20 ] && [ "$LIMIT_2M" -eq 100 ]; then
        echo -e "${BLUE}→ Development API Key detected${NC}"
        echo -e "  Limits: 20 req/sec, 100 req/2min"
        echo -e "  ${YELLOW}Note: Development keys expire after 24 hours${NC}"
    elif [ "$LIMIT_1S" -ge 300 ]; then
        echo -e "${GREEN}→ Production API Key detected${NC}"
        echo -e "  Limits: ${LIMIT_1S} req/sec, ${LIMIT_2M} req/2min"
    else
        echo -e "${BLUE}→ Custom API Key${NC}"
        echo -e "  Limits: ${LIMIT_1S} req/sec, ${LIMIT_2M} req/2min"
    fi
else
    echo -e "${YELLOW}⚠ Could not determine key type${NC}"
fi

echo ""

# Summary
echo -e "${GREEN}=== Validation Complete ===${NC}"
echo -e "${GREEN}✓ API key is valid and working${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Add API key to .env.local:"
echo "   RIOT_API_KEY=$API_KEY"
echo ""
echo "2. Test with your application:"
echo "   npm run dev"
echo ""
echo "3. Monitor rate limits in production"
echo ""

exit 0
