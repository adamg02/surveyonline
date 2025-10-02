"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const snowflake_1 = require("../db/snowflake");
const auth_1 = require("./auth");
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
const optionSchema = zod_1.z.object({ text: zod_1.z.string(), code: zod_1.z.string().optional(), value: zod_1.z.number().optional(), isExclusive: zod_1.z.boolean().optional(), order: zod_1.z.number().int() });
const openItemSchema = zod_1.z.object({ label: zod_1.z.string(), code: zod_1.z.string().optional(), order: zod_1.z.number().int() });
const surveyCreateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    questions: zod_1.z.array(zod_1.z.object({
        text: zod_1.z.string().min(1),
        type: zod_1.z.enum([QuestionType.SINGLE_CHOICE, QuestionType.MULTI_CHOICE, QuestionType.OPEN_END_TEXT, QuestionType.OPEN_END_NUMERIC, QuestionType.MULTI_OPEN_END, QuestionType.RANKING]),
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
        const surveyId = (0, snowflake_1.generateId)();
        // Create the survey
        await (0, snowflake_1.executeStatement)('INSERT INTO SURVEYS (ID, TITLE, DESCRIPTION, STATUS) VALUES (?, ?, ?, ?)', [surveyId, title, description || null, 'DRAFT']);
        // Create questions with options and open items
        for (const q of questions) {
            const questionId = (0, snowflake_1.generateId)();
            await (0, snowflake_1.executeStatement)('INSERT INTO QUESTIONS (ID, SURVEY_ID, TEXT, TYPE, ORDER_NUM, IS_REQUIRED, CONFIG) VALUES (?, ?, ?, ?, ?, ?, ?)', [questionId, surveyId, q.text, q.type, q.order, q.isRequired || false, q.config ? JSON.stringify(q.config) : null]);
            // Add options
            if (q.options && q.options.length > 0) {
                for (const option of q.options) {
                    await (0, snowflake_1.executeStatement)('INSERT INTO OPTIONS (ID, QUESTION_ID, TEXT, CODE, VALUE, IS_EXCLUSIVE, ORDER_NUM) VALUES (?, ?, ?, ?, ?, ?, ?)', [(0, snowflake_1.generateId)(), questionId, option.text, option.code || null, option.value || null, option.isExclusive || false, option.order]);
                }
            }
            // Add open items
            if (q.openItems && q.openItems.length > 0) {
                for (const openItem of q.openItems) {
                    await (0, snowflake_1.executeStatement)('INSERT INTO OPEN_ITEMS (ID, QUESTION_ID, LABEL, CODE, ORDER_NUM) VALUES (?, ?, ?, ?, ?)', [(0, snowflake_1.generateId)(), questionId, openItem.label, openItem.code || null, openItem.order]);
                }
            }
        }
        // Fetch the created survey with all related data
        const survey = await getSurveyWithDetails(surveyId);
        res.status(201).json(survey);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create survey' });
    }
});
// Helper function to get survey with all details
async function getSurveyWithDetails(surveyId) {
    const surveys = await (0, snowflake_1.executeQuery)(`
    SELECT * FROM SURVEYS WHERE ID = ?
  `, [surveyId]);
    if (surveys.length === 0)
        return null;
    const survey = surveys[0];
    const questions = await (0, snowflake_1.executeQuery)(`
    SELECT * FROM QUESTIONS WHERE SURVEY_ID = ? ORDER BY ORDER_NUM
  `, [surveyId]);
    const questionsWithDetails = await Promise.all(questions.map(async (q) => {
        const options = await (0, snowflake_1.executeQuery)(`
      SELECT * FROM OPTIONS WHERE QUESTION_ID = ? ORDER BY ORDER_NUM
    `, [q.ID]);
        const openItems = await (0, snowflake_1.executeQuery)(`
      SELECT * FROM OPEN_ITEMS WHERE QUESTION_ID = ? ORDER BY ORDER_NUM
    `, [q.ID]);
        return {
            id: q.ID,
            text: q.TEXT,
            type: q.TYPE,
            order: q.ORDER_NUM,
            isRequired: q.IS_REQUIRED,
            config: q.CONFIG ? JSON.parse(q.CONFIG) : null,
            createdAt: q.CREATED_AT,
            updatedAt: q.UPDATED_AT,
            options: options.map((o) => ({
                id: o.ID,
                text: o.TEXT,
                code: o.CODE,
                value: o.VALUE,
                isExclusive: o.IS_EXCLUSIVE,
                order: o.ORDER_NUM
            })),
            openItems: openItems.map((oi) => ({
                id: oi.ID,
                label: oi.LABEL,
                code: oi.CODE,
                order: oi.ORDER_NUM
            }))
        };
    }));
    return {
        id: survey.ID,
        title: survey.TITLE,
        description: survey.DESCRIPTION,
        status: survey.STATUS,
        createdAt: survey.CREATED_AT,
        updatedAt: survey.UPDATED_AT,
        questions: questionsWithDetails
    };
}
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
    const whereClause = isAdmin ? '' : "WHERE STATUS = 'ACTIVE'";
    const surveys = await (0, snowflake_1.executeQuery)(`
    SELECT s.*, 
           (SELECT COUNT(*) FROM RESPONSES r WHERE r.SURVEY_ID = s.ID) as RESPONSE_COUNT
    FROM SURVEYS s 
    ${whereClause}
    ORDER BY s.CREATED_AT DESC
  `);
    const formattedSurveys = surveys.map((s) => ({
        id: s.ID,
        title: s.TITLE,
        description: s.DESCRIPTION,
        status: s.STATUS,
        createdAt: s.CREATED_AT,
        updatedAt: s.UPDATED_AT,
        _count: {
            responses: s.RESPONSE_COUNT
        }
    }));
    res.json(formattedSurveys);
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
    const survey = await getSurveyWithDetails(req.params.id);
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
        const existingSurvey = await (0, snowflake_1.executeQuery)('SELECT * FROM SURVEYS WHERE ID = ?', [id]);
        if (existingSurvey.length === 0) {
            return res.status(404).json({ error: 'Survey not found' });
        }
        if (existingSurvey[0].STATUS !== 'DRAFT') {
            return res.status(400).json({ error: 'Only DRAFT surveys can be edited' });
        }
        // Delete existing questions and related data
        const questionIds = await (0, snowflake_1.executeQuery)('SELECT ID FROM QUESTIONS WHERE SURVEY_ID = ?', [id]);
        const questionIdList = questionIds.map((q) => q.ID);
        // Delete in the correct order due to foreign key constraints
        for (const questionId of questionIdList) {
            await (0, snowflake_1.executeStatement)('DELETE FROM OPTIONS WHERE QUESTION_ID = ?', [questionId]);
            await (0, snowflake_1.executeStatement)('DELETE FROM OPEN_ITEMS WHERE QUESTION_ID = ?', [questionId]);
            await (0, snowflake_1.executeStatement)('DELETE FROM ANSWERS WHERE QUESTION_ID = ?', [questionId]);
        }
        await (0, snowflake_1.executeStatement)('DELETE FROM QUESTIONS WHERE SURVEY_ID = ?', [id]);
        // Update survey
        await (0, snowflake_1.executeStatement)('UPDATE SURVEYS SET TITLE = ?, DESCRIPTION = ?, UPDATED_AT = CURRENT_TIMESTAMP() WHERE ID = ?', [title, description || null, id]);
        // Create new questions
        for (const q of questions) {
            const questionId = (0, snowflake_1.generateId)();
            await (0, snowflake_1.executeStatement)('INSERT INTO QUESTIONS (ID, SURVEY_ID, TEXT, TYPE, ORDER_NUM, IS_REQUIRED, CONFIG) VALUES (?, ?, ?, ?, ?, ?, ?)', [questionId, id, q.text, q.type, q.order, q.isRequired || false, q.config ? JSON.stringify(q.config) : null]);
            // Add options
            if (q.options && q.options.length > 0) {
                for (const option of q.options) {
                    await (0, snowflake_1.executeStatement)('INSERT INTO OPTIONS (ID, QUESTION_ID, TEXT, CODE, VALUE, IS_EXCLUSIVE, ORDER_NUM) VALUES (?, ?, ?, ?, ?, ?, ?)', [(0, snowflake_1.generateId)(), questionId, option.text, option.code || null, option.value || null, option.isExclusive || false, option.order]);
                }
            }
            // Add open items
            if (q.openItems && q.openItems.length > 0) {
                for (const openItem of q.openItems) {
                    await (0, snowflake_1.executeStatement)('INSERT INTO OPEN_ITEMS (ID, QUESTION_ID, LABEL, CODE, ORDER_NUM) VALUES (?, ?, ?, ?, ?)', [(0, snowflake_1.generateId)(), questionId, openItem.label, openItem.code || null, openItem.order]);
                }
            }
        }
        // Fetch and return updated survey
        const updatedSurvey = await getSurveyWithDetails(id);
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
        await (0, snowflake_1.executeStatement)('UPDATE SURVEYS SET STATUS = ?, UPDATED_AT = CURRENT_TIMESTAMP() WHERE ID = ?', [status, req.params.id]);
        const updated = await (0, snowflake_1.executeQuery)('SELECT * FROM SURVEYS WHERE ID = ?', [req.params.id]);
        if (updated.length === 0) {
            return res.status(404).json({ error: 'Not found' });
        }
        res.json({
            id: updated[0].ID,
            title: updated[0].TITLE,
            description: updated[0].DESCRIPTION,
            status: updated[0].STATUS,
            createdAt: updated[0].CREATED_AT,
            updatedAt: updated[0].UPDATED_AT
        });
    }
    catch {
        res.status(404).json({ error: 'Not found' });
    }
});
// Delete survey (ADMIN) - cascades manually
exports.router.delete('/:id', (0, auth_1.authMiddleware)(['ADMIN']), async (req, res) => {
    const id = req.params.id;
    try {
        // Delete in the correct order due to foreign key constraints
        const questionIds = await (0, snowflake_1.executeQuery)('SELECT ID FROM QUESTIONS WHERE SURVEY_ID = ?', [id]);
        const responseIds = await (0, snowflake_1.executeQuery)('SELECT ID FROM RESPONSES WHERE SURVEY_ID = ?', [id]);
        // Delete answers first
        for (const question of questionIds) {
            await (0, snowflake_1.executeStatement)('DELETE FROM ANSWERS WHERE QUESTION_ID = ?', [question.ID]);
        }
        // Delete responses
        for (const response of responseIds) {
            await (0, snowflake_1.executeStatement)('DELETE FROM RESPONSES WHERE ID = ?', [response.ID]);
        }
        // Delete options and open items
        for (const question of questionIds) {
            await (0, snowflake_1.executeStatement)('DELETE FROM OPTIONS WHERE QUESTION_ID = ?', [question.ID]);
            await (0, snowflake_1.executeStatement)('DELETE FROM OPEN_ITEMS WHERE QUESTION_ID = ?', [question.ID]);
        }
        // Delete questions
        await (0, snowflake_1.executeStatement)('DELETE FROM QUESTIONS WHERE SURVEY_ID = ?', [id]);
        // Finally delete the survey
        await (0, snowflake_1.executeStatement)('DELETE FROM SURVEYS WHERE ID = ?', [id]);
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
    const original = await getSurveyWithDetails(id);
    if (!original)
        return res.status(404).json({ error: 'Not found' });
    try {
        const clonedSurveyId = (0, snowflake_1.generateId)();
        // Create the cloned survey
        await (0, snowflake_1.executeStatement)('INSERT INTO SURVEYS (ID, TITLE, DESCRIPTION, STATUS) VALUES (?, ?, ?, ?)', [clonedSurveyId, original.title + ' (Copy)', original.description, 'DRAFT']);
        // Clone questions with options and open items
        for (const q of original.questions) {
            const questionId = (0, snowflake_1.generateId)();
            await (0, snowflake_1.executeStatement)('INSERT INTO QUESTIONS (ID, SURVEY_ID, TEXT, TYPE, ORDER_NUM, IS_REQUIRED, CONFIG) VALUES (?, ?, ?, ?, ?, ?, ?)', [questionId, clonedSurveyId, q.text, q.type, q.order, q.isRequired, q.config ? JSON.stringify(q.config) : null]);
            // Clone options
            for (const option of q.options) {
                await (0, snowflake_1.executeStatement)('INSERT INTO OPTIONS (ID, QUESTION_ID, TEXT, CODE, VALUE, IS_EXCLUSIVE, ORDER_NUM) VALUES (?, ?, ?, ?, ?, ?, ?)', [(0, snowflake_1.generateId)(), questionId, option.text, option.code, option.value, option.isExclusive, option.order]);
            }
            // Clone open items
            for (const openItem of q.openItems) {
                await (0, snowflake_1.executeStatement)('INSERT INTO OPEN_ITEMS (ID, QUESTION_ID, LABEL, CODE, ORDER_NUM) VALUES (?, ?, ?, ?, ?)', [(0, snowflake_1.generateId)(), questionId, openItem.label, openItem.code, openItem.order]);
            }
        }
        const cloned = await getSurveyWithDetails(clonedSurveyId);
        res.status(201).json(cloned);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to clone survey' });
    }
});
// Export JSON (aggregate + survey meta)
exports.router.get('/:id/export.json', async (req, res) => {
    const id = req.params.id;
    const survey = await getSurveyWithDetails(id);
    if (!survey)
        return res.status(404).json({ error: 'Not found' });
    // Get all responses and answers
    const responses = await (0, snowflake_1.executeQuery)(`
    SELECT r.*, a.ID as ANSWER_ID, a.QUESTION_ID, a.PAYLOAD, a.CREATED_AT as ANSWER_CREATED_AT,
           u.EMAIL as USER_EMAIL
    FROM RESPONSES r
    LEFT JOIN ANSWERS a ON r.ID = a.RESPONSE_ID
    LEFT JOIN USERS u ON r.USER_ID = u.ID
    WHERE r.SURVEY_ID = ?
    ORDER BY r.CREATED_AT, a.CREATED_AT
  `, [id]);
    // Group responses and answers
    const responseMap = new Map();
    for (const row of responses) {
        if (!responseMap.has(row.ID)) {
            responseMap.set(row.ID, {
                id: row.ID,
                userId: row.USER_ID,
                userEmail: row.USER_EMAIL,
                createdAt: row.CREATED_AT,
                answers: []
            });
        }
        if (row.ANSWER_ID) {
            responseMap.get(row.ID).answers.push({
                id: row.ANSWER_ID,
                questionId: row.QUESTION_ID,
                payload: JSON.parse(row.PAYLOAD),
                createdAt: row.ANSWER_CREATED_AT
            });
        }
    }
    // Basic aggregate similar to responses route
    const result = {};
    for (const q of survey.questions) {
        const ans = Array.from(responseMap.values()).flatMap((r) => r.answers.filter((a) => a.questionId === q.id));
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
    const survey = await getSurveyWithDetails(id);
    if (!survey)
        return res.status(404).json({ error: 'Not found' });
    // Get all responses and answers
    const responses = await (0, snowflake_1.executeQuery)(`
    SELECT r.*, a.ID as ANSWER_ID, a.QUESTION_ID, a.PAYLOAD
    FROM RESPONSES r
    LEFT JOIN ANSWERS a ON r.ID = a.RESPONSE_ID
    WHERE r.SURVEY_ID = ?
    ORDER BY r.CREATED_AT, a.CREATED_AT
  `, [id]);
    const headers = ['responseId', 'userId', 'questionId', 'questionText', 'type', 'value'];
    const rows = [headers.join(',')];
    const questionMap = new Map(survey.questions.map((q) => [q.id, q]));
    for (const row of responses) {
        if (row.ANSWER_ID) {
            const q = questionMap.get(row.QUESTION_ID);
            let value;
            const payload = JSON.parse(row.PAYLOAD);
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
            const rowData = [row.ID, row.USER_ID || '', q.id, JSON.stringify(q.text), q.type, JSON.stringify(value)].map(v => String(v).replace(/\n/g, ' '));
            rows.push(rowData.join(','));
        }
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=survey-${id}.csv`);
    res.send(rows.join('\n'));
});
