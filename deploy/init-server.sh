#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the script's directory
cd "$SCRIPT_DIR"

# Load env variables from .env file
export $(grep -v '^#' ../.env | xargs)

# Certificate path
CERT_PATH="./certbot/conf/live/$DOMAIN/fullchain.pem"

# Setting up step counter
STEP=1
step() {
    echo ""
    echo "👉🏻 STEP $STEP: $1"
    STEP=$((STEP + 1))
}

# ---------------------------------------------------------

step "Destroying any old containers and volumes"
docker compose down --remove-orphans

# ---------------------------------------------------------

step "Checking certificate presence and validity"
CERT_EXPIRED=true

if sudo test -f "$CERT_PATH"; then
    echo "🔎 Existing certificate found at $CERT_PATH"

    # Check certificate expiration (0 seconds means "expired now or earlier")
    if sudo openssl x509 -checkend 0 -noout -in "$CERT_PATH"; then
        CERT_EXPIRED=false
        echo "✔ Certificate is still valid."
    else
        echo "❌ Certificate is expired. A new one must be issued."
    fi
else
    echo "❌ No certificate found. Need to issue a new one."
fi

# ---------------------------------------------------------

# If certificate is expired or not found, issue a new one
if [ "$CERT_EXPIRED" = true ]; then
    step "Preparing the nginx.conf in HTTP mode"
    envsubst '$DOMAIN $PORT' < ./nginx/nginx.http.conf.template > ./nginx/nginx.conf

    step "Starting containers in HTTP mode"
    docker compose up -d express nginx   

    step "Issuing NEW SSL certificate using Certbot..."
    docker compose run --rm certbot certonly \
        --webroot -w /var/www/certbot \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        --agree-tos \
        --no-eff-email
    echo "✔ New certificate issued successfully."

    step "Stopping HTTP containers"
    docker compose down
fi

# ---------------------------------------------------------

step "Preparing the nginx.conf in HTTPS mode"
envsubst '$DOMAIN $PORT' < ./nginx/nginx.https.conf.template > ./nginx/nginx.conf

# ---------------------------------------------------------

step "Starting containers in HTTPS mode"
docker compose up -d express nginx

# ---------------------------------------------------------

echo "🎉 Done — $DOMAIN is now running with HTTPS."