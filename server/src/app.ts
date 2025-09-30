import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { router as surveyRouter } from './routes/surveys';
import { router as responseRouter } from './routes/responses';
import { router as authRouter } from './routes/auth';

export const createApp = () => {
  const app = express();
  
  // CORS configuration
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
      ? [
          'https://surveyonline-frontend.onrender.com',
          'https://surveyonline-frontend-*.onrender.com' // for preview deployments
        ]
      : [
          'http://localhost:5173',
          'http://localhost:3000'
        ],
    credentials: true,
    optionsSuccessStatus: 200
  };
  
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  
  // Health check endpoint (required by Render)
  app.get('/health', (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));
  app.get('/api/health', (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));
  
  app.use('/api/auth', authRouter);
  app.use('/api/surveys', surveyRouter);
  app.use('/api/responses', responseRouter);
  return app;
};
