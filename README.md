# SurveyOnline

An online survey platform supporting multiple question types:

- Single code (single choice)
- Multi code (multiple choice)
- Open end (numeric + text)
- Multi open end (including exclusive answers)
- Ranking questions

## Features

✅ **Survey Builder**: Create surveys with multiple question types  
✅ **Survey Editor**: Edit draft surveys with full modification capabilities  
✅ **Authentication**: JWT-based authentication with admin/respondent roles  
✅ **Access Control**: Anonymous users can only see and take ACTIVE surveys  
✅ **Survey Management**: Activate, clone, delete, and export surveys  
✅ **Response Collection**: Submit and validate survey responses  
✅ **Results & Analytics**: View aggregated survey results  
✅ **Drag & Drop Reordering**: Reorder questions and ranking options using modern drag and drop interface  
✅ **Interactive Ranking**: Drag and drop interface for ranking questions in survey taker  
✅ **Single Question Interface**: Show one question at a time with progress tracking and navigation  
✅ **Admin Controls**: Role-based access control and management features  
✅ **Export Functionality**: Export survey results as JSON or CSV  
✅ **Client-side Validation**: Form validation with error messaging  
✅ **Accessibility**: WCAG-compliant with keyboard navigation support  

## Stack

- Backend: Node.js + Express + TypeScript + Snowflake (cloud data warehouse)
- Frontend: React + Vite + TypeScript + @dnd-kit (drag and drop)

## Quick Start

### Prerequisites

1. **Snowflake Account**: You'll need a Snowflake account with appropriate permissions
2. **Environment Variables**: Configure Snowflake connection details

### Local Development

1. Install dependencies
2. Configure Snowflake environment variables
3. Set up database schema
4. Seed initial data (optional)
5. Run dev (concurrently runs server and client)

### Production Deployment

Deploy to Render.com in two steps:

1. **Blueprint Deployment**: Deploy backend using `render.yaml` (update Snowflake credentials)
2. **Manual Frontend**: Add static site for the React frontend

