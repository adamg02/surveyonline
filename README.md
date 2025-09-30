# SurveyOnline

An online survey platform supporting multiple question types:

- Single code (single choice)
- Multi code (multiple choice)
- Open end (numeric + text)
- Multi open end (including exclusive answers)
- Ranking questions

## Features

✅ **Survey Builder**: Create surveys with multiple question types  
✅ **Authentication**: JWT-based authentication with admin/respondent roles  
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

- Backend: Node.js + Express + TypeScript + SQLite (via Prisma) for quick local dev (can swap to Postgres later)
- Frontend: React + Vite + TypeScript + @dnd-kit (drag and drop)

## Quick Start

1. Install dependencies
2. Generate Prisma client & migrate
3. Seed initial data (optional)
4. Run dev (concurrently runs server and client)

### Commands

From repository root:

- Install: `npm install`
- Apply initial migration & generate Prisma client: `npm run prisma:migrate --workspace=server`
- Seed database with admin user and sample survey: `npm run seed --workspace=server`
- Start backend only: `npm run dev:server`
- Start frontend only: `npm run dev:client`
- Start both: `npm run dev`

### Default Admin Credentials

After running the seed script:
- Email: `admin@example.com`
- Password: `admin123`

### API Endpoints

**Authentication:**
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user

**Surveys:**
- POST /api/surveys - Create survey with questions (Admin only)
- GET /api/surveys - List surveys
- GET /api/surveys/:id - Get survey (incl questions)
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

### Completed Features

- Authentication & roles ✅
- Survey CRUD operations ✅
- Response submission & validation ✅
- Admin controls (activate, clone, delete) ✅
- Export (CSV / JSON) ✅
- Drag and drop question reordering ✅
- Drag and drop ranking interface ✅
- Single question interface with progress tracking ✅
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
