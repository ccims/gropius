# Gropius

The easiest way to deploy the Gropius system.

## Production

> :warning: **Before use in production, change environment variable values starting with `Todo`.**

```sh
docker-compose up
```

This will provide
- The public GraphQL API on port 8080: http://localhost:8080/graphiql
- The login-service REST API on port 3000

## Development

> :warning: **This setup should only be used for development!**

```sh
docker-compose -f docker-compose-dev.yaml up
```

This will provide
- The development login service on port 3000: http://localhost:3000
- The public GraphQL API on port 8080: http://localhost:8080/graphiql
  - By default, authentication is disabled. This allows performing queries without a token. Mutations still require a token to identify the user, however permissions are not checked. For details see https://ccims.github.io/gropius-backend-docs//modules#api-public
- The internal GraphQL API on port 8081: http://localhost:8081/graphiql

### GitHub sync

To execute the github sync use:

```sh
GITHUB_DUMMY_PAT=YourGithubToken docker-compose -f docker-compose-dev.yaml up github
```
