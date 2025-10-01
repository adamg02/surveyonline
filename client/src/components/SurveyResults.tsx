import React, { useEffect, useState } from 'react';
import axios from '../lib/axios';

interface Props { surveyId: string; onBack: () => void; }

interface QuestionData {
  id: string;
  text: string;
  type: string;
  options?: Array<{ id: string; text: string; }>;
}

interface AggregateData {
  [questionId: string]: {
    counts?: { [optionId: string]: number };
    texts?: string[];
    values?: number[];
    count?: number;
    avg?: number;
    items?: { [itemId: string]: string[] };
    rankings?: { [optionId: string]: { [rank: number]: number } };
  };
}

const getQuestionTypeLabel = (type: string): string => {
  const types: { [key: string]: string } = {
    'SINGLE_CHOICE': 'Single Choice',
    'MULTI_CHOICE': 'Multiple Choice',
    'OPEN_END_TEXT': 'Text Response',
    'OPEN_END_NUMERIC': 'Numeric Response',
    'MULTI_OPEN_END': 'Multiple Text Items',
    'RANKING': 'Ranking Question'
  };
  return types[type] || type;
};

const ProgressBar: React.FC<{ value: number; max: number; label: string; color?: string }> = ({ 
  value, max, label, color = '#1366d6' 
}) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="progress-bar-container">
      <div className="progress-bar-label">
        <span>{label}</span>
        <span className="progress-bar-value">{value} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const SingleChoiceResults: React.FC<{ data: any; question: QuestionData }> = ({ data, question }) => {
  const counts = data.counts || {};
  const total = Object.values(counts).reduce((sum: number, count: any) => sum + count, 0) as number;
  const optionMap = new Map((question.options || []).map(opt => [opt.id, opt.text]));
  
  const colors = ['#1366d6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
  
  return (
    <div className="results-section">
      <div className="results-header">
        <h4>Response Distribution</h4>
        <div className="total-responses">Total Responses: {total}</div>
      </div>
      {total === 0 ? (
        <div className="no-data">No responses yet</div>
      ) : (
        <div className="chart-container">
          {Object.entries(counts)
            .sort(([,a]: any, [,b]: any) => b - a)
            .map(([optionId, count]: any, index) => (
            <ProgressBar
              key={optionId}
              value={count}
              max={total}
              label={optionMap.get(optionId) || `Option ${optionId}`}
              color={colors[index % colors.length]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MultiChoiceResults: React.FC<{ data: any; question: QuestionData }> = ({ data, question }) => {
  const counts = data.counts || {};
  const countValues = Object.values(counts).map(v => Number(v) || 0);
  const totalResponses = countValues.length > 0 ? Math.max(...countValues) : 1;
  const optionMap = new Map((question.options || []).map(opt => [opt.id, opt.text]));
  
  const colors = ['#1366d6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
  
  return (
    <div className="results-section">
      <div className="results-header">
        <h4>Selection Frequency</h4>
        <div className="total-responses">Each option can be selected independently</div>
      </div>
      {Object.keys(counts).length === 0 ? (
        <div className="no-data">No responses yet</div>
      ) : (
        <div className="chart-container">
          {Object.entries(counts)
            .sort(([,a]: any, [,b]: any) => b - a)
            .map(([optionId, count]: any, index) => (
            <ProgressBar
              key={optionId}
              value={count}
              max={totalResponses}
              label={optionMap.get(optionId) || `Option ${optionId}`}
              color={colors[index % colors.length]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TextResults: React.FC<{ data: any }> = ({ data }) => {
  const texts = data.texts || [];
  
  return (
    <div className="results-section">
      <div className="results-header">
        <h4>Text Responses</h4>
        <div className="total-responses">{texts.length} responses</div>
      </div>
      {texts.length === 0 ? (
        <div className="no-data">No responses yet</div>
      ) : (
        <div className="text-responses">
          {texts.map((text: string, index: number) => (
            <div key={index} className="text-response">
              <div className="response-number">#{index + 1}</div>
              <div className="response-text">{text || '(empty response)'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const NumericResults: React.FC<{ data: any }> = ({ data }) => {
  const values = data.values || [];
  const count = data.count || 0;
  const avg = data.avg || 0;
  
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const median = values.length > 0 
    ? values.sort((a: number, b: number) => a - b)[Math.floor(values.length / 2)]
    : 0;
  
  return (
    <div className="results-section">
      <div className="results-header">
        <h4>Numeric Analysis</h4>
        <div className="total-responses">{count} responses</div>
      </div>
      {count === 0 ? (
        <div className="no-data">No responses yet</div>
      ) : (
        <div className="numeric-stats">
          <div className="stat-grid">
            <div className="stat-item">
              <div className="stat-label">Average</div>
              <div className="stat-value">{avg.toFixed(2)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Median</div>
              <div className="stat-value">{median}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Minimum</div>
              <div className="stat-value">{min}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Maximum</div>
              <div className="stat-value">{max}</div>
            </div>
          </div>
          {values.length > 0 && (
            <div className="values-list">
              <h5>All Values:</h5>
              <div className="values-container">
                {values.map((value: number, index: number) => (
                  <span key={index} className="value-chip">{value}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RankingResults: React.FC<{ data: any; question: QuestionData }> = ({ data, question }) => {
  const rankings = data.rankings || {};
  const optionMap = new Map((question.options || []).map(opt => [opt.id, opt.text]));
  
  // Calculate average ranking for each option
  const averageRankings = Object.entries(rankings).map(([optionId, rankCounts]: any) => {
    const totalVotes = Object.values(rankCounts).reduce((sum: number, count: any) => sum + count, 0) as number;
    const weightedSum = Object.entries(rankCounts).reduce((sum: number, [rank, count]: any) => {
      return sum + (parseInt(rank) * count);
    }, 0) as number;
    
    return {
      optionId,
      optionText: optionMap.get(optionId) || `Option ${optionId}`,
      averageRank: totalVotes > 0 ? weightedSum / totalVotes : 0,
      totalVotes
    };
  }).sort((a, b) => a.averageRank - b.averageRank);
  
  const colors = ['#ffd700', '#c0c0c0', '#cd7f32', '#1366d6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  return (
    <div className="results-section">
      <div className="results-header">
        <h4>Ranking Results</h4>
        <div className="total-responses">Ranked by average position</div>
      </div>
      {averageRankings.length === 0 ? (
        <div className="no-data">No responses yet</div>
      ) : (
        <div className="ranking-results">
          {averageRankings.map((item, index) => (
            <div key={item.optionId} className="ranking-item">
              <div className={`ranking-position position-${index + 1}`}>
                #{index + 1}
              </div>
              <div className="ranking-content">
                <div className="ranking-option">{item.optionText}</div>
                <div className="ranking-stats">
                  Average position: {item.averageRank.toFixed(2)} • {item.totalVotes} votes
                </div>
              </div>
            </div>
          ))}
          
          {/* Detailed breakdown */}
          <div className="ranking-breakdown">
            <h5>Detailed Ranking Distribution</h5>
            {averageRankings.map((item) => {
              const rankCounts = rankings[item.optionId] || {};
              return (
                <div key={item.optionId} className="breakdown-item">
                  <h6>{item.optionText}</h6>
                  <div className="rank-distribution">
                    {Object.entries(rankCounts)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .map(([rank, count]: any) => (
                      <div key={rank} className="rank-bar">
                        <span className="rank-label">#{rank}</span>
                        <div className="rank-progress">
                          <div 
                            className={`rank-fill rank-${rank}`}
                            ref={(el) => {
                              if (el) {
                                el.style.width = `${(count / item.totalVotes) * 100}%`;
                              }
                            }}
                          />
                        </div>
                        <span className="rank-count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const SurveyResults: React.FC<Props> = ({ surveyId, onBack }) => {
  const [data, setData] = useState<AggregateData | null>(null);
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [aggregateRes, surveyRes] = await Promise.all([
          axios.get(`/api/responses/survey/${surveyId}/aggregate`),
          axios.get(`/api/surveys/${surveyId}`)
        ]);
        
        setData(aggregateRes.data);
        setSurvey(surveyRes.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [surveyId]);

  if (loading) {
    return (
      <div className="results-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <div>Loading survey results...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-container">
        <div className="error-state">
          <h2>Error Loading Results</h2>
          <p>{error}</p>
          <button onClick={onBack}>Back to Surveys</button>
        </div>
      </div>
    );
  }

  if (!data || !survey) return null;

  const totalResponses = survey.questions.reduce((total: number, question: any) => {
    const questionData = data[question.id];
    if (!questionData) return total;
    
    if (questionData.counts) {
      const questionTotal = Object.values(questionData.counts).reduce((sum: number, count: any) => sum + count, 0) as number;
      return Math.max(total, questionTotal);
    } else if (questionData.texts) {
      return Math.max(total, questionData.texts.length);
    } else if (questionData.count) {
      return Math.max(total, questionData.count);
    }
    return total;
  }, 0);

  const renderQuestionResults = (question: QuestionData) => {
    const questionData = data[question.id];
    if (!questionData) return <div className="no-data">No data available</div>;

    switch (question.type) {
      case 'SINGLE_CHOICE':
        return <SingleChoiceResults data={questionData} question={question} />;
      case 'MULTI_CHOICE':
        return <MultiChoiceResults data={questionData} question={question} />;
      case 'OPEN_END_TEXT':
        return <TextResults data={questionData} />;
      case 'OPEN_END_NUMERIC':
        return <NumericResults data={questionData} />;
      case 'RANKING':
        return <RankingResults data={questionData} question={question} />;
      default:
        return (
          <div className="raw-data">
            <pre>{JSON.stringify(questionData, null, 2)}</pre>
          </div>
        );
    }
  };

  return (
    <div className="results-container">
      <div className="results-header-main">
        <div className="results-title-section">
          <h1>Survey Results</h1>
          <h2>{survey.title}</h2>
          {survey.description && (
            <p className="survey-description">{survey.description}</p>
          )}
        </div>
        <div className="results-summary">
          <div className="summary-stat">
            <div className="stat-number">{totalResponses}</div>
            <div className="stat-label">Total Responses</div>
          </div>
          <div className="summary-stat">
            <div className="stat-number">{survey.questions.length}</div>
            <div className="stat-label">Questions</div>
          </div>
          <div className="summary-stat">
            <div className="stat-number">{survey.status}</div>
            <div className="stat-label">Status</div>
          </div>
        </div>
      </div>

      <div className="results-content">
        {survey.questions
          .sort((a: any, b: any) => a.order - b.order)
          .map((question: any, index: number) => (
          <div key={question.id} className="question-results">
            <div className="question-header">
              <div className="question-number">Q{index + 1}</div>
              <div className="question-info">
                <h3>{question.text}</h3>
                <div className="question-type">{getQuestionTypeLabel(question.type)}</div>
              </div>
            </div>
            {renderQuestionResults(question)}
          </div>
        ))}
      </div>

      <div className="results-actions">
        <button onClick={onBack} className="back-button">Back to Surveys</button>
        <a 
          href={`/api/surveys/${surveyId}/export.json`} 
          className="export-button" 
          target="_blank" 
          rel="noreferrer"
        >
          Export JSON
        </a>
        <a 
          href={`/api/surveys/${surveyId}/export.csv`} 
          className="export-button" 
          target="_blank" 
          rel="noreferrer"
        >
          Export CSV
        </a>
      </div>
    </div>
  );
};
