"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.router = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
exports.router = (0, express_1.Router)();
// Role enum values from schema.prisma
const Roles = { ADMIN: 'ADMIN', RESPONDENT: 'RESPONDENT' };
const registerSchema = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(6), role: zod_1.z.nativeEnum(Roles).optional() });
const loginSchema = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(1) });
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
exports.router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const { email, password, role } = parsed.data;
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing)
            return res.status(409).json({ error: 'Email already registered' });
        const hash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma.user.create({ data: { email, password: hash, role: role ?? 'RESPONDENT' } });
        const token = jsonwebtoken_1.default.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
        res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
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
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
        return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcryptjs_1.default.compare(password, user.password);
    if (!ok)
        return res.status(401).json({ error: 'Invalid credentials' });
    const token = jsonwebtoken_1.default.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
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
