#!/bin/bash

echo "🚀 Starting server initialization..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -h postgres -p 5432 -U postgres; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
until redis-cli -h redis ping; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "✅ Redis is ready!"

# Force database sync (this will create all tables from schema)
echo "🔧 Syncing database schema..."
npx prisma db push --accept-data-loss --force-reset

echo "✅ Database setup complete!"

# Start the server
echo "🚀 Starting the server..."
exec bun run server/index.ts 