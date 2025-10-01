"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const app = (0, app_1.createApp)();
(async () => {
    // Create a survey
    const surveyRes = await (0, supertest_1.default)(app)
        .post('/api/surveys')
        .send({
        title: 'Test Survey',
        description: 'A basic test',
        questions: [
            { text: 'Pick one', type: 'SINGLE_CHOICE', order: 0, options: [{ text: 'A', order: 0 }, { text: 'B', order: 1 }] },
            { text: 'Rank these', type: 'RANKING', order: 1, options: [{ text: 'X', order: 0 }, { text: 'Y', order: 1 }] }
        ]
    });
    if (surveyRes.status !== 201) {
        console.error('Failed to create survey', surveyRes.body);
        process.exit(1);
    }
    const surveyId = surveyRes.body.id;
    const survey = surveyRes.body;
    // Activate
    await prisma.survey.update({ where: { id: surveyId }, data: { status: 'ACTIVE' } });
    // Submit response
    const responseRes = await (0, supertest_1.default)(app)
        .post('/api/responses')
        .send({
        surveyId,
        answers: [
            { questionId: survey.questions[0].id, payload: { optionId: survey.questions[0].options[0].id } },
            { questionId: survey.questions[1].id, payload: { rankings: [{ optionId: survey.questions[1].options[0].id, rank: 1 }, { optionId: survey.questions[1].options[1].id, rank: 2 }] } }
        ]
    });
    if (responseRes.status !== 201) {
        console.error('Failed to submit response', responseRes.body);
        process.exit(1);
    }
    // Aggregate
    const aggRes = await (0, supertest_1.default)(app).get(`/api/responses/survey/${surveyId}/aggregate`);
    if (aggRes.status !== 200) {
        console.error('Failed to aggregate', aggRes.body);
        process.exit(1);
    }
    console.log('Aggregate sample:', aggRes.body);
    await prisma.$disconnect();
})();
