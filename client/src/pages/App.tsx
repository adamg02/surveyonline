import React, { useEffect, useState } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  PlayArrow as PlayArrowIcon,
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
  Poll as PollIcon,
  GetApp as GetAppIcon,
  Refresh as RefreshIcon,
  ExitToApp as ExitToAppIcon,
} from '@mui/icons-material';
import { theme } from '../theme';
import { SurveyBuilder } from '../components/SurveyBuilder';
import { SurveyEditor } from '../components/SurveyEditor';
import { SurveyTaker } from '../components/SurveyTaker';
import { SurveyResults } from '../components/SurveyResults';
import axios from '../lib/axios';

export interface SurveySummary { 
  id: string; 
  title: string; 
  status: string; 
  _count?: { 
    responses: number; 
  }; 
}

type View = 'list'|'builder'|'editor'|'take'|'results'|'auth';
interface AuthUser { id: string; email: string; role: string; }

export const App: React.FC = () => {
  const [view, setView] = useState<View>('list');
  const [surveys, setSurveys] = useState<SurveySummary[]>([]);
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('authUser');
    return raw ? JSON.parse(raw) : null;
  });
  const [authMode, setAuthMode] = useState<'login'|'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState('ADMIN');
  const [authError, setAuthError] = useState<string | null>(null);
  const isAdmin = user?.role === 'ADMIN';

  const loadSurveys = async () => {
    const res = await axios.get('/api/surveys');
    setSurveys(res.data);
  };

  useEffect(() => { loadSurveys(); }, []);

  // Attach token to axios
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const handleLogout = () => {
    setToken(null); setUser(null); localStorage.removeItem('authToken'); localStorage.removeItem('authUser');
  };

  const submitAuth = async () => {
    try {
      setAuthError(null);
      if (authMode === 'register') {
        const res = await axios.post('/api/auth/register', { email: authEmail, password: authPassword, role: authRole });
        setToken(res.data.token); setUser(res.data.user); localStorage.setItem('authToken', res.data.token); localStorage.setItem('authUser', JSON.stringify(res.data.user)); setView('list');
      } else {
        const res = await axios.post('/api/auth/login', { email: authEmail, password: authPassword });
        setToken(res.data.token); setUser(res.data.user); localStorage.setItem('authToken', res.data.token); localStorage.setItem('authUser', JSON.stringify(res.data.user)); setView('list');
      }
    } catch (e: any) {
      setAuthError(e.response?.data?.error || 'Auth failed');
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SurveyOnline
          </Typography>
          {!user && (
            <Button 
              color="inherit" 
              onClick={() => setView('auth')}
              startIcon={<ExitToAppIcon />}
            >
              Login / Register
            </Button>
          )}
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                label={`${user.email} (${user.role})`} 
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiChip-label': {
                    color: 'white',
                    fontWeight: 500,
                  }
                }}
                variant="outlined"
              />
              <Button 
                color="inherit" 
                onClick={handleLogout}
                startIcon={<ExitToAppIcon />}
              >
                Logout
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {view === 'auth' && (
          <Card sx={{ maxWidth: 400, mx: 'auto' }}>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                {authMode === 'login' ? 'Login' : 'Register'}
              </Typography>
              <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  variant="outlined"
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  variant="outlined"
                />
                {authMode === 'register' && (
                  <FormControl fullWidth>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={authRole}
                      label="Role"
                      onChange={e => setAuthRole(e.target.value)}
                    >
                      <MenuItem value="ADMIN">ADMIN</MenuItem>
                      <MenuItem value="RESPONDENT">RESPONDENT</MenuItem>
                    </Select>
                  </FormControl>
                )}
                {authError && (
                  <Alert severity="error">{authError}</Alert>
                )}
                <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={!authEmail || !authPassword}
                    onClick={submitAuth}
                  >
                    {authMode === 'login' ? 'Login' : 'Register'}
                  </Button>
                  <Button
                    variant="text"
                    fullWidth
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  >
                    {authMode === 'login' ? 'Need an account?' : 'Have an account?'}
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setView('list')}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {view === 'list' && (
          <Box>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h4" component="h1">
                    Surveys
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {isAdmin && (
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setView('builder')}
                      >
                        Create Survey
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={loadSurveys}
                    >
                      Refresh
                    </Button>
                  </Box>
                </Box>

                <List>
                  {surveys.map(s => (
                    <ListItem
                      key={s.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: 'background.paper'
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6">{s.title}</Typography>
                            <Chip
                              label={s.status}
                              color={s.status === 'ACTIVE' ? 'success' : s.status === 'DRAFT' ? 'warning' : 'default'}
                              size="small"
                            />
                            {(s.status === 'ACTIVE' || s.status === 'CLOSED') && s._count && (
                              <Chip
                                label={`${s._count.responses} response${s._count.responses !== 1 ? 's' : ''}`}
                                variant="outlined"
                                size="small"
                                color="info"
                              />
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {isAdmin && s.status === 'DRAFT' && (
                            <>
                              <Button
                                size="small"
                                startIcon={<EditIcon />}
                                onClick={() => { setEditingSurveyId(s.id); setView('editor'); }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<PlayArrowIcon />}
                                onClick={async () => { 
                                  await axios.patch(`/api/surveys/${s.id}/status`, { status: 'ACTIVE' }); 
                                  await loadSurveys(); 
                                }}
                              >
                                Activate
                              </Button>
                            </>
                          )}
                          {isAdmin && (
                            <>
                              <Button
                                size="small"
                                startIcon={<ContentCopyIcon />}
                                onClick={async () => { 
                                  await axios.post(`/api/surveys/${s.id}/clone`); 
                                  await loadSurveys(); 
                                }}
                              >
                                Clone
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={async () => { 
                                  if (confirm('Delete this survey?')) { 
                                    await axios.delete(`/api/surveys/${s.id}`); 
                                    await loadSurveys(); 
                                  } 
                                }}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                          {(s.status === 'ACTIVE' || isAdmin) && (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => { setActiveSurveyId(s.id); setView('take'); }}
                            >
                              Take
                            </Button>
                          )}
                          {isAdmin && (
                            <>
                              <Button
                                size="small"
                                startIcon={<PollIcon />}
                                onClick={() => { setActiveSurveyId(s.id); setView('results'); }}
                              >
                                Results
                              </Button>
                              <IconButton
                                size="small"
                                component="a"
                                href={`/api/surveys/${s.id}/export.json`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <GetAppIcon />
                              </IconButton>
                            </>
                          )}
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                  {surveys.length === 0 && (
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography color="text.secondary" align="center">
                            {isAdmin ? 'No surveys yet.' : 'No active surveys available. Please check back later.'}
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Box>
        )}

        {view === 'builder' && isAdmin && <SurveyBuilder onDone={() => { setView('list'); loadSurveys(); }} />}
        {view === 'editor' && isAdmin && editingSurveyId && (
          <SurveyEditor 
            surveyId={editingSurveyId} 
            onDone={() => { 
              setView('list'); 
              setEditingSurveyId(null); 
              loadSurveys(); 
            }} 
          />
        )}
        {view === 'take' && activeSurveyId && <SurveyTaker surveyId={activeSurveyId} onBack={() => setView('list')} />}
        {view === 'results' && activeSurveyId && <SurveyResults surveyId={activeSurveyId} onBack={() => setView('list')} />}
      </Container>
    </ThemeProvider>
  );
};