#!/bin/bash

# Function to generate a random password
generate_random_password() {
  openssl rand -base64 15 | tr -d /=+ | cut -c1-20
}

# Check if .env already exists
if [ -f .env ]; then
  echo ".env file already exists."
  exit 1
fi

# Prompt for Gropius host, default to http://localhost:4200
read -p "Enter the Gropius host (default: http://localhost:4200): " GROPIUS_HOST
GROPIUS_HOST=${GROPIUS_HOST:-http://localhost:4200}

# Prompt for admin password, default to admin
read -p "Enter the Gropius admin password (default: admin): " GROPIUS_ADMIN_PASSWORD
GROPIUS_ADMIN_PASSWORD=${GROPIUS_ADMIN_PASSWORD:-admin}

# Generate random passwords
GROPIUS_NEO4J_PASSWORD=$(generate_random_password)
GROPIUS_API_INTERNAL_TOKEN=$(generate_random_password)
GROPIUS_POSTGRES_PASSWORD=$(generate_random_password)
GROPIUS_SYNC_API_SECRET=$(generate_random_password)
GROPIUS_MONGO_PASSWORD=$(generate_random_password)

# Create the .env file and write environment variables
cat <<EOL > .env
GROPIUS_HOST="$GROPIUS_HOST"
GROPIUS_ADMIN_PASSWORD="$GROPIUS_ADMIN_PASSWORD"
GROPIUS_NEO4J_PASSWORD="$GROPIUS_NEO4J_PASSWORD"
GROPIUS_API_INTERNAL_TOKEN="$GROPIUS_API_INTERNAL_TOKEN"
GROPIUS_POSTGRES_PASSWORD="$GROPIUS_POSTGRES_PASSWORD"
GROPIUS_SYNC_API_SECRET="$GROPIUS_SYNC_API_SECRET"
GROPIUS_MONGO_PASSWORD="$GROPIUS_MONGO_PASSWORD"
EOL

# Generate RSA keys
# Generate the first key pair
openssl genpkey -algorithm RSA -out private_key1.pem
openssl rsa -pubout -in private_key1.pem -out public_key1.pem

# Generate the second key pair
openssl genpkey -algorithm RSA -out private_key2.pem
openssl rsa -pubout -in private_key2.pem -out public_key2.pem

# Base64 encode each key
base64 -w 0 private_key1.pem > private_key1_base64.txt
base64 -w 0 public_key1.pem > public_key1_base64.txt
base64 -w 0 private_key2.pem > private_key2_base64.txt
base64 -w 0 public_key2.pem > public_key2_base64.txt

# Combine the keys into a single file
echo "GROPIUS_OAUTH_PUBLIC_KEY=\"$(cat public_key1_base64.txt)\"" >> .env
echo "GROPIUS_OAUTH_PRIVATE_KEY=\"$(cat private_key1_base64.txt)\"" >> .env
echo "GROPIUS_LOGIN_SPECIFIC_PUBLIC_KEY=\"$(cat public_key2_base64.txt)\"" >> .env
echo "GROPIUS_LOGIN_SPECIFIC_PRIVATE_KEY=\"$(cat private_key2_base64.txt)\"" >> .env

# Clean up temporary files
rm private_key1.pem public_key1.pem private_key2.pem public_key2.pem
rm private_key1_base64.txt public_key1_base64.txt private_key2_base64.txt public_key2_base64.txt

echo ".env file has been created successfully."
