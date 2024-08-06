#/bin/bash

mkdir -p ./website/schemas

cd gropius-login-service/backend
export NODE_ENV="development"
export GROPIUS_LOGIN_DATABASE_DRIVER="sqlite"
export GROPIUS_DEFAULT_CHECK_DATABASE_CONSISTENT="none"
export GROPIUS_DEFAULT_ENTITIES_ENABLED="false"

npm start &
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