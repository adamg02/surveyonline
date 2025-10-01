"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
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
            const isValid = await bcryptjs_1.default.compare(pwd, user.password);
            console.log(`Password "${pwd}": ${isValid ? '✅ VALID' : '❌ Invalid'}`);
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
testLogin();
