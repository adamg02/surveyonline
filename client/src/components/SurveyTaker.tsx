import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props { surveyId: string; onBack: () => void; }

interface RankingItem {
  id: string;
  text: string;
  rank: number;
}

interface SortableRankingItemProps {
  item: RankingItem;
  index: number;
}

const SortableRankingItem: React.FC<SortableRankingItemProps> = ({ item, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="ranking-item"
      {...attributes}
    >
      <div
        {...listeners}
        className={`drag-handle ${isDragging ? 'dragging' : ''}`}
      >
        ⋮⋮
      </div>
      <div className="ranking-content">
        <span className="ranking-number">{index + 1}.</span>
        <span className="ranking-text">{item.text}</span>
      </div>
    </div>
  );
};

export const SurveyTaker: React.FC<Props> = ({ surveyId, onBack }) => {
  const [survey, setSurvey] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => { (async () => { const res = await axios.get(`/api/surveys/${surveyId}`); setSurvey(res.data); })(); }, [surveyId]);

  const updateAnswer = (questionId: string, payload: any) => {
    setAnswers(a => ({ ...a, [questionId]: payload }));
    // Clear any errors for this question when user provides an answer
    setErrors([]);
  };

  const getCurrentQuestion = () => {
    if (!survey || !survey.questions) return null;
    const sortedQuestions = survey.questions.sort((a: any, b: any) => a.order - b.order);
    return sortedQuestions[currentQuestionIndex] || null;
  };

  const getTotalQuestions = () => {
    return survey?.questions?.length || 0;
  };

  const isFirstQuestion = () => currentQuestionIndex === 0;
  const isLastQuestion = () => currentQuestionIndex === getTotalQuestions() - 1;

  const validateCurrentQuestion = () => {
    const question = getCurrentQuestion();
    if (!question) return true;

    const answer = answers[question.id];
    
    if (question.isRequired) {
      if (question.type === 'SINGLE_CHOICE' && !answer?.optionId) {
        setErrors([`Please select an option for: ${question.text}`]);
        return false;
      }
      if (question.type === 'MULTI_CHOICE' && !(answer?.optionIds?.length)) {
        setErrors([`Please select at least one option for: ${question.text}`]);
        return false;
      }
      if (question.type === 'OPEN_END_TEXT' && !(answer?.text?.trim())) {
        setErrors([`Please provide an answer for: ${question.text}`]);
        return false;
      }
      if (question.type === 'OPEN_END_NUMERIC' && (typeof answer?.value !== 'number' || isNaN(answer.value))) {
        setErrors([`Please provide a numeric answer for: ${question.text}`]);
        return false;
      }
      if (question.type === 'MULTI_OPEN_END' && !(answer?.items?.some((i: any) => i.text?.trim()))) {
        setErrors([`Please provide at least one answer for: ${question.text}`]);
        return false;
      }
      if (question.type === 'RANKING') {
        const rankings = answer?.rankings || [];
        if (rankings.length !== question.options.length) {
          setErrors([`Please rank all options for: ${question.text}`]);
          return false;
        }
      }
    }
    
    setErrors([]);
    return true;
  };

  const goToNextQuestion = () => {
    if (validateCurrentQuestion() && !isLastQuestion()) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (!isFirstQuestion()) {
      setCurrentQuestionIndex(prev => prev - 1);
      setErrors([]); // Clear errors when going back
    }
  };

  const getRankingItems = (question: any): RankingItem[] => {
    const rankings = answers[question.id]?.rankings || [];
    
    // Create items from options, maintaining drag order if rankings exist
    if (rankings.length > 0) {
      // Sort by current rank order
      const sortedRankings = rankings.sort((a: any, b: any) => a.rank - b.rank);
      return sortedRankings.map((ranking: any, index: number) => {
        const option = question.options.find((o: any) => o.id === ranking.optionId);
        return {
          id: option.id,
          text: option.text,
          rank: index + 1
        };
      });
    } else {
      // Initialize with original option order
      return question.options.map((option: any, index: number) => ({
        id: option.id,
        text: option.text,
        rank: index + 1
      }));
    }
  };

  const handleRankingDragEnd = (questionId: string, event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const question = survey.questions.find((q: any) => q.id === questionId);
      const currentItems = getRankingItems(question);
      
      const oldIndex = currentItems.findIndex(item => item.id === active.id);
      const newIndex = currentItems.findIndex(item => item.id === over.id);
      
      const reorderedItems = arrayMove(currentItems, oldIndex, newIndex);
      
      // Convert back to rankings format
      const rankings = reorderedItems.map((item, index) => ({
        optionId: item.id,
        rank: index + 1
      }));
      
      updateAnswer(questionId, { rankings });
    }
  };

  const validate = () => {
    const errs: string[] = [];
    if (!survey) return false;
    for (const q of survey.questions) {
      const ans = answers[q.id];
      if (q.isRequired) {
        if (q.type === 'SINGLE_CHOICE' && !ans?.optionId) errs.push(`Question: ${q.text} required`);
        if (q.type === 'MULTI_CHOICE' && !(ans?.optionIds?.length)) errs.push(`Question: ${q.text} required`);
        if (q.type === 'OPEN_END_TEXT' && !(ans?.text?.trim())) errs.push(`Question: ${q.text} required`);
        if (q.type === 'OPEN_END_NUMERIC' && (typeof ans?.value !== 'number' || isNaN(ans.value))) errs.push(`Question: ${q.text} numeric required`);
        if (q.type === 'MULTI_OPEN_END' && !(ans?.items?.some((i: any) => i.text?.trim()))) errs.push(`Question: ${q.text} at least one item required`);
        if (q.type === 'RANKING') {
          const rankings = ans?.rankings || [];
          if (rankings.length !== q.options.length) errs.push(`Question: ${q.text} must rank all options`);
        }
      }
    }
    setErrors(errs);
    return errs.length === 0;
  };

  const submit = async () => {
    // Validate the current question first
    if (!validateCurrentQuestion()) return;
    
    // Then validate all questions for final submission
    if (!validate()) {
      // If there are validation errors, show them and don't submit
      return;
    }
    
    const payload = { surveyId, answers: Object.entries(answers).map(([questionId, payload]) => ({ questionId, payload })) };
    await axios.post('/api/responses', payload);
    setSubmitted(true);
  };

  if (!survey) return <div>Loading...</div>;
  if (submitted) return <div><p>Thanks for your response.</p><button onClick={onBack}>Back</button></div>;

  const currentQuestion = getCurrentQuestion();
  if (!currentQuestion) return <div>No questions available.</div>;

  return (
    <div>
      <h2>{survey.title}</h2>
      {survey.description && <p className="survey-description">{survey.description}</p>}
      
      {/* Progress indicator */}
      <div className="survey-progress">
        <div className="progress-text">
          Question {currentQuestionIndex + 1} of {getTotalQuestions()}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentQuestionIndex + 1) / getTotalQuestions()) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Error display */}
      {errors.length > 0 && <div className="error preline">{errors.join('\n')}</div>}

      {/* Current question */}
      <div className="question-container card">
        <p><strong>{currentQuestion.text}</strong></p>
        {currentQuestion.isRequired && <span className="tag-required">*Required</span>}
        
        {/* Single Choice */}
        {currentQuestion.type === 'SINGLE_CHOICE' && currentQuestion.options.map((o: any) => (
          <label key={o.id} className="option-label">
            <input 
              type="radio" 
              name={currentQuestion.id} 
              value={o.id} 
              checked={answers[currentQuestion.id]?.optionId === o.id}
              onChange={() => updateAnswer(currentQuestion.id, { optionId: o.id })} 
            /> 
            {o.text}
          </label>
        ))}

        {/* Multi Choice */}
        {currentQuestion.type === 'MULTI_CHOICE' && currentQuestion.options.map((o: any) => {
          const set = new Set((answers[currentQuestion.id]?.optionIds) || []);
          const toggle = () => { 
            if (set.has(o.id)) set.delete(o.id); 
            else set.add(o.id); 
            updateAnswer(currentQuestion.id, { optionIds: Array.from(set) }); 
          };
          return (
            <label key={o.id} className="option-label">
              <input type="checkbox" checked={set.has(o.id)} onChange={toggle} /> 
              {o.text}
            </label>
          );
        })}

        {/* Open End Text */}
        {currentQuestion.type === 'OPEN_END_TEXT' && (
          <input 
            type="text" 
            aria-label={currentQuestion.text} 
            placeholder="Your answer" 
            value={answers[currentQuestion.id]?.text || ''}
            onChange={e => updateAnswer(currentQuestion.id, { text: e.target.value })} 
          />
        )}

        {/* Open End Numeric */}
        {currentQuestion.type === 'OPEN_END_NUMERIC' && (
          <input 
            type="number" 
            aria-label={currentQuestion.text} 
            placeholder="0" 
            value={answers[currentQuestion.id]?.value || ''}
            onChange={e => updateAnswer(currentQuestion.id, { value: parseFloat(e.target.value) })} 
          />
        )}

        {/* Multi Open End */}
        {currentQuestion.type === 'MULTI_OPEN_END' && currentQuestion.openItems.map((it: any) => (
          <div key={it.id} className="open-item">
            <label>
              {it.label} 
              <input 
                type="text" 
                value={answers[currentQuestion.id]?.items?.find((x: any) => x.openItemId === it.id)?.text || ''}
                onChange={e => {
                  const existing = answers[currentQuestion.id]?.items || [];
                  const filtered = existing.filter((x: any) => x.openItemId !== it.id);
                  updateAnswer(currentQuestion.id, { items: [...filtered, { openItemId: it.id, text: e.target.value }] });
                }} 
              />
            </label>
          </div>
        ))}

        {/* Ranking */}
        {currentQuestion.type === 'RANKING' && (
          <div className="ranking-container">
            <p className="ranking-instruction">Drag to reorder items by preference (1st = most preferred):</p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleRankingDragEnd(currentQuestion.id, event)}
            >
              <SortableContext 
                items={getRankingItems(currentQuestion).map(item => item.id)} 
                strategy={verticalListSortingStrategy}
              >
                {getRankingItems(currentQuestion).map((item, index) => (
                  <SortableRankingItem
                    key={item.id}
                    item={item}
                    index={index}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="survey-navigation">
        <button 
          className="secondary" 
          onClick={goToPreviousQuestion} 
          disabled={isFirstQuestion()}
        >
          Previous
        </button>
        
        <button onClick={onBack} className="secondary">Exit Survey</button>
        
        {!isLastQuestion() ? (
          <button onClick={goToNextQuestion}>
            Next
          </button>
        ) : (
          <button onClick={submit}>
            Submit Survey
          </button>
        )}
      </div>
    </div>
  );
};
