"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
        const hash = await bcryptjs_1.default.hash(adminPassword, 10);
        await prisma.user.create({ data: { email: adminEmail, password: hash, role: 'ADMIN' } });
        console.log('Created admin:', adminEmail);
        if (process.env.NODE_ENV !== 'production') {
            console.log('Admin password:', adminPassword);
        }
    }
    else {
        console.log('Admin already exists');
    }
    const surveyCount = await prisma.survey.count();
    if (surveyCount === 0) {
        await prisma.survey.create({
            data: {
                title: 'Sample Product Feedback',
                description: 'Demo survey for seeding',
                status: 'ACTIVE',
                questions: {
                    create: [
                        { text: 'Overall satisfaction', type: client_1.QuestionType.RANKING, order: 0, isRequired: true, options: { create: [{ text: 'UI', order: 0 }, { text: 'Performance', order: 1 }, { text: 'Support', order: 2 }] } },
                        { text: 'Would you recommend us?', type: client_1.QuestionType.SINGLE_CHOICE, order: 1, isRequired: true, options: { create: [{ text: 'Yes', order: 0 }, { text: 'No', order: 1 }] } },
                        { text: 'Features you use', type: client_1.QuestionType.MULTI_CHOICE, order: 2, options: { create: [{ text: 'Dashboard', order: 0 }, { text: 'Exports', order: 1 }, { text: 'API', order: 2, isExclusive: false }] } },
                        { text: 'Any other comments', type: client_1.QuestionType.OPEN_END_TEXT, order: 3 },
                        { text: 'Monthly spend ($)', type: client_1.QuestionType.OPEN_END_NUMERIC, order: 4 },
                        { text: 'List up to 3 improvements', type: client_1.QuestionType.MULTI_OPEN_END, order: 5, openItems: { create: [{ label: 'Idea 1', order: 0 }, { label: 'Idea 2', order: 1 }, { label: 'Idea 3', order: 2 }] } }
                    ]
                }
            }
        });
        console.log('Seeded sample survey.');
    }
    else {
        console.log('Surveys already present, skipping sample survey.');
    }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
