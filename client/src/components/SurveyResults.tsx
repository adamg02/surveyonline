import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Props { surveyId: string; onBack: () => void; }

export const SurveyResults: React.FC<Props> = ({ surveyId, onBack }) => {
  const [data, setData] = useState<any>(null);
  const [survey, setSurvey] = useState<any>(null);
  useEffect(() => { (async () => { const res = await axios.get(`/api/responses/survey/${surveyId}/aggregate`); setData(res.data); const s = await axios.get(`/api/surveys/${surveyId}`); setSurvey(s.data); })(); }, [surveyId]);

  if (!data || !survey) return <div>Loading...</div>;

  return (
    <div>
      <h2>Results - {survey.title}</h2>
      {survey.questions.map((q: any) => (
        <div key={q.id} style={{ border: '1px solid #eee', margin: '0.5rem 0', padding: '0.5rem' }}>
          <p><strong>{q.text}</strong></p>
          <pre style={{ background: '#f9f9f9', padding: '0.5rem', maxWidth: '600px', overflow: 'auto' }}>{JSON.stringify(data[q.id], null, 2)}</pre>
        </div>
      ))}
      <button onClick={onBack}>Back</button>
    </div>
  );
};
