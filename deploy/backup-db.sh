#!/bin/sh
set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
COMPOSE_DIR="${COMPOSE_DIR:-$SCRIPT_DIR/..}"
BACKUP_DIR="${BACKUP_DIR:-${HOME}/.local/share/sottoq/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
MYSQL_USER="${MYSQL_USER:-app}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-app}"
MYSQL_DATABASE="${MYSQL_DATABASE:-sottoq}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

stamp=$(date +%Y%m%d-%H%M%S)
file="$BACKUP_DIR/$MYSQL_DATABASE-$stamp.sql.gz"

cd "$COMPOSE_DIR"
docker compose exec -T db mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --single-transaction "$MYSQL_DATABASE" | gzip -c > "$file"
chmod 600 "$file"

find "$BACKUP_DIR" -type f -name "$MYSQL_DATABASE-*.sql.gz" -mtime +"$KEEP_DAYS" -delete
