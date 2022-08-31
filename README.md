# Gropius

The easiest way to deploy the Gropius system.

## Production

TBD

## Development

Caution: this setup should only be used for development!

```sh
docker-compose -f docker-compose-dev.yaml
```

This will provide
- The public api on port 8080: http://localhost:8080/playground
- The internal api on port 8081: http://localhost:8081/playground