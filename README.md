# Gropius

The easiest way to deploy the Gropius system.

> :warning: Files in this repository are not compatible with the legacy `docker-compose` cli. Use the newer integrated  `docker compose` command instead. See [here](https://docs.docker.com/compose/install/) for install instructions.

## Repository 

To clone the repository use:

```sh
git clone --recurse-submodules https://github.com/ccims/gropius.git
```

## Production

To generate a valid configuration, run `./generate_env.sh`.
This command will write the `.env` file, configuring all required secrets.

```sh
docker compose up
```

This will provide
- The frontend on port 4200: http://localhost:4200

## Testing

> :warning: **This setup should only be used for debugging the production version!**

```sh
docker compose -f docker-compose-testing.yaml up
```

This will provide
- The frontend on port 4200: http://localhost:4200
- The public GraphQL API on port 8080: http://localhost:8080/graphiql
- The login-service REST API on port 3000
- The internal GraphQL API on port 8081: http://localhost:8081/graphiql
- Neo4j database on port 7474/7687
- Sync MongoDB database on port 27017
- Login PostgreSQL database on port 5432


### GitHub sync

To execute the github sync use:

```sh
docker compose -f docker-compose-testing.yaml up github
```

## Volumes

Data is persisted in volumes.
To stop Gropius *and remove the volumes* use: 

```
docker compose -f docker-compose-testing.yaml down --volumes 
```
