
#!/bin/bash

# Enhanced Trading Signal Generation Script
# Parameters: SUPABASE_URL, SUPABASE_ANON_KEY, DEBUG_MODE, GITHUB_RUN_ID

echo "🤖 Starting OPTIMIZED GitHub Actions signal generation..."
echo "✨ NEW FEATURES:"
echo "  - 120-second timeout protection"
echo "  - Maximum 8 signals per run (prevents overload)"
echo "  - Concurrent processing (3 pairs simultaneously)"
echo "  - Optimized AI prompts (-50% token usage)"
echo "  - Prioritized major currency pairs"
echo "  - Enhanced error handling and recovery"
echo "Workflow: $GITHUB_WORKFLOW"
echo "Run number: $GITHUB_RUN_NUMBER"

start_time=$(date +%s)

# Enhanced signal generation with optimized retry logic
max_retries=3
retry_count=0
success=false

while [ $retry_count -lt $max_retries ] && [ "$success" = false ]; do
  echo "🔄 Optimized attempt $((retry_count + 1)) of $max_retries"
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    "$SUPABASE_URL/functions/v1/generate-signals" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "X-GitHub-Run-ID: $GITHUB_RUN_ID" \
    -H "X-Optimized-Mode: true" \
    -d "{\"trigger\": \"github_actions\", \"run_id\": \"$GITHUB_RUN_ID\", \"attempt\": $((retry_count + 1)), \"optimized\": true}" \
    --max-time 150)
  
  # Extract HTTP status code and response
  http_code=$(echo "$response" | tail -n1)
  response_body=$(echo "$response" | head -n -1)
  
  echo "HTTP Status: $http_code"
  if [ "$DEBUG_MODE" = "true" ]; then
    echo "Response body: $response_body"
  fi
  
  if [ "$http_code" -eq 200 ]; then
    success=true
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    echo "✅ OPTIMIZED signal generation successful in ${duration}s"
    
    # Extract enhanced metrics from response
    signals_count=$(echo "$response_body" | jq -r '.stats.signalsGenerated // 0' 2>/dev/null || echo "0")
    execution_time=$(echo "$response_body" | jq -r '.stats.executionTime // "unknown"' 2>/dev/null || echo "unknown")
    concurrent_limit=$(echo "$response_body" | jq -r '.stats.concurrentLimit // 3' 2>/dev/null || echo "3")
    max_per_run=$(echo "$response_body" | jq -r '.stats.maxNewSignalsPerRun // 8' 2>/dev/null || echo "8")
    
    echo "📊 OPTIMIZED METRICS:"
    echo "  - Signals generated: $signals_count"
    echo "  - Function execution time: $execution_time"
    echo "  - Concurrent processing limit: $concurrent_limit"
    echo "  - Max signals per run: $max_per_run"
    echo "  - Total workflow time: ${duration}s"
  else
    retry_count=$((retry_count + 1))
    if [ $retry_count -lt $max_retries ]; then
      echo "⚠️ Optimized attempt failed (status $http_code), retrying in 15 seconds..."
      echo "Response: $response_body"
      sleep 15
    else
      echo "❌ All optimized attempts failed. Final status: $http_code"
      echo "Response: $response_body"
      
      # Check for specific timeout error
      if [ "$http_code" -eq 504 ] || echo "$response_body" | grep -q "timeout"; then
        echo "🔧 TIMEOUT DETECTED: The optimization should have prevented this."
        echo "This may indicate a temporary issue. The next run should succeed with optimizations."
      fi
      
      exit 1
    fi
  fi
done
