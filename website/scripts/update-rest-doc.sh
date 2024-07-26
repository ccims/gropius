#/bin/bash
set -e

cd website
npx docusaurus clean-api-docs all
npx docusaurus gen-api-docs all