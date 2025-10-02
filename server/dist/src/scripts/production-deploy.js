"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.productionDeploy = productionDeploy;
require("dotenv/config");
async function productionDeploy() {
    console.log('Starting production deployment setup...');
    try {
        // Import and run database setup
        console.log('1. Setting up database...');
        const { setupDatabase } = await Promise.resolve().then(() => __importStar(require('./setup-db')));
        await setupDatabase();
        console.log('✅ Database setup completed');
    }
    catch (error) {
        console.error('❌ Database setup failed:', error);
        console.log('⚠️  Continuing deployment despite database setup failure...');
    }
    try {
        // Import and run seeding
        console.log('2. Seeding database...');
        const seedModule = await Promise.resolve().then(() => __importStar(require('./seed')));
        // The seed script runs automatically when imported
        console.log('✅ Database seeding completed');
    }
    catch (error) {
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
