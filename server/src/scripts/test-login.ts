import { executeQuery } from '../db/snowflake';
import bcrypt from 'bcryptjs';

async function testLogin() {
  try {
    const user = await executeQuery('SELECT * FROM USERS WHERE EMAIL = ?', ['admin@example.com']);
    
    if (user.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user[0].EMAIL, user[0].ROLE);
    
    // Test the passwords
    const passwords = ['Admin123!', 'admin123', 'Admin123', 'password'];
    
    for (const pwd of passwords) {
      const isValid = await bcrypt.compare(pwd, user[0].PASSWORD);
      console.log(`Password "${pwd}": ${isValid ? '✅ VALID' : '❌ Invalid'}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    const { closeConnection } = await import('../db/snowflake');
    await closeConnection();
  }
}

testLogin();