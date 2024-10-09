#/bin/bash

mkdir -p ./website/schemas

cd gropius-backend
./gradlew api-public:bootRun --args="--gropius.api.public.jwtPublicKey=LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFzYk9TSnJWM3VCN1IxcE4xYUQvOQpzc3pIVzV2RGRHMHBPS2JxdWlaclFCRmRrbTZuYUQzU1F2TWVnWHQ0ZGF0YnVzRHZiWDdJRS9DdS9uUEhXN2Z3Cnc5TGRKQ0Z5M0tSQ0NGQUJTd1QwUkxHaUNUejBCRkhCZFlzWjF2K2E1NU9lb3J0Q2NBRkRJbFdCQzJzL2FtaWYKQ242bHhkS3JQWHROSlBtTmdhVWI1S240K1l6OVJnTmkvWk5yeUZtNlRrd1FnMTNhNXJNM0NPYkt1WGdPdDdDYgpDWUpYYnJTL1k3VXRwUmwrd1lpQ012SnJneGgrTXJWKzdOSW9UZ2wvZm9JSU9PZUR5dXJhS09mYW1peDBHbWNyCi9tK2dGTGdtUVVMbmQ3M1hncmdGZ1NNbUU3UVhlczlnQkx5bE55dUxUUVVBb1RTZW1mQUJJemp4MWgxZC9tNVoKUXdJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg== --gropius.core.createIndicesOnStartup=false" --no-daemon &
gradlew_pid=$!
schema_endpoint="http://localhost:8080/sdl"
c=0
until curl -s -f -o /dev/null $schema_endpoint
do
    ((c++))
    if ((c > 120)); then
        echo "Failed to get graphql schema: timeout"
        exit 1
    fi
    echo "Waiting for server"
    sleep 2
done
curl -s -o ../website/schemas/api-public.gql $schema_endpoint
echo "Stopping graphql server"
kill $gradlew_pid

./gradlew api-internal:bootRun --args="--server.port=8081 --gropius.core.createIndicesOnStartup=false" --no-daemon &
gradlew_pid=$!
schema_endpoint="http://localhost:8081/sdl"
c=0
until curl -s -f -o /dev/null $schema_endpoint
do
    ((c++))
    if ((c > 120)); then
        echo "Failed to get graphql schema: timeout"
        exit 1
    fi
    echo "Waiting for server"
    sleep 2
done
curl -s -o ../website/schemas/api-internal.gql $schema_endpoint
echo "Stopping graphql server"
kill $gradlew_pid