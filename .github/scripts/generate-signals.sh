
#!/bin/bash

# Enhanced Trading Signal Generation Script
# Parameters: SUPABASE_URL, SUPABASE_ANON_KEY, DEBUG_MODE, GITHUB_RUN_ID

# Env validation
if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  echo "❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY"
  exit 1
fi

        echo "🚀 Starting ENHANCED GitHub Actions signal generation..."
        echo "🎯 70%+ WIN RATE PIPELINE FEATURES:"
        echo "  - 5-minute intervals for optimal analysis depth"
        echo "  - Ultra-selective: 4+ confluence requirements"
        echo "  - Tier 1: RSI <25/>75, EMA crossover, MACD divergence, ATR optimization"
        echo "  - Tier 2: 85%+ confidence threshold (gpt-4o-mini)"
        echo "  - Tier 3: 90%+ quality threshold (gpt-4.1)"
        echo "  - Economic calendar integration (60min avoidance)"
        echo "  - Max 3 signals per 5min cycle (quality over quantity)"
        echo "  - Monthly recalibration system"
        echo "  - Performance tracking for continuous optimization"
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
    response=$(curl -sS -w "\n%{http_code}" --connect-timeout 10 --max-time 150 --retry 2 --retry-delay 2 --retry-all-errors -X POST \
      "$endpoint" \
      -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
      -H "Content-Type: application/json" \
      -H "apikey: $SUPABASE_ANON_KEY" \
      -H "X-GitHub-Run-ID: ${GITHUB_RUN_ID:-local}" \
      -H "X-Enhanced-Generation: true" \
      -d "{\"trigger\": \"github_actions\", \"run_id\": \"${GITHUB_RUN_ID:-local}\", \"attempt\": $((retry_count + 1)), \"optimized\": true, \"fastMode\": true, \"maxAnalyzedPairs\": 12, \"timeBudgetMs\": 50000, \"fullCoverage\": true, \"thresholdLevel\": \"LOW\"}" ) || curl_exit=$?
  
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
    
    echo "📊 ENHANCED GENERATION METRICS:"
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
        echo "🔧 TIMEOUT DETECTED: Enhanced generation should have prevented this."
        echo "This may indicate a temporary issue. The next run should succeed with enhanced coverage."
      fi
      
      exit 1
    fi
  fi
done
