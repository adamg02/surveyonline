# Render.com Deployment Guide

## Overview
This guide explains how to deploy the SurveyOnline platform to Render.com using the included blueprint configuration.

## Prerequisites
- GitHub repository with the survey platform code
- Render.com account
- Basic understanding of cloud deployments

## Deployment Steps

### 1. Fork/Clone Repository
```bash
git clone https://github.com/your-username/surveyonline.git
cd surveyonline
```

### 2. Deploy to Render

#### Option A: Blueprint + Manual Frontend (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Select the repository containing the survey platform
5. Render will detect the `render.yaml` file and create:
   - **surveyonline-api**: Backend Node.js service
   - **surveyonline-db**: PostgreSQL database
6. After blueprint deployment completes, manually add the frontend:
   - Click "New" → "Static Site"
   - Connect the same GitHub repository
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `./client/dist`
   - **Environment Variable**: `VITE_API_URL=https://surveyonline-api.onrender.com`
   - **Redirect Rule**: `/*` → `/index.html` (rewrite)

#### Option B: Full Manual Deployment
Follow the complete step-by-step guide in `MANUAL_DEPLOYMENT.md`

### 3. Configure Environment Variables
The blueprint automatically sets up most environment variables, but you may want to customize:

**Backend Environment Variables:**
- `ADMIN_EMAIL`: Admin user email (default: admin@example.com)
- `ADMIN_PASSWORD`: Auto-generated secure password
- `JWT_SECRET`: Auto-generated secure secret
- `DATABASE_URL`: Auto-configured PostgreSQL connection
- `FRONTEND_URL`: Frontend domain for CORS (set to your frontend URL)

**Frontend Environment Variables:**
- `VITE_API_URL`: Automatically set to backend service URL

### 4. Deploy
1. Click "Apply" to start the deployment
2. Render will:
   - Create the PostgreSQL database
   - Build and deploy the backend service
   - Run database migrations
   - Seed the database with admin user
   - Build and deploy the frontend static site

### 5. Access Your Application
Once deployment is complete:
- **Frontend**: https://surveyonline-frontend.onrender.com
- **Backend API**: https://surveyonline-api.onrender.com
- **Admin Panel**: Use the auto-generated admin credentials

## Service Details

### Backend Service (surveyonline-api)
- **Runtime**: Node.js
- **Build**: TypeScript compilation + Prisma generation
- **Database**: PostgreSQL with automatic migrations
- **Health Check**: `/api/health` endpoint
- **Scaling**: Starts with 1 instance, can be scaled up

### Frontend Service (surveyonline-frontend)
- **Type**: Static site (React SPA)
- **Build**: Vite production build
- **CDN**: Automatically served from Render's global CDN
- **SPA Routing**: Configured for client-side routing

### Database (surveyonline-db)
- **Type**: PostgreSQL 14+
- **Plan**: Starter (can be upgraded)
- **Backups**: Automatic daily backups
- **Connection**: Secure SSL connection

## Production Features

### Security
- **HTTPS**: Automatic SSL certificates
- **CORS**: Configured for production domains
- **JWT**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds

### Performance
- **CDN**: Frontend served from global CDN
- **Compression**: Automatic gzip compression
- **Database Indexing**: Optimized Prisma schema
- **Health Checks**: Automatic service monitoring

### Monitoring
- **Logs**: Real-time application logs
- **Metrics**: Service performance metrics
- **Alerts**: Automatic failure notifications
- **Health Checks**: Continuous uptime monitoring

## Environment Configuration

### Development vs Production
The application automatically adapts based on `NODE_ENV`:

**Development (NODE_ENV=development):**
- SQLite database
- Detailed error messages
- Development CORS settings
- Debug logging

**Production (NODE_ENV=production):**
- PostgreSQL database
- Generic error messages
- Secure CORS settings
- Production logging

### Database Migration
The application uses Prisma for database management:
- **Development**: `prisma migrate dev`
- **Production**: `prisma migrate deploy`

Schema changes are automatically applied during deployment.

## Custom Domain Setup

### 1. Configure Domain in Render
1. Go to your service settings
2. Add your custom domain
3. Configure DNS settings as instructed

### 2. Update Environment Variables
Update the frontend's `VITE_API_URL` if using a custom API domain.

### 3. Update CORS Settings
The backend automatically allows CORS requests from:
- Your configured `FRONTEND_URL` environment variable
- Any `https://surveyonline-*.onrender.com` domain
- Specific hardcoded domains in `src/app.ts`

If you have a custom frontend domain, update the `FRONTEND_URL` environment variable in your backend service.

## Scaling and Performance

### Vertical Scaling
- Upgrade service plans for more CPU/RAM
- Database can be scaled independently

### Horizontal Scaling
- Frontend is automatically scaled (CDN)
- Backend can be scaled to multiple instances
- Database connection pooling handles multiple instances

### Performance Optimization
- Enable Redis for session storage (optional)
- Add database read replicas (higher plans)
- Implement caching strategies

## Troubleshooting

### Common Issues

**Build Failures:**
- Check build logs in Render dashboard
- Verify package.json scripts
- Ensure all dependencies are listed

**Database Connection Issues:**
- Verify DATABASE_URL environment variable
- Check if migrations were applied
- Review database service status

**CORS Errors:**
- Verify frontend domain in CORS settings
- Update `FRONTEND_URL` environment variable with your actual frontend URL
- Check that your frontend URL matches the pattern `https://surveyonline-*.onrender.com`
- Ensure HTTPS is used in production

### Debugging Steps
1. Check service logs in Render dashboard
2. Verify environment variables are set
3. Test health check endpoints
4. Review database migration status

## Monitoring and Maintenance

### Regular Tasks
- Monitor service performance
- Review error logs
- Update dependencies
- Database maintenance (automatic)

### Backup Strategy
- Automatic daily database backups
- Download backups for additional safety
- Test restore procedures

### Security Updates
- Keep dependencies updated
- Monitor security advisories
- Rotate secrets periodically

## Cost Optimization

### Starter Plan Resources
- **Web Service**: $7/month (shared CPU, 512MB RAM)
- **Database**: $7/month (256MB RAM, 1GB storage)
- **Static Site**: Free tier available

### Scaling Costs
- Upgrade to higher plans as needed
- Monitor usage to optimize costs
- Use free tier for staging environments

## Support and Resources

### Render Resources
- [Render Documentation](https://render.com/docs)
- [Community Forum](https://community.render.com)
- [Status Page](https://status.render.com)

### Application Resources
- Check repository README for latest updates
- Review deployment logs for issues
- Contact support through Render dashboard

## Advanced Configuration

### Environment-Specific Settings
Create additional service configurations for:
- Staging environment
- Development previews
- Feature branch deployments

### CI/CD Integration
- Automatic deployments from main branch
- Pull request preview deployments
- Custom build and test workflows

### Database Optimization
- Connection pooling configuration
- Query optimization
- Index management
- Performance monitoring

This deployment configuration provides a production-ready survey platform with automatic scaling, monitoring, and maintenance!