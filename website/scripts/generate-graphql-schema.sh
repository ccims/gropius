#/bin/bash

mkdir -p ./website/schemas

cd gropius-backend
./gradlew api-public:bootRun --args="--gropius.api.public.jwtPublicKey=LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF2V2RvVU8ySEpkOVpObHVrYk12TgpOOXV5bHJOcjVzNzdkTGVOYS8wcUsrMzJMOWQrMHFnTksrajVLY3ZNbGU2TERjZlh6dVRnbHdmV1VQWVM5dDhDCkZYR1pHaGZxaHZnQmNJUmdLUnVYUTYwbk52dWVqcmVBbmpBRkhuOEVuV2xBaFpzN2o2RE1BWkE5M3gxbm9WWksKUEVzbXRVSytSL09iOWdmVkxmczcrQ0tvS1Q0N2lIaEVmMDB4ZUdPb285dWVtTjlVYTEvc1grNGJqcnk2NHdWVQpkM3FITDdldkxLVTBreG1iZzI3d09ia3BVdnVHZEF1ZERGdDhIRHhHbjEvbXd0WFMxWWtNQ21LUEFxU056QzMyCi9NMlRJbzNmblJ4QitENVowNlNSdHZidGI5MG5nUkE2TEF1bjRpY29MNWx3OUFTU3VwdDkzNUp2WTVwaUg2bkkKalFJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg --gropius.core.createIndicesOnStartup=false" --no-daemon &
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