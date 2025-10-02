import 'dotenv/config';
import { executeQuery } from '../db/snowflake';

async function listDatabases() {
  try {
    console.log('Checking available databases...');
    const databases = await executeQuery('SHOW DATABASES');
    console.log('Available databases:');
    databases.forEach((db: any) => {
      console.log(`- ${db.name}`);
    });
  } catch (error) {
    console.error('Error listing databases:', error);
  } finally {
    const { closeConnection } = await import('../db/snowflake');
    await closeConnection();
  }
}

listDatabases();