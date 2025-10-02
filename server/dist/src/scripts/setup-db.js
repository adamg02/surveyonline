"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDatabase = setupDatabase;
require("dotenv/config");
const snowflake_1 = require("../db/snowflake");
const createTablesSQL = [
    // Use the warehouse, database, and schema
    `USE WAREHOUSE ${process.env.SNOWFLAKE_WAREHOUSE}`,
    `USE DATABASE SNOWFLAKE_LEARNING_DB`,
    // Create a personal schema
    `CREATE SCHEMA IF NOT EXISTS "ADAM.GILL@SAVANTA.COM_SURVEYONLINE"`,
    // Use the schema
    `USE SCHEMA "ADAM.GILL@SAVANTA.COM_SURVEYONLINE"`,
    // Users table
    `CREATE TABLE IF NOT EXISTS USERS (
    ID VARCHAR(255) PRIMARY KEY,
    EMAIL VARCHAR(255) UNIQUE NOT NULL,
    PASSWORD VARCHAR(255) NOT NULL,
    ROLE VARCHAR(50) DEFAULT 'RESPONDENT',
    CREATED_AT TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP()
  )`,
    // Surveys table
    `CREATE TABLE IF NOT EXISTS SURVEYS (
    ID VARCHAR(255) PRIMARY KEY,
    TITLE VARCHAR(1000) NOT NULL,
    DESCRIPTION TEXT,
    STATUS VARCHAR(50) DEFAULT 'DRAFT',
    CREATED_AT TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP()
  )`,
    // Questions table
    `CREATE TABLE IF NOT EXISTS QUESTIONS (
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
  )`,
    // Options table
    `CREATE TABLE IF NOT EXISTS OPTIONS (
    ID VARCHAR(255) PRIMARY KEY,
    QUESTION_ID VARCHAR(255) NOT NULL,
    TEXT TEXT NOT NULL,
    CODE VARCHAR(255),
    VALUE NUMBER,
    IS_EXCLUSIVE BOOLEAN DEFAULT FALSE,
    ORDER_NUM INTEGER NOT NULL,
    FOREIGN KEY (QUESTION_ID) REFERENCES QUESTIONS(ID)
  )`,
    // OpenItems table
    `CREATE TABLE IF NOT EXISTS OPEN_ITEMS (
    ID VARCHAR(255) PRIMARY KEY,
    QUESTION_ID VARCHAR(255) NOT NULL,
    LABEL TEXT NOT NULL,
    CODE VARCHAR(255),
    ORDER_NUM INTEGER NOT NULL,
    FOREIGN KEY (QUESTION_ID) REFERENCES QUESTIONS(ID)
  )`,
    // Responses table
    `CREATE TABLE IF NOT EXISTS RESPONSES (
    ID VARCHAR(255) PRIMARY KEY,
    SURVEY_ID VARCHAR(255) NOT NULL,
    USER_ID VARCHAR(255),
    CREATED_AT TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP(),
    FOREIGN KEY (SURVEY_ID) REFERENCES SURVEYS(ID),
    FOREIGN KEY (USER_ID) REFERENCES USERS(ID)
  )`,
    // Answers table
    `CREATE TABLE IF NOT EXISTS ANSWERS (
    ID VARCHAR(255) PRIMARY KEY,
    RESPONSE_ID VARCHAR(255) NOT NULL,
    QUESTION_ID VARCHAR(255) NOT NULL,
    PAYLOAD TEXT NOT NULL,
    CREATED_AT TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP(),
    FOREIGN KEY (RESPONSE_ID) REFERENCES RESPONSES(ID),
    FOREIGN KEY (QUESTION_ID) REFERENCES QUESTIONS(ID)
  )`
];
async function setupDatabase() {
    try {
        console.log('Setting up Snowflake database...');
        console.log('Environment check:');
        console.log('- SNOWFLAKE_ACCOUNT:', process.env.SNOWFLAKE_ACCOUNT);
        console.log('- SNOWFLAKE_USERNAME:', process.env.SNOWFLAKE_USERNAME);
        console.log('- SNOWFLAKE_DATABASE:', process.env.SNOWFLAKE_DATABASE);
        console.log('- SNOWFLAKE_WAREHOUSE:', process.env.SNOWFLAKE_WAREHOUSE);
        for (const sql of createTablesSQL) {
            console.log('Executing:', sql.split('\n')[0] + '...');
            await (0, snowflake_1.executeStatement)(sql);
        }
        console.log('Database setup completed successfully!');
    }
    catch (error) {
        console.error('Database setup failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    setupDatabase();
}
