# Manual Render.com Deployment Guide

If the blueprint deployment doesn't work, follow these manual steps:

## Step 1: Create Database

1. Go to Render Dashboard → New → PostgreSQL
2. Name: `surveyonline-db`
3. Database Name: `surveyonline`
4. User: `surveyonline_user`
5. Plan: Starter
6. Create Database
7. Copy the **Internal Database URL** for later

## Step 2: Deploy Backend API

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name**: `surveyonline-api`
   - **Runtime**: Node
   - **Build Command**: `cd server && npm install && npx prisma generate && npm run build`
   - **Start Command**: `cd server && npx prisma migrate deploy && npm run seed:prod && npm start`
   - **Plan**: Starter

4. Environment Variables:
   ```
   NODE_ENV=production
   DATABASE_PROVIDER=postgresql
   DATABASE_URL=[paste internal database URL from step 1]
   JWT_SECRET=[generate random 64 character string]
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=[generate secure password]
   ```

5. Advanced Settings:
   - **Health Check Path**: `/api/health`
   - **Auto Deploy**: Yes

6. Create Web Service

## Step 3: Deploy Frontend

1. Go to Render Dashboard → New → Static Site
2. Connect your GitHub repository
3. Configure:
   - **Name**: `surveyonline-frontend`
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `./client/dist`

4. Environment Variables:
   ```
   VITE_API_URL=https://surveyonline-api.onrender.com
   ```

5. Redirects/Rewrites:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: Rewrite

6. Create Static Site

## Step 4: Verify Deployment

1. Wait for all services to deploy (5-10 minutes)
2. Check API health: `https://surveyonline-api.onrender.com/api/health`
3. Open frontend: `https://surveyonline-frontend.onrender.com`
4. Login with admin credentials
5. Test creating and taking surveys

## Troubleshooting

### Backend Issues
- Check build logs for npm/TypeScript errors
- Verify all environment variables are set
- Check database connection string format
- Ensure Prisma migrations run successfully

### Frontend Issues
- Verify build command includes client directory
- Check that VITE_API_URL is correctly set
- Ensure redirects are configured for SPA routing
- Verify the publish directory path

### Database Issues
- Check that DATABASE_URL includes all connection parameters
- Verify database credentials are correct
- Ensure database allows connections from Render
- Check migration logs for schema issues

## Environment Variables Reference

### Backend (surveyonline-api)
```bash
NODE_ENV=production
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
JWT_SECRET=your-super-secure-64-character-secret-key-here
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YourSecurePassword123!
```

### Frontend (surveyonline-frontend)
```bash
VITE_API_URL=https://surveyonline-api.onrender.com
```

## Cost Breakdown (Starter Plans)

- **Web Service (API)**: $7/month
- **Static Site (Frontend)**: Free
- **PostgreSQL Database**: $7/month
- **Total**: $14/month

## Next Steps

1. Configure custom domain (optional)
2. Set up monitoring and alerts
3. Configure backup schedules
4. Scale services as needed
5. Set up staging environment

## Support

If you encounter issues:
1. Check Render's service logs
2. Review environment variables
3. Test endpoints individually
4. Contact Render support if needed