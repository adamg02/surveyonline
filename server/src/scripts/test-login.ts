import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testLogin() {
  try {
    const user = await prisma.user.findUnique({ 
      where: { email: 'admin@example.com' } 
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.email, user.role);
    
    // Test the passwords
    const passwords = ['Admin123!', 'admin123', 'Admin123', 'password'];
    
    for (const pwd of passwords) {
      const isValid = await bcrypt.compare(pwd, user.password);
      console.log(`Password "${pwd}": ${isValid ? '✅ VALID' : '❌ Invalid'}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();