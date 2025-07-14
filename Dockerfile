# Use the official Bun image
FROM oven/bun:1 as base

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client from schema only (no DB connection needed)
RUN bunx prisma generate --schema=./prisma/schema.prisma

# Copy source code
COPY . .

# Make startup script executable
RUN chmod +x start-server.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/test || exit 1

# Start the application using the startup script
CMD ["./start-server.sh"]