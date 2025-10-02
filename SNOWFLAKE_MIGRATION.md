# Snowflake Migration Guide

This application has been migrated from PostgreSQL with Prisma to use Snowflake as the data store.

## What Changed

### Database Layer
- **Removed**: Prisma ORM and PostgreSQL dependency
- **Added**: Snowflake SDK for direct database connections
- **New**: Custom database abstraction layer (`src/db/snowflake.ts`)

### Schema Changes
- Converted Prisma schema to Snowflake DDL
- Table names are now uppercase (Snowflake convention)
- Column names are now uppercase
- Foreign key constraints are maintained
- JSON fields are stored as TEXT with JSON parsing in application layer

### Environment Variables
The following environment variables are now required:

```bash
SNOWFLAKE_ACCOUNT=your_account.region
SNOWFLAKE_USERNAME=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_DATABASE=SURVEYONLINE
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_ROLE=ACCOUNTADMIN
```

### Dependencies
- **Removed**: `@prisma/client`, `prisma`
- **Added**: `snowflake-sdk`

## Database Schema

The application creates the following tables in Snowflake:

### USERS
```sql
CREATE TABLE USERS (
    ID VARCHAR(255) PRIMARY KEY,
    EMAIL VARCHAR(255) UNIQUE NOT NULL,
    PASSWORD VARCHAR(255) NOT NULL,
    ROLE VARCHAR(50) DEFAULT 'RESPONDENT',
    CREATED_AT TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP()
);
```

### SURVEYS
```sql
CREATE TABLE SURVEYS (
    ID VARCHAR(255) PRIMARY KEY,
    TITLE VARCHAR(1000) NOT NULL,
    DESCRIPTION TEXT,
    STATUS VARCHAR(50) DEFAULT 'DRAFT',
    CREATED_AT TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP()
);
```

### QUESTIONS
```sql
CREATE TABLE QUESTIONS (
    ID VARCHAR(255) PRIMARY KEY,
    SURVEY_ID VARCHAR(255) NOT NULL,
    TEXT TEXT NOT NULL,
    TYPE VARCHAR(50) NOT NULL,
    ORDER_NUM INTEGER NOT NULL,
    IS_REQUIRED BOOLEAN DEFAULT FALSE,
    CONFIG TEXT,
    CREATED_AT TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP(),
    FOREIGN KEY (SURVEY_ID) REFERENCES SURVEYS(ID)
);
```

### OPTIONS
```sql
CREATE TABLE OPTIONS (
    ID VARCHAR(255) PRIMARY KEY,
    QUESTION_ID VARCHAR(255) NOT NULL,
    TEXT TEXT NOT NULL,
    CODE VARCHAR(255),
    VALUE NUMBER,
    IS_EXCLUSIVE BOOLEAN DEFAULT FALSE,
    ORDER_NUM INTEGER NOT NULL,
    FOREIGN KEY (QUESTION_ID) REFERENCES QUESTIONS(ID)
);
```

### OPEN_ITEMS
```sql
CREATE TABLE OPEN_ITEMS (
    ID VARCHAR(255) PRIMARY KEY,
    QUESTION_ID VARCHAR(255) NOT NULL,
    LABEL TEXT NOT NULL,
    CODE VARCHAR(255),
    ORDER_NUM INTEGER NOT NULL,
    FOREIGN KEY (QUESTION_ID) REFERENCES QUESTIONS(ID)
);
```

### RESPONSES
```sql
CREATE TABLE RESPONSES (
    ID VARCHAR(255) PRIMARY KEY,
    SURVEY_ID VARCHAR(255) NOT NULL,
    USER_ID VARCHAR(255),
    CREATED_AT TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP(),
    FOREIGN KEY (SURVEY_ID) REFERENCES SURVEYS(ID),
    FOREIGN KEY (USER_ID) REFERENCES USERS(ID)
);
```

### ANSWERS
```sql
CREATE TABLE ANSWERS (
    ID VARCHAR(255) PRIMARY KEY,
    RESPONSE_ID VARCHAR(255) NOT NULL,
    QUESTION_ID VARCHAR(255) NOT NULL,
    PAYLOAD TEXT NOT NULL,
    CREATED_AT TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP(),
    FOREIGN KEY (RESPONSE_ID) REFERENCES RESPONSES(ID),
    FOREIGN KEY (QUESTION_ID) REFERENCES QUESTIONS(ID)
);
```

## Setup Instructions

### 1. Snowflake Account Setup
1. Create a Snowflake account if you don't have one
2. Create a database named `SURVEYONLINE`
3. Ensure you have appropriate permissions to create tables and insert data

### 2. Local Development
1. Install dependencies: `npm install`
2. Set environment variables in `.env` file
3. Run database setup: `npm run setup:db`
4. Seed the database: `npm run seed`
5. Start the server: `npm run dev`

### 3. Production Deployment
1. Update environment variables in your deployment platform
2. The `npm run deploy` command will:
   - Run database setup
   - Seed initial data
   - Start the application

## API Changes

The API endpoints remain the same, but the underlying data access has changed:

- All Prisma queries replaced with raw Snowflake SQL
- ID generation now uses custom `generateId()` function
- JSON fields are serialized/deserialized manually
- Database connections are managed through the custom connection pool

## Key Files Modified

- `src/db/snowflake.ts` - New database abstraction layer
- `src/routes/surveys.ts` - Updated to use Snowflake queries
- `src/routes/auth.ts` - Updated to use Snowflake queries
- `src/routes/responses.ts` - Updated to use Snowflake queries
- `src/scripts/setup-db.ts` - Database setup script
- `src/scripts/seed.ts` - Updated seeding script
- `package.json` - Updated dependencies and scripts
- `render.yaml` - Updated deployment configuration

## Migration Benefits

1. **Scalability**: Snowflake can handle much larger datasets
2. **Analytics**: Built-in data warehousing capabilities
3. **Performance**: Optimized for analytical workloads
4. **Flexibility**: Can handle semi-structured data natively
5. **Cost**: Pay-per-use pricing model

## Considerations

1. **Latency**: Snowflake may have higher connection latency than PostgreSQL
2. **Complexity**: Manual query management vs ORM abstraction
3. **Cost**: Usage-based pricing requires monitoring
4. **Learning Curve**: Different SQL dialect and concepts

## Troubleshooting

### Connection Issues
- Verify Snowflake account credentials
- Check network connectivity
- Ensure warehouse is running

### Schema Issues
- Run setup script: `npm run setup:db`
- Check table existence in Snowflake console
- Verify user permissions

### Performance Issues
- Monitor warehouse size and auto-suspend settings
- Optimize queries for Snowflake's architecture
- Consider clustering keys for large tables