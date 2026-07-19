#!/usr/bin/env bash
# Verify production CORS allows Capacitor + web origins after redeploy.
set -euo pipefail

BASE_URL="${1:-https://game.metierthailand-test.uk}"
FAIL=0

check_origin() {
  local origin="$1"
  local header
  header=$(curl -sSI -H "Origin: ${origin}" "${BASE_URL}/api/games" | tr -d '\r' | awk -F': ' 'tolower($1)=="access-control-allow-origin"{print $2; exit}')
  if [[ "$header" == "$origin" ]]; then
    echo "OK  ${origin}"
  else
    echo "FAIL ${origin}  (got: ${header:-<missing>})"
    FAIL=1
  fi
}

echo "Checking CORS on ${BASE_URL}"
check_origin "https://board-game-cafe-client.vercel.app"
check_origin "https://localhost"
check_origin "capacitor://localhost"

if [[ "$FAIL" -ne 0 ]]; then
  echo
  echo "Set CLIENT_URL to:"
  echo "  https://board-game-cafe-client.vercel.app,https://localhost,capacitor://localhost"
  echo "and redeploy the server image that includes multi-origin CLIENT_URL parsing."
  exit 1
fi

echo "All origins allowed."
