
#!/bin/bash

# Market Data Update Script
# Parameters: SUPABASE_URL, SUPABASE_ANON_KEY, DEBUG_MODE, GITHUB_RUN_ID

# Safety and env checks
if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  echo "❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY" 
  exit 1
fi

echo "📊 Updating centralized market data..."
endpoint="$SUPABASE_URL/functions/v1/centralized-market-stream"
[ "${DEBUG_MODE:-false}" = "true" ] && echo "🔎 Endpoint: $endpoint"

# Perform request with timeouts and retries
curl_exit=0
response=$(curl -sS -w "\n%{http_code}" --connect-timeout 10 --max-time 40 --retry 2 --retry-delay 2 --retry-all-errors -X POST \
  "$endpoint" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "X-GitHub-Run-ID: ${GITHUB_RUN_ID:-local}" \
  -d '{}' ) || curl_exit=$?

http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | head -n -1)

if [ -z "$http_code" ] || [ "$http_code" = "000" ]; then
  echo "⚠️ Network error calling Supabase (curl exit $curl_exit)."
  http_code="000"
fi

echo "HTTP Status: $http_code"

if [ "$http_code" -eq 200 ]; then
  echo "✅ Market data update successful"
  # Extract market pairs count if available
  pairs_count=$(echo "$response_body" | jq -r '.pairsUpdated // "unknown"' 2>/dev/null || echo "unknown")
  echo "📈 Market pairs updated: $pairs_count"
else
  echo "⚠️ Market data update failed with status $http_code (continuing...)"
  if [ "${DEBUG_MODE:-false}" = "true" ]; then
    echo "Response: $response_body"
  fi
fi