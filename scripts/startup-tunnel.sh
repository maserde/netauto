#!/bin/bash

SERVER_NAME="${SERVER_NAME:-tunnel-server}"
API_HOST="${API_HOST:-http://localhost:8888}"
ENDPOINT="/v1/webhooks/servers/${SERVER_NAME}/states"

# Start the server
echo "Starting server: ${SERVER_NAME}..."
curl -X PUT "${API_HOST}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"state": "UP"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo "Server startup request sent."