Quick start:
1. Fork this repository
2. Set up Snowflake database and credentials
3. Connect to [Render Dashboard](https://dashboard.render.com)
4. Create new Blueprint deployment
5. Configure Snowflake environment variables
6. Manually add Static Site for frontend

See `SNOWFLAKE_MIGRATION.md` for detailed migration information and `QUICK_DEPLOY.md` for step-by-step instructions.

### Commands

From repository root:

- Install: `npm install`
- Set up database schema: `npm run setup:db --workspace=server`
- Seed database with admin user and sample survey: `npm run seed --workspace=server`
- Start backend only: `npm run dev:server`
- Start frontend only: `npm run dev:client`
- Start both: `npm run dev`

### Configuration

Copy the environment example and configure your Snowflake credentials:

```bash
cp server/.env.example server/.env
```

Required environment variables:
```bash
SNOWFLAKE_ACCOUNT=your_account.region
SNOWFLAKE_USERNAME=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_DATABASE=SURVEYONLINE
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_ROLE=ACCOUNTADMIN
```

### Default Admin Credentials

After running the seed script:
- Email: `admin@example.com`
- Password: `admin123`

### Survey Management

**Creating Surveys:**
- Click "Create Survey" to build a new survey from scratch
- Add questions with drag & drop reordering
- Configure different question types and options

**Editing Draft Surveys:**
- Click "Edit" on any DRAFT survey to modify it
- Full editing capability - change questions, options, order, and settings
- Only DRAFT surveys can be edited (ACTIVE/CLOSED surveys are read-only)
- Changes are saved immediately when you click "Update Survey"

**Survey Status Management:**
- **DRAFT**: Editable, not available for responses, only visible to admins
- **ACTIVE**: Live for responses, read-only, visible to all users
- **CLOSED**: No longer accepting responses, read-only, only visible to admins

### Access Control

**Anonymous Users:**
- Can only see ACTIVE surveys in the survey list
- Can only take ACTIVE surveys
- Cannot view results, admin controls, or export data
- Cannot access DRAFT or CLOSED surveys

**Authenticated Respondents:**
- Same permissions as anonymous users
- Can register and login to track their responses

**Admin Users:**
- Full access to all surveys regardless of status
- Can create, edit, activate, close, clone, and delete surveys
- Can view results and export data for all surveys
- Can manage survey status and access controls

### API Endpoints

**Authentication:**
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user

**Surveys:**
- POST /api/surveys - Create survey with questions (Admin only)
- GET /api/surveys - List surveys
- GET /api/surveys/:id - Get survey (incl questions)
- PUT /api/surveys/:id - Update draft survey (Admin only)
- PATCH /api/surveys/:id/status - Set status DRAFT/ACTIVE/CLOSED (Admin only)
- POST /api/surveys/:id/clone - Clone survey (Admin only)
- DELETE /api/surveys/:id - Delete survey (Admin only)
- GET /api/surveys/:id/export - Export survey results as JSON/CSV (Admin only)

**Responses:**
- POST /api/responses - Submit answers
- GET /api/responses/survey/:surveyId/aggregate - Aggregated results

### Drag and Drop

The survey platform features comprehensive drag and drop functionality:

**Question Reordering (Builder):**
- **Visual Drag Handle**: Click and drag the ⋮⋮ handle to reorder questions
- **Smooth Animations**: Questions animate smoothly during reordering
- **Keyboard Support**: Full accessibility with keyboard navigation
- **Mobile Friendly**: Works on touch devices

**Ranking Options (Builder):**
- **Option Reordering**: Drag and drop to reorder ranking options
- **Clean Interface**: Simplified UI for ranking questions (no exclusive checkbox)
- **Real-time Updates**: Order updates immediately during drag operations

**Interactive Ranking (Survey Taker):**
- **Intuitive Ranking**: Drag items to rank them by preference
- **Visual Feedback**: Clear numbering shows current ranking (1st = most preferred)
- **Instructions**: Built-in guidance for users
- **Validation**: Ensures all items are ranked before submission

### Single Question Interface

The survey taker features a focused, one-question-at-a-time interface:

**Progress Tracking:**
- **Visual Progress Bar**: Animated progress indicator showing completion percentage
- **Question Counter**: Clear "Question X of Y" display
- **Navigation Controls**: Previous/Next buttons with validation

**User Experience:**
- **Reduced Cognitive Load**: Focus on one question at a time
- **Mobile Optimized**: Perfect for small screens and touch devices
- **Answer Preservation**: Navigate back and forth without losing answers
- **Smart Validation**: Per-question validation with helpful error messages

See `DRAG_DROP_README.md`, `RANKING_DRAG_DROP_README.md`, and `SINGLE_QUESTION_README.md` for detailed implementation notes.

### Beautiful Results Dashboard

The results page provides comprehensive analytics with stunning visualizations:

**Visual Analytics:**
- **Progress Bar Charts**: Clear percentage breakdowns for choice questions
- **Statistical Summaries**: Average, median, min, max for numeric responses
- **Ranking Analysis**: Average position rankings with detailed breakdowns
- **Text Response Collection**: Organized display of all text responses

**Design Features:**
- **Modern UI**: Clean, professional design with gradients and cards
- **Color-Coded Charts**: Distinct colors for different options and rankings
- **Responsive Layout**: Perfect display on desktop, tablet, and mobile
- **Loading States**: Smooth loading animations and error handling

**Data Insights:**
- **Total Response Count**: Clear overview of survey participation
- **Question-by-Question Analysis**: Detailed breakdown for each question type
- **Export Integration**: Quick access to JSON and CSV exports
- **Real-time Updates**: Fresh data on each page load

### Completed Features

- Authentication & roles ✅
- Access control for anonymous users ✅
- Survey CRUD operations ✅
- Survey editing for draft surveys ✅
- Response submission & validation ✅
- Admin controls (activate, clone, delete) ✅
- Export (CSV / JSON) ✅
- Drag and drop question reordering ✅
- Drag and drop ranking interface ✅
- Single question interface with progress tracking ✅
- Beautiful results dashboard with charts and analytics ✅
- Client-side validation ✅
- Accessibility improvements ✅
- Responsive design ✅

### Future Enhancements

- Pagination & filtering
- More robust validation & quotas
- Advanced analytics & data visualization
- Theming & improved UI/UX
- Automated tests (unit + integration + e2e)
- Real-time collaboration
- Survey templates
- Dark mode

## Deployment

### Render.com (Recommended)
- Blueprint deployment with `render.yaml` (configured for Snowflake)
- Automatic SSL certificates and CDN included
- Auto-scaling and monitoring
- **Note**: Requires manual Snowflake credentials configuration

### Manual Deployment
- Supports any Node.js hosting platform
- Snowflake database required for production
- Environment variables configuration needed

See `SNOWFLAKE_MIGRATION.md` for complete setup guide and `RENDER_DEPLOYMENT.md` for deployment instructions.

### Database Migration

This application has been migrated from PostgreSQL/Prisma to Snowflake for improved scalability and analytics capabilities. Key benefits:

- **Massive Scale**: Handle millions of survey responses
- **Real-time Analytics**: Built-in data warehousing capabilities
- **Cost Efficiency**: Pay-per-use pricing model
- **Advanced Features**: JSON support, time travel, data sharing

See `SNOWFLAKE_MIGRATION.md` for detailed migration information, schema changes, and setup instructions.
