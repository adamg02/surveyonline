# Access Control Implementation

This document describes the comprehensive access control system implemented in SurveyOnline to ensure anonymous users can only see and take ACTIVE surveys.

## Overview

The access control system provides three levels of access:
1. **Anonymous Users** - Can only see and take ACTIVE surveys
2. **Authenticated Respondents** - Same as anonymous users (with login tracking)
3. **Admin Users** - Full access to all surveys and administrative functions

## Backend Implementation

### Survey List Endpoint (`GET /api/surveys`)

```typescript
router.get('/', async (req: Request & { user?: any }, res: Response) => {
  // Check if user is authenticated and is admin
  const header = req.headers.authorization;
  let isAdmin = false;
  
  if (header) {
    try {
      const token = header.replace('Bearer ', '');
      const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      isAdmin = decoded.role === 'ADMIN';
    } catch {
      // Invalid token, treat as anonymous user
    }
  }
  
  // If admin, show all surveys; if anonymous/respondent, show only ACTIVE surveys
  const whereClause = isAdmin ? {} : { status: 'ACTIVE' };
  const surveys = await prisma.survey.findMany({ 
    where: whereClause,
    orderBy: { createdAt: 'desc' } 
  });
  res.json(surveys);
});
```

**Access Control:**
- **Anonymous/Respondent**: Only ACTIVE surveys returned
- **Admin**: All surveys returned (DRAFT, ACTIVE, CLOSED)

### Individual Survey Endpoint (`GET /api/surveys/:id`)

```typescript
router.get('/:id', async (req: Request & { user?: any }, res: Response) => {
  // Check authentication and admin status
  const isAdmin = checkAdminStatus(req);
  
  const survey = await prisma.survey.findUnique({ 
    where: { id: req.params.id }, 
    include: { questions: { include: { options: true, openItems: true } } } 
  });
  
  if (!survey) return res.status(404).json({ error: 'Not found' });
  
  // If not admin and survey is not ACTIVE, deny access
  if (!isAdmin && survey.status !== 'ACTIVE') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.json(survey);
});
```

**Access Control:**
- **Anonymous/Respondent**: Only ACTIVE surveys accessible
- **Admin**: All surveys accessible
- **Security**: Non-accessible surveys return 404 (not 403) to avoid information disclosure

### Results Endpoint (`GET /api/responses/survey/:surveyId/aggregate`)

```typescript
router.get('/survey/:surveyId/aggregate', async (req: Request & { user?: any }, res: Response) => {
  const isAdmin = checkAdminStatus(req);
  
  const survey = await prisma.survey.findUnique({ 
    where: { id: req.params.surveyId }, 
    include: { questions: { include: { options: true } } } 
  });
  
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  
  // If not admin and survey is not ACTIVE, deny access to results
  if (!isAdmin && survey.status !== 'ACTIVE') {
    return res.status(404).json({ error: 'Survey not found' });
  }
  
  // Continue with results aggregation...
});
```

**Access Control:**
- **Anonymous/Respondent**: Can only view results for ACTIVE surveys
- **Admin**: Can view results for all surveys

### Response Submission (`POST /api/responses`)

Already secured - only allows responses to ACTIVE surveys:

```typescript
if (survey.status !== 'ACTIVE') return res.status(400).json({ error: 'Survey not active' });
```

## Frontend Implementation

### Survey List Display

```tsx
{surveys.map(s => (
  <li key={s.id}>
    <span className="fw600">{s.title}</span>
    <span className={"status "+s.status}>{s.status}</span>
    
    {/* Admin-only controls */}
    {isAdmin && s.status === 'DRAFT' && <button onClick={() => editSurvey(s.id)}>Edit</button>}
    {isAdmin && s.status === 'DRAFT' && <button onClick={() => activateSurvey(s.id)}>Activate</button>}
    {isAdmin && <button onClick={() => cloneSurvey(s.id)}>Clone</button>}
    {isAdmin && <button onClick={() => deleteSurvey(s.id)}>Delete</button>}
    
    {/* Conditional Take button - only for ACTIVE surveys or admins */}
    {(s.status === 'ACTIVE' || isAdmin) && <button onClick={() => takeSurvey(s.id)}>Take</button>}
    
    {/* Admin-only results and exports */}
    {isAdmin && <button onClick={() => viewResults(s.id)}>Results</button>}
    {isAdmin && <a href={`/api/surveys/${s.id}/export.json`}>JSON</a>}
    {isAdmin && <a href={`/api/surveys/${s.id}/export.csv`}>CSV</a>}
  </li>
))}
```

