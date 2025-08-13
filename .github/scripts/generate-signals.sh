
#!/bin/bash

# Enhanced Trading Signal Generation Script
# Parameters: SUPABASE_URL, SUPABASE_ANON_KEY, DEBUG_MODE, GITHUB_RUN_ID

echo "💰 Starting COST-OPTIMIZED GitHub Actions signal generation..."
echo "💰 COST REDUCTION FEATURES:"
echo "  - 90% cheaper OpenAI model (gpt-4o-mini)"
echo "  - Smart filtering: Top 4 pairs only per run"
echo "  - 60% fewer tokens per analysis"
echo "  - Reduced concurrency and longer delays"
echo "  - 12-minute schedule (down from 5-minute)"
echo "  - Cost logging for monitoring"
echo "Workflow: $GITHUB_WORKFLOW"
echo "Run number: $GITHUB_RUN_NUMBER"

start_time=$(date +%s)

# Cost-optimized signal generation with reduced retry logic
max_retries=2
retry_count=0
success=false

while [ $retry_count -lt $max_retries ] && [ "$success" = false ]; do
  echo "🔄 Cost-optimized attempt $((retry_count + 1)) of $max_retries"
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    "$SUPABASE_URL/functions/v1/generate-signals" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "X-GitHub-Run-ID: $GITHUB_RUN_ID" \
    -H "X-Cost-Optimized: true" \
    -d "{\"trigger\": \"github_actions\", \"run_id\": \"$GITHUB_RUN_ID\", \"attempt\": $((retry_count + 1)), \"optimized\": true, \"maxAnalyzedPairs\": 4}" \
    --max-time 120)
  
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
      echo "⚠️ Cost-optimized attempt failed (status $http_code), retrying in 10 seconds..."
      echo "Response: $response_body"
      sleep 10
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
