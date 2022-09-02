# Dev-Login-Service

## Description

A small service to provide infinitely valid API tokens for development via an easy-to-access API

## API
### `/`
Returns a short description

### `/token?user=[USERNAME]`
Generates and returns an API Token to access the backend as the user with `[USERNAME]`.
If the username doesn't exist, returns 404

### `/token?id=[USER-ID]`
Generates and returns an API Token to access the backend as the user with the database-ID `[USER-ID]`.
If the id doesn't exist or is no user, returns 404

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```