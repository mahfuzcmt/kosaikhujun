#!/bin/sh
# One-shot bootstrap: issues the initial Let's Encrypt cert for kosailagbe.com.
# Run this ONCE on the prod host after DNS has propagated (kosailagbe.com → server IP).
# After this succeeds, the certbot container in docker-compose.prod.yml renews automatically.
#
#   chmod +x nginx/init-letsencrypt.sh
#   ./nginx/init-letsencrypt.sh you@example.com
#
# Pass --staging as second arg while testing to avoid Let's Encrypt rate limits.

set -eu

DOMAINS="kosailagbe.com"
# To add www later (once www.kosailagbe.com has an A/CNAME record pointing here),
# re-run with: DOMAINS="kosailagbe.com www.kosailagbe.com" and the certbot
# command below will pick it up via --expand on the existing cert.
EMAIL="${1:-}"
STAGING_FLAG=""
[ "${2:-}" = "--staging" ] && STAGING_FLAG="--staging"

if [ -z "$EMAIL" ]; then
    echo "Usage: $0 <email> [--staging]" >&2
    exit 1
fi

COMPOSE="docker compose -f docker-compose.prod.yml"
CERT_PATH="./certbot/conf/live/kosailagbe.com"

echo "==> Creating dummy cert so nginx can start..."
mkdir -p "$CERT_PATH" ./certbot/www
docker run --rm -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    --entrypoint openssl certbot/certbot \
    req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "/etc/letsencrypt/live/kosailagbe.com/privkey.pem" \
    -out    "/etc/letsencrypt/live/kosailagbe.com/fullchain.pem" \
    -subj "/CN=localhost"

echo "==> Starting nginx with the dummy cert..."
$COMPOSE up -d nginx

echo "==> Deleting dummy cert..."
docker run --rm -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    --entrypoint sh certbot/certbot \
    -c "rm -rf /etc/letsencrypt/live/kosailagbe.com /etc/letsencrypt/archive/kosailagbe.com /etc/letsencrypt/renewal/kosailagbe.com.conf"

echo "==> Requesting Let's Encrypt cert for: $DOMAINS"
DOMAIN_ARGS=""
for d in $DOMAINS; do
    DOMAIN_ARGS="$DOMAIN_ARGS -d $d"
done
docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot certonly --webroot -w /var/www/certbot \
    --email "$EMAIL" --agree-tos --no-eff-email \
    $STAGING_FLAG --force-renewal $DOMAIN_ARGS

echo "==> Reloading nginx..."
$COMPOSE exec nginx nginx -s reload

echo "==> Done. Cert installed at $CERT_PATH"
