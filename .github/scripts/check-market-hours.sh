
#!/bin/bash

# Enhanced Market Hours Check Script
# Returns: market_open=true/false, current_time

# Get current time in UTC
current_hour=$(date -u +%H)
current_day=$(date -u +%u)  # 1=Monday, 7=Sunday
current_minute=$(date -u +%M)

echo "📊 Market Hours Analysis:"
echo "Current UTC time: $(date -u)"
echo "Hour: $current_hour, Day: $current_day, Minute: $current_minute"

# Enhanced market hours logic (Sunday-Friday, 00:00-22:00 UTC covers most forex sessions)
# Note: Sunday evening often has limited activity until Asian markets open
market_open=false
if [ "$current_day" -eq 7 ]; then
  # Sunday: Only late evening when some markets start to open (21:00-23:59 UTC)
  if [ "$current_hour" -ge 21 ]; then
    market_open=true
    echo "✅ Forex market is OPEN (Sunday evening, Asian session prep)"
  else
    echo "🛑 Market CLOSED (Sunday, before Asian session)"
  fi
elif [ "$current_day" -ge 1 ] && [ "$current_day" -le 5 ]; then
  # Monday-Friday: Normal business hours
  if [ "$current_hour" -ge 0 ] && [ "$current_hour" -le 22 ]; then
    market_open=true
    echo "✅ Forex market is OPEN (weekday, business hours)"
  else
    echo "🛑 Market CLOSED (outside business hours)"
  fi
else
  echo "🛑 Market CLOSED (Saturday)"
fi

echo "market_open=$market_open" >> $GITHUB_OUTPUT
echo "current_time=$(date -u)" >> $GITHUB_OUTPUT
