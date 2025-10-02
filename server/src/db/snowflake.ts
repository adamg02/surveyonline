import * as snowflake from 'snowflake-sdk';

// Snowflake connection configuration
const connectionOptions: snowflake.ConnectionOptions = {
  account: process.env.SNOWFLAKE_ACCOUNT || '',
  username: process.env.SNOWFLAKE_USERNAME || '',
  password: process.env.SNOWFLAKE_PASSWORD || '',
  warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
  database: process.env.SNOWFLAKE_DATABASE || 'SURVEYONLINE',
  schema: process.env.SNOWFLAKE_SCHEMA || 'PUBLIC',
  role: process.env.SNOWFLAKE_ROLE || 'ACCOUNTADMIN'
};

let connection: snowflake.Connection | null = null;

export async function getConnection(): Promise<snowflake.Connection> {
  if (connection) {
    return connection;
  }

  return new Promise((resolve, reject) => {
    connection = snowflake.createConnection(connectionOptions);
    
    connection.connect((err: any, conn: any) => {
      if (err) {
        console.error('Unable to connect to Snowflake:', err.message);
        reject(err);
      } else {
        console.log('Successfully connected to Snowflake');
        resolve(conn);
      }
    });
  });
}

export async function executeQuery<T = any>(
  sqlText: string, 
  binds: any[] = []
): Promise<T[]> {
  const conn = await getConnection();
  
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText,
      binds,
      complete: (err: any, stmt: any, rows: any) => {
        if (err) {
          console.error('Failed to execute statement:', err.message);
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      }
    });
  });
}

export async function executeStatement(
  sqlText: string, 
  binds: any[] = []
): Promise<void> {
  const conn = await getConnection();
  
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText,
      binds,
      complete: (err: any) => {
        if (err) {
          console.error('Failed to execute statement:', err.message);
          reject(err);
        } else {
          resolve();
        }
      }
    });
  });
}

export function generateId(): string {
  return 'sf_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function closeConnection(): Promise<void> {
  if (connection) {
    return new Promise((resolve) => {
      connection!.destroy((err: any) => {
        if (err) {
          console.error('Error closing connection:', err.message);
        } else {
          console.log('Snowflake connection closed');
        }
        connection = null;
        resolve();
      });
    });
  }
}

// Type definitions for our data models
export interface Survey {
  ID: string;
  TITLE: string;
  DESCRIPTION: string | null;
  STATUS: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  CREATED_AT: string;
  UPDATED_AT: string;
}

export interface Question {
  ID: string;
  SURVEY_ID: string;
  TEXT: string;
  TYPE: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'OPEN_END_TEXT' | 'OPEN_END_NUMERIC' | 'MULTI_OPEN_END' | 'RANKING';
  ORDER_NUM: number;
  IS_REQUIRED: boolean;
  CONFIG: string | null; // JSON string
}

export interface Option {
  ID: string;
  QUESTION_ID: string;
  TEXT: string;
  CODE: string | null;
  VALUE: number | null;
  IS_EXCLUSIVE: boolean;
  ORDER_NUM: number;
}

export interface OpenItem {
  ID: string;
  QUESTION_ID: string;
  LABEL: string;
  CODE: string | null;
  ORDER_NUM: number;
}

export interface Response {
  ID: string;
  SURVEY_ID: string;
  USER_ID: string | null;
  CREATED_AT: string;
}

export interface Answer {
  ID: string;
  RESPONSE_ID: string;
  QUESTION_ID: string;
  PAYLOAD: string; // JSON string
  CREATED_AT: string;
}

export interface User {
  ID: string;
  EMAIL: string;
  PASSWORD: string;
  ROLE: 'ADMIN' | 'RESPONDENT';
  CREATED_AT: string;
}