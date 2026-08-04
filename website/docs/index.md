---
layout: home

hero:
  name: Gropius
  text: Issue management across component boundaries
  tagline: A cross-component issue management system for component-based architectures - with a GraphQL API, pluggable authentication and two-way sync to GitHub and Jira.
  image:
    src: /img/logo.svg
    alt: Gropius
  actions:
    - theme: brand
      text: Get started
      link: /docs/
    - theme: alt
      text: GraphQL API
      link: /graphql/public/
    - theme: alt
      text: View on GitHub
      link: https://github.com/ccims/gropius

features:
  - title: One issue, many components
    details: Issues are attached to trackables rather than to a single repository, so a defect that spans several components stays a single issue instead of a thread of duplicates.
  - title: GraphQL all the way down
    details: A public API for clients and an internal API for services, both code-first on Kotlin, Spring Boot and Neo4j via GraphGlue - with filtering, ordering and authorization built in.
    link: /graphql/public/
  - title: Sync with the tools in use
    details: The GitHub and Jira syncs run scheduled cycles in both directions, mapping titles, descriptions, comments and labels onto issue management systems teams already work in.
    link: /docs/github
  - title: Authentication you can extend
    details: A NestJS login service brokers OAuth and username/password strategies, issues the backend's access tokens, and links the accounts a user holds in each connected system.
    link: /docs/login
  - title: Documented down to the source
    details: The Kotlin API reference, the TypeScript login-service reference, both GraphQL schemas and the REST API are generated from the code on every deploy.
    link: /api/
  - title: Runs with one command
    details: A docker-compose setup brings up every service, the databases and the frontend - a separate testing compose file does the same for development.
    link: /docs/
---
