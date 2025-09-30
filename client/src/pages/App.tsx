import React, { useEffect, useState } from 'react';
import { SurveyBuilder } from '../components/SurveyBuilder';
import { SurveyTaker } from '../components/SurveyTaker';
import { SurveyResults } from '../components/SurveyResults';
import axios from 'axios';
import '../styles.css';

export interface SurveySummary { id: string; title: string; status: string; }

type View = 'list'|'builder'|'take'|'results'|'auth';
interface AuthUser { id: string; email: string; role: string; }

export const App: React.FC = () => {
  const [view, setView] = useState<View>('list');
  const [surveys, setSurveys] = useState<SurveySummary[]>([]);
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);
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
    <>
      <header className="appbar">
        <h1>SurveyOnline</h1>
  <div className="grow" />
        {!user && <button className="secondary" onClick={() => setView('auth')}>Login / Register</button>}
        {user && (
          <>
            <span className="pill">{user.email} ({user.role})</span>
            <button className="secondary" onClick={handleLogout}>Logout</button>
          </>
        )}
      </header>
      <main className="container">
        {view === 'auth' && (
          <div className="panel auth-box">
            <h2>{authMode === 'login' ? 'Login' : 'Register'}</h2>
            <div className="col gap-sm">
              <label>Email <input type="text" value={authEmail} onChange={e => setAuthEmail(e.target.value)} /></label>
              <label>Password <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} /></label>
              {authMode === 'register' && (
                <label>Role
                  <select value={authRole} onChange={e => setAuthRole(e.target.value)}>
                    <option value="ADMIN">ADMIN</option>
                    <option value="RESPONDENT">RESPONDENT</option>
                  </select>
                </label>
              )}
              {authError && <div className="error">{authError}</div>}
              <div>
                <button disabled={!authEmail || !authPassword} onClick={submitAuth}>{authMode === 'login' ? 'Login' : 'Register'}</button>
                <button type="button" className="secondary" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                  {authMode === 'login' ? 'Need an account?' : 'Have an account?'}
                </button>
                <button type="button" className="secondary" onClick={() => setView('list')}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {view === 'list' && (
          <div>
            <div className="panel">
              <div className="row gap wrap">
                <h2 className="m0">Surveys</h2>
                {isAdmin && <button onClick={() => setView('builder')}>Create Survey</button>}
                <button className="secondary" onClick={loadSurveys}>Refresh</button>
              </div>
              <ul className="survey-list mt-sm">
                {surveys.map(s => (
                  <li key={s.id}>
                    <span className="fw600">{s.title}</span>
                    <span className={"status "+s.status}>{s.status}</span>
                    {isAdmin && s.status === 'DRAFT' && <button onClick={async () => { await axios.patch(`/api/surveys/${s.id}/status`, { status: 'ACTIVE' }); await loadSurveys(); }}>Activate</button>}
                    {isAdmin && <button className="secondary" onClick={async () => { await axios.post(`/api/surveys/${s.id}/clone`); await loadSurveys(); }}>Clone</button>}
                    {isAdmin && <button className="danger" onClick={async () => { if (confirm('Delete this survey?')) { await axios.delete(`/api/surveys/${s.id}`); await loadSurveys(); } }}>Delete</button>}
                    <button onClick={() => { setActiveSurveyId(s.id); setView('take'); }}>Take</button>
                    <button className="secondary" onClick={() => { setActiveSurveyId(s.id); setView('results'); }}>Results</button>
                    <a className="secondary tiny-link" href={`/api/surveys/${s.id}/export.json`} target="_blank" rel="noreferrer">JSON</a>
                    <a className="secondary tiny-link" href={`/api/surveys/${s.id}/export.csv`} target="_blank" rel="noreferrer">CSV</a>
                  </li>
                ))}
                {surveys.length === 0 && <li>No surveys yet.</li>}
              </ul>
            </div>
          </div>
        )}
        {view === 'builder' && isAdmin && <SurveyBuilder onDone={() => { setView('list'); loadSurveys(); }} />}
        {view === 'take' && activeSurveyId && <SurveyTaker surveyId={activeSurveyId} onBack={() => setView('list')} />}
        {view === 'results' && activeSurveyId && <SurveyResults surveyId={activeSurveyId} onBack={() => setView('list')} />}
      </main>
    </>
  );
};
