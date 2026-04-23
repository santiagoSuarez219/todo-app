#!/bin/sh
set -e

echo "→ Ejecutando migraciones..."
npm run migration:run

echo "→ Iniciando servidor..."
exec node dist/main