### Empty State Messages

```tsx
{surveys.length === 0 && (
  <li>
    {isAdmin ? 'No surveys yet.' : 'No active surveys available. Please check back later.'}
  </li>
)}
```

**User Experience:**
- **Anonymous users**: See helpful message about no active surveys
- **Admins**: See standard "no surveys" message with option to create

## Security Features

### Authentication Checking

```typescript
const checkAdminStatus = (req: Request): boolean => {
  const header = req.headers.authorization;
  if (!header) return false;
  
  try {
    const token = header.replace('Bearer ', '');
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.role === 'ADMIN';
  } catch {
    return false;
  }
};
```

**Security Measures:**
- **Token Validation**: Proper JWT verification
- **Role Checking**: Explicit admin role verification
- **Graceful Degradation**: Invalid tokens treated as anonymous
- **No Information Leakage**: 404 responses instead of 403 for hidden resources

### Frontend Token Management

```typescript
// Attach token to axios requests
useEffect(() => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
}, [token]);
```

**Token Handling:**
- **Automatic Attachment**: Token added to all API requests
- **Clean Removal**: Token properly removed on logout
- **Persistent Storage**: Token saved to localStorage for session persistence

## Access Control Matrix

| Resource | Anonymous | Respondent | Admin |
|----------|-----------|------------|-------|
| Survey List | ACTIVE only | ACTIVE only | All surveys |
| Individual Survey | ACTIVE only | ACTIVE only | All surveys |
| Take Survey | ACTIVE only | ACTIVE only | All surveys |
| View Results | ACTIVE only* | ACTIVE only* | All surveys |
| Export Data | ❌ | ❌ | All surveys |
| Create Survey | ❌ | ❌ | ✅ |
| Edit Survey | ❌ | ❌ | DRAFT only |
| Manage Status | ❌ | ❌ | ✅ |
| Clone Survey | ❌ | ❌ | ✅ |
| Delete Survey | ❌ | ❌ | ✅ |

*Results viewing for non-admins is currently admin-only in the UI, but the API supports it for ACTIVE surveys.

## Testing Scenarios

### Anonymous User Flow
1. **Visit Homepage**: See only ACTIVE surveys
2. **Try to Access DRAFT Survey**: Receive 404 error
3. **Take ACTIVE Survey**: Successfully submit responses
4. **Try to View Results**: No results button visible
5. **Try Direct API Access**: Denied for non-ACTIVE surveys

### Admin User Flow
1. **Login as Admin**: Full survey list visible
2. **Access DRAFT Survey**: Successfully load for editing
3. **View Any Results**: Access granted to all survey results
4. **Export Data**: All export options available
5. **Manage Surveys**: Full CRUD operations available

### Respondent User Flow
1. **Login as Respondent**: Same as anonymous user
2. **Response Tracking**: Login provides session tracking
3. **Limited Access**: No additional permissions beyond anonymous

## Error Handling

### Backend Error Responses

```typescript
// Consistent 404 responses for unauthorized access
if (!isAdmin && survey.status !== 'ACTIVE') {
  return res.status(404).json({ error: 'Not found' });
}

// Clear error for invalid survey status
if (survey.status !== 'ACTIVE') {
  return res.status(400).json({ error: 'Survey not active' });
}
```

### Frontend Error Handling

```typescript
// Graceful degradation for missing permissions
const canViewResults = isAdmin;
const canTakeSurvey = survey.status === 'ACTIVE' || isAdmin;
const canEditSurvey = isAdmin && survey.status === 'DRAFT';
```

## Future Enhancements

### Potential Improvements
- **Fine-grained Permissions**: Role-based permissions beyond admin/respondent
- **Survey Visibility Settings**: Per-survey visibility controls
- **Time-based Access**: Survey scheduling with automatic activation
- **IP Restrictions**: Geographic or network-based access controls
- **Rate Limiting**: Response rate limiting per user/IP
- **Audit Logging**: Track all access attempts and permissions checks

### Advanced Features
- **Survey Sharing**: Share DRAFT surveys with specific users for preview
- **Collaboration**: Multiple admins with different permission levels
- **Public Links**: Generate public links for specific survey sharing
- **Embeddable Surveys**: Embed surveys in external websites with access control
- **API Keys**: Programmatic access with controlled permissions