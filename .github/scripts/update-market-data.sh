
#!/bin/bash

# Market Data Update Script
# Parameters: SUPABASE_URL, SUPABASE_ANON_KEY, DEBUG_MODE, GITHUB_RUN_ID

echo "📊 Updating centralized market data..."

response=$(curl -s -w "\n%{http_code}" -X POST \
  "$SUPABASE_URL/functions/v1/centralized-market-stream" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "X-GitHub-Run-ID: $GITHUB_RUN_ID")

http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | head -n -1)

echo "HTTP Status: $http_code"

if [ "$http_code" -eq 200 ]; then
  echo "✅ Market data update successful"
  # Extract market pairs count if available
  pairs_count=$(echo "$response_body" | jq -r '.pairsUpdated // "unknown"' 2>/dev/null || echo "unknown")
  echo "📈 Market pairs updated: $pairs_count"
else
  echo "⚠️ Market data update failed with status $http_code (continuing...)"
  if [ "$DEBUG_MODE" = "true" ]; then
    echo "Response: $response_body"
  fi
fi
