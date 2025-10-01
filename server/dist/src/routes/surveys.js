"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("./auth");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
exports.router = (0, express_1.Router)();
const optionSchema = zod_1.z.object({ text: zod_1.z.string(), code: zod_1.z.string().optional(), value: zod_1.z.number().optional(), isExclusive: zod_1.z.boolean().optional(), order: zod_1.z.number().int() });
const openItemSchema = zod_1.z.object({ label: zod_1.z.string(), code: zod_1.z.string().optional(), order: zod_1.z.number().int() });
const surveyCreateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    questions: zod_1.z.array(zod_1.z.object({
        text: zod_1.z.string().min(1),
        type: zod_1.z.nativeEnum(client_1.QuestionType),
        order: zod_1.z.number().int().nonnegative(),
        isRequired: zod_1.z.boolean().optional(),
        config: zod_1.z.any().optional(),
        options: zod_1.z.array(optionSchema).optional().default([]),
        openItems: zod_1.z.array(openItemSchema).optional().default([])
    })).min(1)
});
exports.router.post('/', (0, auth_1.authMiddleware)(['ADMIN']), async (req, res) => {
    const parsed = surveyCreateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { title, description, questions } = parsed.data;
    try {
        const survey = await prisma.survey.create({
            data: {
                title, description,
                questions: {
                    create: questions.map((q) => {
                        const options = Array.isArray(q.options) && q.options.length > 0
                            ? { create: q.options.map((o) => ({ text: o.text, code: o.code, value: o.value, isExclusive: o.isExclusive ?? false, order: o.order })) }
                            : undefined;
                        const openItems = Array.isArray(q.openItems) && q.openItems.length > 0
                            ? { create: q.openItems.map((oi) => ({ label: oi.label, code: oi.code, order: oi.order })) }
                            : undefined;
                        return {
                            text: q.text,
                            type: q.type,
                            order: q.order,
                            isRequired: q.isRequired ?? false,
                            config: q.config,
                            options,
                            openItems
                        };
                    })
                }
            },
            include: { questions: { include: { options: true, openItems: true } } }
        });
        res.status(201).json(survey);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create survey' });
    }
});
exports.router.get('/', async (req, res) => {
    // Check if user is authenticated and is admin
    const header = req.headers.authorization;
    let isAdmin = false;
    if (header) {
        try {
            const token = header.replace('Bearer ', '');
            const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, JWT_SECRET);
            isAdmin = decoded.role === 'ADMIN';
        }
        catch {
            // Invalid token, treat as anonymous user
        }
    }
    // If admin, show all surveys; if anonymous/respondent, show only ACTIVE surveys
    const whereClause = isAdmin ? {} : { status: 'ACTIVE' };
    const surveys = await prisma.survey.findMany({
        where: whereClause,
        include: {
            _count: {
                select: {
                    responses: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    res.json(surveys);
});
exports.router.get('/:id', async (req, res) => {
    // Check if user is authenticated and is admin
    const header = req.headers.authorization;
    let isAdmin = false;
    if (header) {
        try {
            const token = header.replace('Bearer ', '');
            const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, JWT_SECRET);
            isAdmin = decoded.role === 'ADMIN';
        }
        catch {
            // Invalid token, treat as anonymous user
        }
    }
    const survey = await prisma.survey.findUnique({
        where: { id: req.params.id },
        include: { questions: { include: { options: true, openItems: true } } }
    });
    if (!survey)
        return res.status(404).json({ error: 'Not found' });
    // If not admin and survey is not ACTIVE, deny access
    if (!isAdmin && survey.status !== 'ACTIVE') {
        return res.status(404).json({ error: 'Not found' });
    }
    res.json(survey);
});
// Update survey (ADMIN) - only DRAFT surveys can be edited
exports.router.put('/:id', (0, auth_1.authMiddleware)(['ADMIN']), async (req, res) => {
    const parsed = surveyCreateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { title, description, questions } = parsed.data;
    const id = req.params.id;
    try {
        // Check if survey exists and is DRAFT
        const existingSurvey = await prisma.survey.findUnique({ where: { id } });
        if (!existingSurvey) {
            return res.status(404).json({ error: 'Survey not found' });
        }
        if (existingSurvey.status !== 'DRAFT') {
            return res.status(400).json({ error: 'Only DRAFT surveys can be edited' });
        }
        // Delete existing questions and related data
        const questionIds = (await prisma.question.findMany({ where: { surveyId: id }, select: { id: true } })).map((q) => q.id);
        await prisma.$transaction([
            // Delete related data first
            prisma.option.deleteMany({ where: { questionId: { in: questionIds } } }),
            prisma.openItem.deleteMany({ where: { questionId: { in: questionIds } } }),
            prisma.question.deleteMany({ where: { surveyId: id } }),
            // Update survey with new data
            prisma.survey.update({
                where: { id },
                data: {
                    title,
                    description,
                    questions: {
                        create: questions.map((q) => {
                            const options = Array.isArray(q.options) && q.options.length > 0
                                ? { create: q.options.map((o) => ({ text: o.text, code: o.code, value: o.value, isExclusive: o.isExclusive ?? false, order: o.order })) }
                                : undefined;
                            const openItems = Array.isArray(q.openItems) && q.openItems.length > 0
                                ? { create: q.openItems.map((oi) => ({ label: oi.label, code: oi.code, order: oi.order })) }
                                : undefined;
                            return {
                                text: q.text,
                                type: q.type,
                                order: q.order,
                                isRequired: q.isRequired ?? false,
                                config: q.config,
                                options,
                                openItems
                            };
                        })
                    }
                }
            })
        ]);
        // Fetch and return updated survey
        const updatedSurvey = await prisma.survey.findUnique({
            where: { id },
            include: { questions: { include: { options: true, openItems: true } } }
        });
        res.json(updatedSurvey);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update survey' });
    }
});
exports.router.patch('/:id/status', async (req, res) => {
    const status = req.body.status;
    if (!['DRAFT', 'ACTIVE', 'CLOSED'].includes(status))
        return res.status(400).json({ error: 'Invalid status' });
    try {
        const updated = await prisma.survey.update({ where: { id: req.params.id }, data: { status } });
        res.json(updated);
    }
    catch {
        res.status(404).json({ error: 'Not found' });
    }
});
// Delete survey (ADMIN) - cascades manually
exports.router.delete('/:id', (0, auth_1.authMiddleware)(['ADMIN']), async (req, res) => {
    const id = req.params.id;
    try {
        // Delete answers/responses first due to relations
        const questionIds = (await prisma.question.findMany({ where: { surveyId: id }, select: { id: true } })).map((q) => q.id);
        const responseIds = (await prisma.response.findMany({ where: { surveyId: id }, select: { id: true } })).map((r) => r.id);
        await prisma.$transaction([
            prisma.answer.deleteMany({ where: { questionId: { in: questionIds } } }),
            prisma.response.deleteMany({ where: { id: { in: responseIds } } }),
            prisma.option.deleteMany({ where: { questionId: { in: questionIds } } }),
            prisma.openItem.deleteMany({ where: { questionId: { in: questionIds } } }),
            prisma.question.deleteMany({ where: { surveyId: id } }),
            prisma.survey.delete({ where: { id } })
        ]);
        res.status(204).send();
    }
    catch (e) {
        console.error(e);
        res.status(404).json({ error: 'Not found or failed delete' });
    }
});
// Clone survey (ADMIN)
exports.router.post('/:id/clone', (0, auth_1.authMiddleware)(['ADMIN']), async (req, res) => {
    const id = req.params.id;
    const original = await prisma.survey.findUnique({ where: { id }, include: { questions: { include: { options: true, openItems: true } } } });
    if (!original)
        return res.status(404).json({ error: 'Not found' });
    const cloned = await prisma.survey.create({
        data: {
            title: original.title + ' (Copy)',
            description: original.description,
            status: 'DRAFT',
            questions: {
                create: original.questions.map((q) => ({
                    text: q.text,
                    type: q.type,
                    order: q.order,
                    isRequired: q.isRequired,
                    config: q.config,
                    options: q.options.length ? { create: q.options.map((o) => ({ text: o.text, code: o.code, value: o.value, isExclusive: o.isExclusive, order: o.order })) } : undefined,
                    openItems: q.openItems.length ? { create: q.openItems.map((oi) => ({ label: oi.label, code: oi.code, order: oi.order })) } : undefined
                }))
            }
        },
        include: { questions: { include: { options: true, openItems: true } } }
    });
    res.status(201).json(cloned);
});
// Export JSON (aggregate + survey meta)
exports.router.get('/:id/export.json', async (req, res) => {
    const id = req.params.id;
    const survey = await prisma.survey.findUnique({ where: { id }, include: { questions: { include: { options: true, openItems: true } }, responses: { include: { answers: true, user: true } } } });
    if (!survey)
        return res.status(404).json({ error: 'Not found' });
    // Basic aggregate similar to responses route
    const result = {};
    for (const q of survey.questions) {
        const ans = survey.responses.flatMap((r) => r.answers.filter((a) => a.questionId === q.id));
        if (q.type === 'SINGLE_CHOICE') {
            const counts = {};
            ans.forEach((a) => { const idOpt = a.payload.optionId; counts[idOpt] = (counts[idOpt] || 0) + 1; });
            result[q.id] = { counts };
        }
        else if (q.type === 'MULTI_CHOICE') {
            const counts = {};
            ans.forEach((a) => { (a.payload.optionIds || []).forEach((oid) => { counts[oid] = (counts[oid] || 0) + 1; }); });
            result[q.id] = { counts };
        }
        else if (q.type === 'OPEN_END_TEXT') {
            result[q.id] = { texts: ans.map((a) => a.payload.text) };
        }
        else if (q.type === 'OPEN_END_NUMERIC') {
            const values = ans.map((a) => a.payload.value).filter((v) => typeof v === 'number');
            result[q.id] = { count: values.length, avg: values.reduce((s, v) => s + v, 0) / (values.length || 1) };
        }
        else if (q.type === 'MULTI_OPEN_END') {
            const items = {};
            ans.forEach((a) => { (a.payload.items || []).forEach((it) => { if (!items[it.openItemId])
                items[it.openItemId] = []; items[it.openItemId].push(it.text); }); });
            result[q.id] = { items };
        }
        else if (q.type === 'RANKING') {
            const tallies = {};
            ans.forEach((a) => { (a.payload.rankings || []).forEach((r) => { if (!tallies[r.optionId])
                tallies[r.optionId] = {}; tallies[r.optionId][r.rank] = (tallies[r.optionId][r.rank] || 0) + 1; }); });
            result[q.id] = { rankings: tallies };
        }
    }
    res.json({ survey: { id: survey.id, title: survey.title, description: survey.description }, aggregate: result });
});
// Export CSV of flattened answers
exports.router.get('/:id/export.csv', async (req, res) => {
    const id = req.params.id;
    const survey = await prisma.survey.findUnique({ where: { id }, include: { questions: true, responses: { include: { answers: true } } } });
    if (!survey)
        return res.status(404).json({ error: 'Not found' });
    const headers = ['responseId', 'userId', 'questionId', 'questionText', 'type', 'value'];
    const rows = [headers.join(',')];
    const questionMap = new Map(survey.questions.map((q) => [q.id, q]));
    for (const response of survey.responses) {
        for (const ans of response.answers) {
            const q = questionMap.get(ans.questionId);
            let value;
            const payload = ans.payload;
            switch (q.type) {
                case 'SINGLE_CHOICE':
                    value = payload.optionId;
                    break;
                case 'MULTI_CHOICE':
                    value = (payload.optionIds || []).join('|');
                    break;
                case 'OPEN_END_TEXT':
                    value = JSON.stringify(payload.text || '');
                    break;
                case 'OPEN_END_NUMERIC':
                    value = String(payload.value ?? '');
                    break;
                case 'MULTI_OPEN_END':
                    value = JSON.stringify(payload.items || []);
                    break;
                case 'RANKING':
                    value = JSON.stringify(payload.rankings || []);
                    break;
                default: value = '';
            }
            const row = [response.id, response.userId || '', q.id, JSON.stringify(q.text), q.type, JSON.stringify(value)].map(v => String(v).replace(/\n/g, ' '));
            rows.push(row.join(','));
        }
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=survey-${id}.csv`);
    res.send(rows.join('\n'));
});
