"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.router = void 0;
const express_1 = require("express");
const snowflake_1 = require("../db/snowflake");
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.router = (0, express_1.Router)();
// Role enum values
const Roles = { ADMIN: 'ADMIN', RESPONDENT: 'RESPONDENT' };
const registerSchema = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(6), role: zod_1.z.enum(['ADMIN', 'RESPONDENT']).optional() });
const loginSchema = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(1) });
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
exports.router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const { email, password, role } = parsed.data;
    try {
        const existing = await (0, snowflake_1.executeQuery)('SELECT * FROM USERS WHERE EMAIL = ?', [email]);
        if (existing.length > 0)
            return res.status(409).json({ error: 'Email already registered' });
        const hash = await bcryptjs_1.default.hash(password, 10);
        const userId = (0, snowflake_1.generateId)();
        await (0, snowflake_1.executeStatement)('INSERT INTO USERS (ID, EMAIL, PASSWORD, ROLE) VALUES (?, ?, ?, ?)', [userId, email, hash, role ?? 'RESPONDENT']);
        const user = await (0, snowflake_1.executeQuery)('SELECT * FROM USERS WHERE ID = ?', [userId]);
        const userData = user[0];
        const token = jsonwebtoken_1.default.sign({ sub: userData.ID, role: userData.ROLE }, JWT_SECRET, { expiresIn: '12h' });
        res.status(201).json({ token, user: { id: userData.ID, email: userData.EMAIL, role: userData.ROLE } });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Registration failed' });
    }
});
exports.router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const { email, password } = parsed.data;
    const user = await (0, snowflake_1.executeQuery)('SELECT * FROM USERS WHERE EMAIL = ?', [email]);
    if (user.length === 0)
        return res.status(401).json({ error: 'Invalid credentials' });
    const userData = user[0];
    const ok = await bcryptjs_1.default.compare(password, userData.PASSWORD);
    if (!ok)
        return res.status(401).json({ error: 'Invalid credentials' });
    const token = jsonwebtoken_1.default.sign({ sub: userData.ID, role: userData.ROLE }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: userData.ID, email: userData.EMAIL, role: userData.ROLE } });
});
const authMiddleware = (roles) => {
    return (req, res, next) => {
        const header = req.headers.authorization;
        if (!header)
            return res.status(401).json({ error: 'Missing auth' });
        const token = header.replace('Bearer ', '');
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            if (roles && !roles.includes(decoded.role))
                return res.status(403).json({ error: 'Forbidden' });
            req.user = decoded;
            next();
        }
        catch {
            return res.status(401).json({ error: 'Invalid token' });
        }
    };
};
exports.authMiddleware = authMiddleware;
