# Database Setup Guide

This project supports both PostgreSQL (production) and SQLite (local development).

## Production (Render.com)
- Uses PostgreSQL automatically
- Schema: `prisma/schema.prisma`
- Environment variables are set automatically by Render

## Local Development Options

### Option 1: PostgreSQL (Recommended)
Matches production environment exactly.

1. Install PostgreSQL locally
2. Create a database: `createdb surveyonline`
3. Update `.env` with your PostgreSQL connection:
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/surveyonline?schema=public
   ```
4. Run migrations: `npx prisma migrate dev`

### Option 2: SQLite (Simpler setup)
Good for quick local development.

1. Update `.env` to use SQLite:
   ```
   DATABASE_URL=file:./dev.db
   ```
2. Use the SQLite schema: `npx prisma migrate dev --schema=./prisma/schema-sqlite.prisma`
3. Generate client: `npx prisma generate --schema=./prisma/schema-sqlite.prisma`

## Commands

### PostgreSQL (Production Schema)
```bash
npx prisma migrate dev        # Apply migrations
npx prisma generate          # Generate client
npx prisma studio           # Open database browser
```

### SQLite (Development Schema)
```bash
npx prisma migrate dev --schema=./prisma/schema-sqlite.prisma
npx prisma generate --schema=./prisma/schema-sqlite.prisma  
npx prisma studio --schema=./prisma/schema-sqlite.prisma
```

## TypeScript Configuration

### Production Build
- Uses `tsconfig.json` - excludes test files for clean production builds
- Command: `npm run build`

### Development & Testing
- Uses `tsconfig.dev.json` - includes test files for type checking
- Commands: `npm run test:type-check`, `npm test`