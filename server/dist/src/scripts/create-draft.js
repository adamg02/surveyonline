"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function createDraftSurvey() {
    try {
        const draftSurvey = await prisma.survey.create({
            data: {
                title: 'Draft Survey - Test',
                description: 'This is a draft survey for testing',
                status: 'DRAFT',
                questions: {
                    create: [
                        {
                            text: 'What is your favorite color?',
                            type: 'SINGLE_CHOICE',
                            order: 0,
                            isRequired: true,
                            options: {
                                create: [
                                    { text: 'Red', order: 0 },
                                    { text: 'Blue', order: 1 },
                                    { text: 'Green', order: 2 }
                                ]
                            }
                        },
                        {
                            text: 'Any feedback?',
                            type: 'OPEN_END_TEXT',
                            order: 1,
                            isRequired: false
                        }
                    ]
                }
            },
            include: {
                questions: {
                    include: {
                        options: true
                    }
                }
            }
        });
        console.log('Created draft survey:', draftSurvey);
        // List all surveys to verify
        const allSurveys = await prisma.survey.findMany({
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true
            }
        });
        console.log('All surveys in database:');
        allSurveys.forEach((s) => {
            console.log(`- ${s.title} (${s.status}) - ID: ${s.id}`);
        });
    }
    catch (error) {
        console.error('Error creating draft survey:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
createDraftSurvey();
