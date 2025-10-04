#!/bin/bash

SERVER_NAME="${SERVER_NAME:-tunnel-server}"
API_HOST="${API_HOST:-http://localhost:8888}"
ENDPOINT="/v1/webhooks/servers/${SERVER_NAME}/states"

# Stop the server
echo "Stopping server: ${SERVER_NAME}..."
curl -X PUT "${API_HOST}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"state": "DOWN"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo "Server shutdown request sent."