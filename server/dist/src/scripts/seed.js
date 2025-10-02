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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const snowflake_1 = require("../db/snowflake");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function main() {
    // Set the correct database, warehouse, and schema context  
    await (0, snowflake_1.executeStatement)(`USE WAREHOUSE ${process.env.SNOWFLAKE_WAREHOUSE}`);
    await (0, snowflake_1.executeStatement)(`USE DATABASE ${process.env.SNOWFLAKE_DATABASE}`);
    await (0, snowflake_1.executeStatement)(`USE SCHEMA "${process.env.SNOWFLAKE_SCHEMA}"`);
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const existing = await (0, snowflake_1.executeQuery)('SELECT * FROM USERS WHERE EMAIL = ?', [adminEmail]);
    if (existing.length === 0) {
        const hash = await bcryptjs_1.default.hash(adminPassword, 10);
        await (0, snowflake_1.executeStatement)('INSERT INTO USERS (ID, EMAIL, PASSWORD, ROLE) VALUES (?, ?, ?, ?)', [(0, snowflake_1.generateId)(), adminEmail, hash, 'ADMIN']);
        console.log('Created admin:', adminEmail);
        if (process.env.NODE_ENV !== 'production') {
            console.log('Admin password:', adminPassword);
        }
    }
    else {
        console.log('Admin already exists');
    }
    const surveyCount = await (0, snowflake_1.executeQuery)('SELECT COUNT(*) as COUNT FROM SURVEYS');
    if (surveyCount[0].COUNT === 0) {
        const surveyId = (0, snowflake_1.generateId)();
        await (0, snowflake_1.executeStatement)('INSERT INTO SURVEYS (ID, TITLE, DESCRIPTION, STATUS) VALUES (?, ?, ?, ?)', [surveyId, 'Sample Product Feedback', 'Demo survey for seeding', 'ACTIVE']);
        // Create questions and options
        const questions = [
            {
                id: (0, snowflake_1.generateId)(),
                text: 'Overall satisfaction',
                type: 'RANKING',
                order: 0,
                isRequired: true,
                options: [
                    { text: 'UI', order: 0 },
                    { text: 'Performance', order: 1 },
                    { text: 'Support', order: 2 }
                ]
            },
            {
                id: (0, snowflake_1.generateId)(),
                text: 'Would you recommend us?',
                type: 'SINGLE_CHOICE',
                order: 1,
                isRequired: true,
                options: [
                    { text: 'Yes', order: 0 },
                    { text: 'No', order: 1 }
                ]
            },
            {
                id: (0, snowflake_1.generateId)(),
                text: 'Features you use',
                type: 'MULTI_CHOICE',
                order: 2,
                isRequired: false,
                options: [
                    { text: 'Dashboard', order: 0 },
                    { text: 'Exports', order: 1 },
                    { text: 'API', order: 2 }
                ]
            },
            {
                id: (0, snowflake_1.generateId)(),
                text: 'Any other comments',
                type: 'OPEN_END_TEXT',
                order: 3,
                isRequired: false,
                options: []
            },
            {
                id: (0, snowflake_1.generateId)(),
                text: 'Monthly spend ($)',
                type: 'OPEN_END_NUMERIC',
                order: 4,
                isRequired: false,
                options: []
            },
            {
                id: (0, snowflake_1.generateId)(),
                text: 'List up to 3 improvements',
                type: 'MULTI_OPEN_END',
                order: 5,
                isRequired: false,
                options: [],
                openItems: [
                    { label: 'Idea 1', order: 0 },
                    { label: 'Idea 2', order: 1 },
                    { label: 'Idea 3', order: 2 }
                ]
            }
        ];
        for (const question of questions) {
            await (0, snowflake_1.executeStatement)('INSERT INTO QUESTIONS (ID, SURVEY_ID, TEXT, TYPE, ORDER_NUM, IS_REQUIRED) VALUES (?, ?, ?, ?, ?, ?)', [question.id, surveyId, question.text, question.type, question.order, question.isRequired]);
            // Add options if any
            for (const option of question.options) {
                await (0, snowflake_1.executeStatement)('INSERT INTO OPTIONS (ID, QUESTION_ID, TEXT, ORDER_NUM) VALUES (?, ?, ?, ?)', [(0, snowflake_1.generateId)(), question.id, option.text, option.order]);
            }
            // Add open items if any
            if (question.openItems) {
                for (const openItem of question.openItems) {
                    await (0, snowflake_1.executeStatement)('INSERT INTO OPEN_ITEMS (ID, QUESTION_ID, LABEL, ORDER_NUM) VALUES (?, ?, ?, ?)', [(0, snowflake_1.generateId)(), question.id, openItem.label, openItem.order]);
                }
            }
        }
        console.log('Seeded sample survey.');
    }
    else {
        console.log('Surveys already present, skipping sample survey.');
    }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(async () => {
    const { closeConnection } = await Promise.resolve().then(() => __importStar(require('../db/snowflake')));
    await closeConnection();
});
