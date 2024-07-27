#/bin/bash
set -e

cd website
npx docusaurus graphql-to-doc:api-public -f
npx docusaurus graphql-to-doc:api-internal -f
rm docs/graphql/api-public/generated.md
rm docs/graphql/api-internal/generated.md