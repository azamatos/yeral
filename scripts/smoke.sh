#!/usr/bin/env bash
# After a deploy: the site serves the new build (/version.json) and its key pages answer 200.
# Usage: scripts/smoke.sh <app> <environment> [commit]
set -euo pipefail

app=$1
env=$2
commit=${3:-}

case "$app:$env" in
  storybook:production)
    base=https://storybook.yeral.app
    paths=(/ /iframe.html /index.json)
    ;;
  *)
    echo "No smoke checks defined for $app:$env"
    exit 0
    ;;
esac

served=''
for _ in $(seq 1 12); do
  served=$(curl -fsS "$base/version.json" | sed -n 's/.*"commit": *"\([^"]*\)".*/\1/p' || true)
  if [ -z "$commit" ] || [ "$served" = "$commit" ]; then break; fi
  sleep 5
done
if [ -n "$commit" ] && [ "$served" != "$commit" ]; then
  echo "::error::$base serves commit '$served', expected '$commit'"
  exit 1
fi
echo "version.json: $served"

for p in "${paths[@]}"; do
  code=$(curl -sL -o /dev/null -w '%{http_code}' "$base$p") # final status after redirects
  echo "$code $base$p"
  [ "$code" = 200 ] || { echo "::error::$base$p answered $code"; exit 1; }
done
