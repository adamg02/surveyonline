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
const snowflake_1 = require("../db/snowflake");
async function createDraftSurvey() {
    try {
        const surveyId = (0, snowflake_1.generateId)();
        await (0, snowflake_1.executeStatement)('INSERT INTO SURVEYS (ID, TITLE, DESCRIPTION, STATUS) VALUES (?, ?, ?, ?)', [surveyId, 'Draft Survey - Test', 'This is a draft survey for testing', 'DRAFT']);
        // Create questions
        const question1Id = (0, snowflake_1.generateId)();
        await (0, snowflake_1.executeStatement)('INSERT INTO QUESTIONS (ID, SURVEY_ID, TEXT, TYPE, ORDER_NUM, IS_REQUIRED) VALUES (?, ?, ?, ?, ?, ?)', [question1Id, surveyId, 'What is your favorite color?', 'SINGLE_CHOICE', 0, true]);
        // Create options for first question
        const options = [
            { text: 'Red', order: 0 },
            { text: 'Blue', order: 1 },
            { text: 'Green', order: 2 }
        ];
        for (const option of options) {
            await (0, snowflake_1.executeStatement)('INSERT INTO OPTIONS (ID, QUESTION_ID, TEXT, ORDER_NUM) VALUES (?, ?, ?, ?)', [(0, snowflake_1.generateId)(), question1Id, option.text, option.order]);
        }
        // Create second question
        const question2Id = (0, snowflake_1.generateId)();
        await (0, snowflake_1.executeStatement)('INSERT INTO QUESTIONS (ID, SURVEY_ID, TEXT, TYPE, ORDER_NUM, IS_REQUIRED) VALUES (?, ?, ?, ?, ?, ?)', [question2Id, surveyId, 'Any feedback?', 'OPEN_END_TEXT', 1, false]);
        console.log('Created draft survey with ID:', surveyId);
        // List all surveys to verify
        const allSurveys = await (0, snowflake_1.executeQuery)(`
      SELECT ID, TITLE, STATUS, CREATED_AT
      FROM SURVEYS
      ORDER BY CREATED_AT DESC
    `);
        console.log('All surveys in database:');
        allSurveys.forEach((s) => {
            console.log(`- ${s.TITLE} (${s.STATUS}) - ID: ${s.ID}`);
        });
    }
    catch (error) {
        console.error('Error creating draft survey:', error);
    }
    finally {
        const { closeConnection } = await Promise.resolve().then(() => __importStar(require('../db/snowflake')));
        await closeConnection();
    }
}
createDraftSurvey();
