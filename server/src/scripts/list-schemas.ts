import 'dotenv/config';
import { executeQuery } from '../db/snowflake';

async function listSchemas() {
  try {
    console.log('Checking available schemas in SNOWFLAKE_LEARNING_DB...');
    await executeQuery('USE DATABASE SNOWFLAKE_LEARNING_DB');
    const schemas = await executeQuery('SHOW SCHEMAS');
    console.log('Available schemas:');
    schemas.forEach((schema: any) => {
      console.log(`- ${schema.name}`);
    });
  } catch (error) {
    console.error('Error listing schemas:', error);
  } finally {
    const { closeConnection } = await import('../db/snowflake');
    await closeConnection();
  }
}

listSchemas();