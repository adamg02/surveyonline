# Quick Deployment Guide for Render.com

## Summary
Deploy in two steps: Blueprint for backend + manual static site for frontend.

## Step 1: Deploy Backend with Blueprint

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **New Blueprint**: Click "New" → "Blueprint"
3. **Connect Repository**: Link your GitHub repository
4. **Deploy**: Render will use `render.yaml` to create:
   - Backend API service
   - PostgreSQL database
   - Auto-configure environment variables

⏱️ **Wait Time**: 5-10 minutes for backend deployment

## Step 2: Deploy Frontend Manually

1. **New Static Site**: Click "New" → "Static Site"
2. **Same Repository**: Connect the same GitHub repository
3. **Configure**:
   ```
   Name: surveyonline-frontend
   Build Command: cd client && npm install && npm run build
   Publish Directory: ./client/dist
   ```
4. **Environment Variables**:
   ```
   VITE_API_URL=https://surveyonline-api.onrender.com
   ```
5. **Redirects/Rewrites**:
   ```
   Source: /*
   Destination: /index.html
   Action: Rewrite
   ```

⏱️ **Wait Time**: 3-5 minutes for frontend deployment

## Step 3: Verify Deployment

1. **API Health Check**: https://surveyonline-api.onrender.com/api/health
2. **Frontend**: https://surveyonline-frontend.onrender.com
3. **Login**: Check Render logs for auto-generated admin credentials

## Quick Commands for Verification

```bash
# Check API health
curl https://surveyonline-api.onrender.com/api/health

# Check if frontend loads
curl -I https://surveyonline-frontend.onrender.com
```

## Admin Credentials

After backend deployment, check the service logs for:
- **Email**: admin@example.com
- **Password**: [auto-generated, shown in logs]

## Troubleshooting

**Backend fails to start?**
- Check build logs for npm/TypeScript errors
- Verify database connection in environment variables

**Frontend shows blank page?**
- Check that VITE_API_URL is set correctly
- Verify redirects are configured for SPA routing

**CORS errors?**
- Ensure frontend domain is added to backend CORS config
- Check that HTTPS is being used

## Total Cost (Starter Plans)
- Backend API: $7/month
- Database: $7/month
- Frontend: Free
- **Total: $14/month**

## Next Steps
1. Configure custom domain (optional)
2. Set up monitoring
3. Scale services as needed