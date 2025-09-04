
#!/bin/bash

# Enhanced Trading Signal Generation Script
# Parameters: SUPABASE_URL, SUPABASE_ANON_KEY, DEBUG_MODE, GITHUB_RUN_ID

# Env validation
if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  echo "❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY"
  exit 1
fi

echo "🚀 Starting ADAPTIVE GitHub Actions signal generation..."
echo "🎯 ADAPTIVE SIGNAL GENERATION FEATURES:"
echo "  - Dynamic threshold system (LOW/MEDIUM/HIGH configurable)"
echo "  - Tier 1: ALL 27 pairs analyzed locally (FREE)"
echo "  - Tier 2/3: AI analysis based on threshold settings" 
echo "  - ATR-based target normalization for realistic signals"
echo "  - 90% cheaper OpenAI model (gpt-4o-mini for paid analysis)"
echo "  - Smart concurrency and optimized delays"
echo "  - 8-minute schedule (increased frequency for better coverage)"
echo "  - Quality-first approach with configurable selectivity"
echo "Workflow: $GITHUB_WORKFLOW"
echo "Run number: $GITHUB_RUN_NUMBER"
start_time=$(date +%s)

# Cost-optimized signal generation with reduced retry logic
max_retries=2
retry_count=0
success=false

while [ $retry_count -lt $max_retries ] && [ "$success" = false ]; do
  echo "🔄 Enhanced generation attempt $((retry_count + 1)) of $max_retries"
  
  curl_exit=0
  endpoint="$SUPABASE_URL/functions/v1/generate-signals"
  [ "${DEBUG_MODE:-false}" = "true" ] && echo "🔎 Endpoint: $endpoint"
  
  # Adaptive workload per attempt to stay under function time limits
  if [ $((retry_count + 1)) -eq 1 ]; then
    max_pairs=18
  else
    max_pairs=10
  fi
  [ "${DEBUG_MODE:-false}" = "true" ] && echo "🧮 maxAnalyzedPairs: $max_pairs"

  response=$(curl -sS -w "\n%{http_code}" --connect-timeout 10 --max-time 120 --retry 2 --retry-delay 2 --retry-all-errors -X POST \
    "$endpoint" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "X-GitHub-Run-ID: ${GITHUB_RUN_ID:-local}" \
    -H "X-Enhanced-Generation: true" \
    -d "{\"trigger\": \"github_actions\", \"run_id\": \"${GITHUB_RUN_ID:-local}\", \"attempt\": $((retry_count + 1)), \"optimized\": true, \"maxAnalyzedPairs\": $max_pairs, \"fullCoverage\": true}" ) || curl_exit=$?
  
  # Extract HTTP status code and response
  http_code=$(echo "$response" | tail -n1)
  response_body=$(echo "$response" | head -n -1)
  
  if [ -z "$http_code" ] || [ "$http_code" = "000" ]; then
    echo "⚠️ Network error calling Supabase (curl exit $curl_exit)."
    http_code="000"
  fi
  
  echo "HTTP Status: $http_code"
  if [ "${DEBUG_MODE:-false}" = "true" ]; then
    echo "Response body: $response_body"
  fi
  
  if [ "$http_code" -eq 200 ]; then
    success=true
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    echo "✅ ENHANCED signal generation successful in ${duration}s"
    
    # Extract enhanced metrics from response
    signals_count=$(echo "$response_body" | jq -r '.stats.signalsGenerated // 0' 2>/dev/null || echo "0")
    execution_time=$(echo "$response_body" | jq -r '.stats.executionTime // "unknown"' 2>/dev/null || echo "unknown")
    concurrent_limit=$(echo "$response_body" | jq -r '.stats.concurrentLimit // 3' 2>/dev/null || echo "3")
    max_per_run=$(echo "$response_body" | jq -r '.stats.maxNewSignalsPerRun // 8' 2>/dev/null || echo "8")
    
    # Extract additional threshold metrics
    threshold_level=$(echo "$response_body" | jq -r '.stats.thresholdLevel // "HIGH"' 2>/dev/null || echo "HIGH")
    threshold_desc=$(echo "$response_body" | jq -r '.stats.thresholdConfig.description // "Premium quality, fewer signals"' 2>/dev/null || echo "Premium quality, fewer signals")
    
    echo "📊 ADAPTIVE GENERATION METRICS:"
    echo "  - Threshold Level: $threshold_level ($threshold_desc)"
    echo "  - Signals generated: $signals_count"
    echo "  - Function execution time: $execution_time"
    echo "  - Concurrent processing limit: $concurrent_limit"
    echo "  - Max signals per run: $max_per_run"
    echo "  - Total workflow time: ${duration}s"
  else
    retry_count=$((retry_count + 1))
    if [ $retry_count -lt $max_retries ]; then
      echo "⚠️ Enhanced generation attempt failed (status $http_code), retrying in 10 seconds..."
      echo "Response: $response_body"
      sleep 10
    else
      echo "❌ All enhanced generation attempts failed. Final status: $http_code"
      echo "Response: $response_body"
      
      # Check for specific timeout error
      if [ "$http_code" -eq 504 ] || echo "$response_body" | grep -q "timeout"; then
        echo "🔧 TIMEOUT DETECTED: Adaptive generation should have prevented this."
        echo "This may indicate a temporary issue. The next run should succeed with enhanced coverage."
      fi
      
      exit 1
    fi
  fi
done
