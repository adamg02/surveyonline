"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
exports.router = (0, express_1.Router)();
// Shape of answers per type
// SINGLE_CHOICE: { optionId }
// MULTI_CHOICE: { optionIds: [] }
// OPEN_END_TEXT: { text }
// OPEN_END_NUMERIC: { value }
// MULTI_OPEN_END: { items: [{ openItemId, text }] } (respect exclusive via option or config later)
// RANKING: { rankings: [{ optionId, rank }] }
const responseSchema = zod_1.z.object({
    surveyId: zod_1.z.string(),
    answers: zod_1.z.array(zod_1.z.object({
        questionId: zod_1.z.string(),
        payload: zod_1.z.any()
    })).min(1)
});
exports.router.post('/', async (req, res) => {
    const parsed = responseSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const { surveyId, answers } = parsed.data;
    const survey = await prisma.survey.findUnique({ where: { id: surveyId }, include: { questions: { include: { options: true, openItems: true } } } });
    if (!survey)
        return res.status(404).json({ error: 'Survey not found' });
    if (survey.status !== 'ACTIVE')
        return res.status(400).json({ error: 'Survey not active' });
    // Basic validation per answer
    for (const ans of answers) {
        const q = survey.questions.find(q => q.id === ans.questionId);
        if (!q)
            return res.status(400).json({ error: `Invalid questionId ${ans.questionId}` });
        // Track that this question has an answer for required check later
        ans._questionType = q.type;
        if (q.type === client_1.QuestionType.SINGLE_CHOICE) {
            if (!ans.payload.optionId || !q.options.some(o => o.id === ans.payload.optionId)) {
                return res.status(400).json({ error: `Invalid option for question ${q.id}` });
            }
        }
        else if (q.type === client_1.QuestionType.MULTI_CHOICE) {
            if (!Array.isArray(ans.payload.optionIds))
                return res.status(400).json({ error: `optionIds required for question ${q.id}` });
            const invalid = ans.payload.optionIds.some((id) => !q.options.some(o => o.id === id));
            if (invalid)
                return res.status(400).json({ error: `Invalid optionIds for question ${q.id}` });
            // Exclusive option logic: if an exclusive option chosen, must be alone
            const chosenExclusive = q.options.filter(o => o.isExclusive && ans.payload.optionIds.includes(o.id));
            if (chosenExclusive.length > 0 && ans.payload.optionIds.length > 1)
                return res.status(400).json({ error: `Exclusive option must be alone for question ${q.id}` });
        }
        else if (q.type === client_1.QuestionType.OPEN_END_TEXT) {
            if (typeof ans.payload.text !== 'string')
                return res.status(400).json({ error: `text required for question ${q.id}` });
        }
        else if (q.type === client_1.QuestionType.OPEN_END_NUMERIC) {
            if (typeof ans.payload.value !== 'number')
                return res.status(400).json({ error: `numeric value required for question ${q.id}` });
        }
        else if (q.type === client_1.QuestionType.MULTI_OPEN_END) {
            if (!Array.isArray(ans.payload.items))
                return res.status(400).json({ error: `items array required for question ${q.id}` });
            for (const item of ans.payload.items) {
                if (!q.openItems.some(oi => oi.id === item.openItemId))
                    return res.status(400).json({ error: `Invalid openItemId in question ${q.id}` });
                if (typeof item.text !== 'string')
                    return res.status(400).json({ error: `text required for open item in question ${q.id}` });
            }
        }
        else if (q.type === client_1.QuestionType.RANKING) {
            if (!Array.isArray(ans.payload.rankings))
                return res.status(400).json({ error: `rankings required for question ${q.id}` });
            const optionIds = q.options.map(o => o.id);
            const providedIds = ans.payload.rankings.map((r) => r.optionId);
            // Ensure each ranking refers to a valid option and ranks are unique
            if (providedIds.some((id) => !optionIds.includes(id)))
                return res.status(400).json({ error: `Invalid optionId in rankings for question ${q.id}` });
            const ranks = ans.payload.rankings.map((r) => r.rank);
            const uniqueRanks = new Set(ranks);
            if (ranks.length !== uniqueRanks.size)
                return res.status(400).json({ error: `Duplicate ranks in question ${q.id}` });
            // Optional stricter rule: must rank all options sequentially 1..N
            if (ranks.length !== optionIds.length)
                return res.status(400).json({ error: `All options must be ranked for question ${q.id}` });
            const expected = Array.from({ length: optionIds.length }, (_, i) => i + 1);
            if (!expected.every(v => ranks.includes(v)))
                return res.status(400).json({ error: `Ranks must be 1..${optionIds.length} with no gaps for question ${q.id}` });
        }
    }
    // Ensure required questions are answered
    const requiredQuestions = survey.questions.filter(q => q.isRequired);
    for (const rq of requiredQuestions) {
        const answered = answers.some(a => a.questionId === rq.id);
        if (!answered)
            return res.status(400).json({ error: `Required question missing: ${rq.id}` });
    }
    try {
        const response = await prisma.response.create({
            data: {
                surveyId,
                userId: req.user?.sub,
                answers: { create: answers.map((a) => ({ questionId: a.questionId, payload: a.payload })) }
            }
        });
        res.status(201).json(response);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to save response' });
    }
});
// Basic aggregated results endpoint
exports.router.get('/survey/:surveyId/aggregate', async (req, res) => {
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
    const survey = await prisma.survey.findUnique({ where: { id: req.params.surveyId }, include: { questions: { include: { options: true } } } });
    if (!survey)
        return res.status(404).json({ error: 'Survey not found' });
    // If not admin and survey is not ACTIVE, deny access to results
    if (!isAdmin && survey.status !== 'ACTIVE') {
        return res.status(404).json({ error: 'Survey not found' });
    }
    const answers = await prisma.answer.findMany({
        where: { question: { surveyId: survey.id } },
        select: { questionId: true, payload: true }
    });
    const result = {};
    for (const q of survey.questions) {
        const qAnswers = answers.filter(a => a.questionId === q.id);
        if (q.type === client_1.QuestionType.SINGLE_CHOICE) {
            const counts = {};
            qAnswers.forEach(a => { const id = a.payload.optionId; counts[id] = (counts[id] || 0) + 1; });
            result[q.id] = { type: q.type, counts };
        }
        else if (q.type === client_1.QuestionType.MULTI_CHOICE) {
            const counts = {};
            qAnswers.forEach(a => { (a.payload.optionIds || []).forEach((id) => { counts[id] = (counts[id] || 0) + 1; }); });
            result[q.id] = { type: q.type, counts };
        }
        else if (q.type === client_1.QuestionType.OPEN_END_TEXT) {
            result[q.id] = { type: q.type, texts: qAnswers.map(a => a.payload.text) };
        }
        else if (q.type === client_1.QuestionType.OPEN_END_NUMERIC) {
            const values = qAnswers.map(a => a.payload.value).filter((v) => typeof v === 'number');
            const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
            result[q.id] = { type: q.type, count: values.length, average: avg, min: Math.min(...values), max: Math.max(...values) };
        }
        else if (q.type === client_1.QuestionType.MULTI_OPEN_END) {
            const items = {};
            qAnswers.forEach(a => { (a.payload.items || []).forEach((it) => { if (!items[it.openItemId])
                items[it.openItemId] = []; items[it.openItemId].push(it.text); }); });
            result[q.id] = { type: q.type, items };
        }
        else if (q.type === client_1.QuestionType.RANKING) {
            const rankTallies = {};
            qAnswers.forEach(a => { (a.payload.rankings || []).forEach((r) => { if (!rankTallies[r.optionId])
                rankTallies[r.optionId] = {}; rankTallies[r.optionId][r.rank] = (rankTallies[r.optionId][r.rank] || 0) + 1; }); });
            result[q.id] = { type: q.type, rankings: rankTallies };
        }
    }
    res.json(result);
});
