#/bin/bash

mkdir -p ./website/schemas

cd gropius-login-service/backend
npm run start:dev &
npm_pid=$!
schema_endpoint="http://localhost:3001/login-api-doc-json"
c=0
until curl -s -f -o /dev/null $schema_endpoint
do
    ((c++))
    if ((c > 120)); then
        echo "Failed to get openapi schema: timeout"
        exit 1
    fi
    echo "Waiting for server"
    sleep 2
done
curl -s $schema_endpoint | jq 'walk(if type == "object" and has("operationId") and .summary == "" then ( .summary = if has("description") and .description != "" then .operationId else .operationId end) else . end)' > ../../website/schemas/login.json
echo "Stopping login server"
kill $npm_pid