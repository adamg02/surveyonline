"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const surveys_1 = require("./routes/surveys");
const responses_1 = require("./routes/responses");
const auth_1 = require("./routes/auth");
const createApp = () => {
    const app = (0, express_1.default)();
    // CORS configuration
    const corsOptions = {
        origin: process.env.NODE_ENV === 'production'
            ? (origin, callback) => {
                // Allow requests with no origin (like mobile apps or curl requests)
                if (!origin)
                    return callback(null, true);
                // List of allowed origins
                const allowedOrigins = [
                    'https://surveyonline-frontend.onrender.com',
                    'https://surveyonline-ln66.onrender.com',
                    process.env.FRONTEND_URL
                ].filter(Boolean);
                // Check if origin is in allowed list or matches surveyonline pattern
                const isAllowed = allowedOrigins.includes(origin) ||
                    origin.match(/^https:\/\/surveyonline-[a-zA-Z0-9-]+\.onrender\.com$/);
                if (isAllowed) {
                    callback(null, true);
                }
                else {
                    callback(new Error('Not allowed by CORS'), false);
                }
            }
            : [
                'http://localhost:5173',
                'http://localhost:3000'
            ],
        credentials: true,
        optionsSuccessStatus: 200
    };
    app.use((0, cors_1.default)(corsOptions));
    app.use(express_1.default.json());
    app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
    // Health check endpoint (required by Render)
    app.get('/health', (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));
    app.get('/api/health', (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));
    app.use('/api/auth', auth_1.router);
    app.use('/api/surveys', surveys_1.router);
    app.use('/api/responses', responses_1.router);
    return app;
};
exports.createApp = createApp;
