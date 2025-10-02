import 'dotenv/config';
import { executeQuery } from '../db/snowflake';

async function main() {
  try {
    const warehouses = await executeQuery('SHOW WAREHOUSES');
    console.log('Available warehouses:');
    warehouses.forEach((warehouse: any) => {
      console.log(`- ${warehouse.name} (${warehouse.state})`);
    });
  } catch (error) {
    console.error('Error listing warehouses:', error);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { 
  const { closeConnection } = await import('../db/snowflake');
  await closeConnection();
});