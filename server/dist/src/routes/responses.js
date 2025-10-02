"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const snowflake_1 = require("../db/snowflake");
const zod_1 = require("zod");
exports.router = (0, express_1.Router)();
// Define the question types enum
const QuestionType = {
    SINGLE_CHOICE: 'SINGLE_CHOICE',
    MULTI_CHOICE: 'MULTI_CHOICE',
    OPEN_END_TEXT: 'OPEN_END_TEXT',
    OPEN_END_NUMERIC: 'OPEN_END_NUMERIC',
    MULTI_OPEN_END: 'MULTI_OPEN_END',
    RANKING: 'RANKING'
};
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
    // Get survey with questions, options, and open items
    const surveys = await (0, snowflake_1.executeQuery)('SELECT * FROM SURVEYS WHERE ID = ?', [surveyId]);
    if (surveys.length === 0)
        return res.status(404).json({ error: 'Survey not found' });
    const survey = surveys[0];
    if (survey.STATUS !== 'ACTIVE')
        return res.status(400).json({ error: 'Survey not active' });
    const questions = await (0, snowflake_1.executeQuery)('SELECT * FROM QUESTIONS WHERE SURVEY_ID = ?', [surveyId]);
    // Get options and open items for all questions
    const questionIds = questions.map((q) => q.ID);
    const options = questionIds.length > 0 ? await (0, snowflake_1.executeQuery)(`
    SELECT * FROM OPTIONS WHERE QUESTION_ID IN (${questionIds.map(() => '?').join(',')})
  `, questionIds) : [];
    const openItems = questionIds.length > 0 ? await (0, snowflake_1.executeQuery)(`
    SELECT * FROM OPEN_ITEMS WHERE QUESTION_ID IN (${questionIds.map(() => '?').join(',')})
  `, questionIds) : [];
    // Create lookup maps
    const questionMap = new Map(questions.map((q) => [q.ID, q]));
    const optionsByQuestion = new Map();
    const openItemsByQuestion = new Map();
    options.forEach((o) => {
        if (!optionsByQuestion.has(o.QUESTION_ID))
            optionsByQuestion.set(o.QUESTION_ID, []);
        optionsByQuestion.get(o.QUESTION_ID).push(o);
    });
    openItems.forEach((oi) => {
        if (!openItemsByQuestion.has(oi.QUESTION_ID))
            openItemsByQuestion.set(oi.QUESTION_ID, []);
        openItemsByQuestion.get(oi.QUESTION_ID).push(oi);
    });
    // Basic validation per answer
    for (const ans of answers) {
        const q = questionMap.get(ans.questionId);
        if (!q)
            return res.status(400).json({ error: `Invalid questionId ${ans.questionId}` });
        const qOptions = optionsByQuestion.get(ans.questionId) || [];
        const qOpenItems = openItemsByQuestion.get(ans.questionId) || [];
        if (q.TYPE === QuestionType.SINGLE_CHOICE) {
            if (!ans.payload.optionId || !qOptions.some((o) => o.ID === ans.payload.optionId)) {
                return res.status(400).json({ error: `Invalid option for question ${q.ID}` });
            }
        }
        else if (q.TYPE === QuestionType.MULTI_CHOICE) {
            if (!Array.isArray(ans.payload.optionIds))
                return res.status(400).json({ error: `optionIds required for question ${q.ID}` });
            const invalid = ans.payload.optionIds.some((id) => !qOptions.some((o) => o.ID === id));
            if (invalid)
                return res.status(400).json({ error: `Invalid optionIds for question ${q.ID}` });
            // Exclusive option logic: if an exclusive option chosen, must be alone
            const chosenExclusive = qOptions.filter((o) => o.IS_EXCLUSIVE && ans.payload.optionIds.includes(o.ID));
            if (chosenExclusive.length > 0 && ans.payload.optionIds.length > 1)
                return res.status(400).json({ error: `Exclusive option must be alone for question ${q.ID}` });
        }
        else if (q.TYPE === QuestionType.OPEN_END_TEXT) {
            if (typeof ans.payload.text !== 'string')
                return res.status(400).json({ error: `text required for question ${q.ID}` });
        }
        else if (q.TYPE === QuestionType.OPEN_END_NUMERIC) {
            if (typeof ans.payload.value !== 'number')
                return res.status(400).json({ error: `numeric value required for question ${q.ID}` });
        }
        else if (q.TYPE === QuestionType.MULTI_OPEN_END) {
            if (!Array.isArray(ans.payload.items))
                return res.status(400).json({ error: `items array required for question ${q.ID}` });
            for (const item of ans.payload.items) {
                if (!qOpenItems.some((oi) => oi.ID === item.openItemId))
                    return res.status(400).json({ error: `Invalid openItemId in question ${q.ID}` });
                if (typeof item.text !== 'string')
                    return res.status(400).json({ error: `text required for open item in question ${q.ID}` });
            }
        }
        else if (q.TYPE === QuestionType.RANKING) {
            if (!Array.isArray(ans.payload.rankings))
                return res.status(400).json({ error: `rankings required for question ${q.ID}` });
            const optionIds = qOptions.map((o) => o.ID);
            const providedIds = ans.payload.rankings.map((r) => r.optionId);
            // Ensure each ranking refers to a valid option and ranks are unique
            if (providedIds.some((id) => !optionIds.includes(id)))
                return res.status(400).json({ error: `Invalid optionId in rankings for question ${q.ID}` });
            const ranks = ans.payload.rankings.map((r) => r.rank);
            const uniqueRanks = new Set(ranks);
            if (ranks.length !== uniqueRanks.size)
                return res.status(400).json({ error: `Duplicate ranks in question ${q.ID}` });
            // Optional stricter rule: must rank all options sequentially 1..N
            if (ranks.length !== optionIds.length)
                return res.status(400).json({ error: `All options must be ranked for question ${q.ID}` });
            const expected = Array.from({ length: optionIds.length }, (_, i) => i + 1);
            if (!expected.every(v => ranks.includes(v)))
                return res.status(400).json({ error: `Ranks must be 1..${optionIds.length} with no gaps for question ${q.ID}` });
        }
    }
    // Ensure required questions are answered
    const requiredQuestions = questions.filter((q) => q.IS_REQUIRED);
    for (const rq of requiredQuestions) {
        const answered = answers.some(a => a.questionId === rq.ID);
        if (!answered)
            return res.status(400).json({ error: `Required question missing: ${rq.ID}` });
    }
    try {
        const responseId = (0, snowflake_1.generateId)();
        await (0, snowflake_1.executeStatement)('INSERT INTO RESPONSES (ID, SURVEY_ID, USER_ID) VALUES (?, ?, ?)', [responseId, surveyId, req.user?.sub || null]);
        // Insert answers
        for (const answer of answers) {
            await (0, snowflake_1.executeStatement)('INSERT INTO ANSWERS (ID, RESPONSE_ID, QUESTION_ID, PAYLOAD) VALUES (?, ?, ?, ?)', [(0, snowflake_1.generateId)(), responseId, answer.questionId, JSON.stringify(answer.payload)]);
        }
        const response = await (0, snowflake_1.executeQuery)('SELECT * FROM RESPONSES WHERE ID = ?', [responseId]);
        res.status(201).json({
            id: response[0].ID,
            surveyId: response[0].SURVEY_ID,
            userId: response[0].USER_ID,
            createdAt: response[0].CREATED_AT
        });
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
    const surveys = await (0, snowflake_1.executeQuery)('SELECT * FROM SURVEYS WHERE ID = ?', [req.params.surveyId]);
    if (surveys.length === 0)
        return res.status(404).json({ error: 'Survey not found' });
    const survey = surveys[0];
    // If not admin and survey is not ACTIVE, deny access to results
    if (!isAdmin && survey.STATUS !== 'ACTIVE') {
        return res.status(404).json({ error: 'Survey not found' });
    }
    const questions = await (0, snowflake_1.executeQuery)('SELECT * FROM QUESTIONS WHERE SURVEY_ID = ?', [req.params.surveyId]);
    const questionIds = questions.map((q) => q.ID);
    const options = questionIds.length > 0 ? await (0, snowflake_1.executeQuery)(`
    SELECT * FROM OPTIONS WHERE QUESTION_ID IN (${questionIds.map(() => '?').join(',')})
  `, questionIds) : [];
    const answers = questionIds.length > 0 ? await (0, snowflake_1.executeQuery)(`
    SELECT QUESTION_ID, PAYLOAD FROM ANSWERS 
    WHERE QUESTION_ID IN (${questionIds.map(() => '?').join(',')})
  `, questionIds) : [];
    const result = {};
    for (const q of questions) {
        const qAnswers = answers.filter((a) => a.QUESTION_ID === q.ID);
        if (q.TYPE === QuestionType.SINGLE_CHOICE) {
            const counts = {};
            qAnswers.forEach((a) => {
                const payload = JSON.parse(a.PAYLOAD);
                const id = payload.optionId;
                counts[id] = (counts[id] || 0) + 1;
            });
            result[q.ID] = { type: q.TYPE, counts };
        }
        else if (q.TYPE === QuestionType.MULTI_CHOICE) {
            const counts = {};
            qAnswers.forEach((a) => {
                const payload = JSON.parse(a.PAYLOAD);
                (payload.optionIds || []).forEach((id) => {
                    counts[id] = (counts[id] || 0) + 1;
                });
            });
            result[q.ID] = { type: q.TYPE, counts };
        }
        else if (q.TYPE === QuestionType.OPEN_END_TEXT) {
            result[q.ID] = {
                type: q.TYPE,
                texts: qAnswers.map((a) => JSON.parse(a.PAYLOAD).text)
            };
        }
        else if (q.TYPE === QuestionType.OPEN_END_NUMERIC) {
            const values = qAnswers.map((a) => JSON.parse(a.PAYLOAD).value).filter((v) => typeof v === 'number');
            const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
            result[q.ID] = {
                type: q.TYPE,
                count: values.length,
                average: avg,
                min: values.length ? Math.min(...values) : 0,
                max: values.length ? Math.max(...values) : 0
            };
        }
        else if (q.TYPE === QuestionType.MULTI_OPEN_END) {
            const items = {};
            qAnswers.forEach((a) => {
                const payload = JSON.parse(a.PAYLOAD);
                (payload.items || []).forEach((it) => {
                    if (!items[it.openItemId])
                        items[it.openItemId] = [];
                    items[it.openItemId].push(it.text);
                });
            });
            result[q.ID] = { type: q.TYPE, items };
        }
        else if (q.TYPE === QuestionType.RANKING) {
            const rankTallies = {};
            qAnswers.forEach((a) => {
                const payload = JSON.parse(a.PAYLOAD);
                (payload.rankings || []).forEach((r) => {
                    if (!rankTallies[r.optionId])
                        rankTallies[r.optionId] = {};
                    rankTallies[r.optionId][r.rank] = (rankTallies[r.optionId][r.rank] || 0) + 1;
                });
            });
            result[q.ID] = { type: q.TYPE, rankings: rankTallies };
        }
    }
    res.json(result);
});
