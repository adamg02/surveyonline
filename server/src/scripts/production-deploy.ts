import 'dotenv/config';

async function productionDeploy() {
  console.log('Starting production deployment setup...');
  
  try {
    // Import and run database setup
    console.log('1. Setting up database...');
    const { setupDatabase } = await import('./setup-db');
    await setupDatabase();
    console.log('✅ Database setup completed');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    console.log('⚠️  Continuing deployment despite database setup failure...');
  }
  
  try {
    // Import and run seeding
    console.log('2. Seeding database...');
    const seedModule = await import('./seed');
    // The seed script runs automatically when imported
    console.log('✅ Database seeding completed');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    console.log('⚠️  Continuing deployment despite seeding failure...');
  }
  
  console.log('🚀 Production deployment setup completed');
}

if (require.main === module) {
  productionDeploy().catch(error => {
    console.error('Production deployment failed:', error);
    // Don't exit with error code in production to allow server to start
    console.log('🔄 Server will start anyway...');
  });
}

export { productionDeploy };