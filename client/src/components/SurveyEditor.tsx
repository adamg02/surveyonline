import React, { useState, useEffect } from 'react';
import axios from '../lib/axios';
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

const questionTypes = [
  { value: 'SINGLE_CHOICE', label: 'Single Choice' },
  { value: 'MULTI_CHOICE', label: 'Multi Choice' },
  { value: 'OPEN_END_TEXT', label: 'Open End Text' },
  { value: 'OPEN_END_NUMERIC', label: 'Open End Numeric' },
  { value: 'MULTI_OPEN_END', label: 'Multi Open End' },
  { value: 'RANKING', label: 'Ranking' },
];

interface EditorProps { 
  onDone: () => void; 
  surveyId?: string; // If provided, edit mode; otherwise create mode
}

interface NewQuestion {
  id: string;
  text: string;
  type: string;
  order: number;
  isRequired: boolean;
  options: { text: string; order: number; isExclusive?: boolean }[];
  openItems: { label: string; order: number }[];
}

interface SortableQuestionProps {
  question: NewQuestion;
  index: number;
  onUpdate: (patch: Partial<NewQuestion>) => void;
  onDelete: () => void;
  totalQuestions: number;
}

interface SortableOptionProps {
  option: { text: string; order: number; isExclusive?: boolean };
  optionIndex: number;
  onUpdate: (patch: Partial<{ text: string; order: number; isExclusive?: boolean }>) => void;
  onDelete: () => void;
  showExclusive: boolean;
}

const SortableOption: React.FC<SortableOptionProps> = ({ option, optionIndex, onUpdate, onDelete, showExclusive }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `option-${optionIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="sortable-option">
      <div className="drag-handle" {...attributes} {...listeners}>⋮⋮</div>
      <input
        value={option.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        placeholder="Option text"
        className="option-input"
      />
      {showExclusive && (
        <label className="exclusive-checkbox">
          <input
            type="checkbox"
            checked={option.isExclusive || false}
            onChange={(e) => onUpdate({ isExclusive: e.target.checked })}
          />
          Exclusive
        </label>
      )}
      <button type="button" className="delete-option" onClick={onDelete}>×</button>
    </div>
  );
};

const SortableQuestion: React.FC<SortableQuestionProps> = ({ question, index, onUpdate, onDelete, totalQuestions }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleOptionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = parseInt(active.id.toString().split('-')[1]);
    const overIndex = parseInt(over.id.toString().split('-')[1]);

    const newOptions = arrayMove(question.options, activeIndex, overIndex);
    onUpdate({ options: newOptions.map((opt, idx) => ({ ...opt, order: idx })) });
  };

  const addOption = () => {
    const newOption = { text: '', order: question.options.length };
    onUpdate({ options: [...question.options, newOption] });
  };

  const updateOption = (optionIndex: number, patch: Partial<{ text: string; order: number; isExclusive?: boolean }>) => {
    const newOptions = [...question.options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], ...patch };
    onUpdate({ options: newOptions });
  };

  const deleteOption = (optionIndex: number) => {
    const newOptions = question.options.filter((_, i) => i !== optionIndex);
    onUpdate({ options: newOptions.map((opt, idx) => ({ ...opt, order: idx })) });
  };

  const addOpenItem = () => {
    const newItem = { label: '', order: question.openItems.length };
    onUpdate({ openItems: [...question.openItems, newItem] });
  };

  const updateOpenItem = (itemIndex: number, patch: Partial<{ label: string; order: number }>) => {
    const newItems = [...question.openItems];
    newItems[itemIndex] = { ...newItems[itemIndex], ...patch };
    onUpdate({ openItems: newItems });
  };

  const deleteOpenItem = (itemIndex: number) => {
    const newItems = question.openItems.filter((_, i) => i !== itemIndex);
    onUpdate({ openItems: newItems.map((item, idx) => ({ ...item, order: idx })) });
  };

  const needsOptions = ['SINGLE_CHOICE', 'MULTI_CHOICE', 'RANKING'].includes(question.type);
  const needsOpenItems = question.type === 'MULTI_OPEN_END';
  const showExclusive = question.type === 'MULTI_OPEN_END';

  return (
    <div ref={setNodeRef} style={style} className="question-card">
      <div className="question-header">
        <div className="drag-handle" {...attributes} {...listeners}>⋮⋮</div>
        <span className="question-number">Question {index + 1} of {totalQuestions}</span>
        <button type="button" className="delete-question" onClick={onDelete}>Delete</button>
      </div>
      
      <label>
        Question Text
        <input
          value={question.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Enter your question"
        />
      </label>

      <label>
        Question Type
        <select
          value={question.type}
          onChange={(e) => onUpdate({ type: e.target.value })}
        >
          {questionTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </label>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={question.isRequired}
          onChange={(e) => onUpdate({ isRequired: e.target.checked })}
        />
        Required
      </label>

      {needsOptions && (
        <div className="options-section">
          <div className="options-header">
            <h4>Options</h4>
            <button type="button" onClick={addOption}>Add Option</button>
          </div>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleOptionDragEnd}
          >
            <SortableContext
              items={question.options.map((_, idx) => `option-${idx}`)}
              strategy={verticalListSortingStrategy}
            >
              {question.options.map((option, optionIndex) => (
                <SortableOption
                  key={optionIndex}
                  option={option}
                  optionIndex={optionIndex}
                  onUpdate={(patch) => updateOption(optionIndex, patch)}
                  onDelete={() => deleteOption(optionIndex)}
                  showExclusive={showExclusive}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {needsOpenItems && (
        <div className="open-items-section">
          <div className="open-items-header">
            <h4>Open Items</h4>
            <button type="button" onClick={addOpenItem}>Add Item</button>
          </div>
          {question.openItems.map((item, itemIndex) => (
            <div key={itemIndex} className="open-item">
              <input
                value={item.label}
                onChange={(e) => updateOpenItem(itemIndex, { label: e.target.value })}
                placeholder="Item label"
              />
              <button type="button" onClick={() => deleteOpenItem(itemIndex)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const SurveyEditor: React.FC<EditorProps> = ({ onDone, surveyId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<NewQuestion[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!surveyId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load existing survey for editing
  useEffect(() => {
    if (surveyId) {
      loadSurvey();
    }
  }, [surveyId]);

  const loadSurvey = async () => {
    if (!surveyId) return;
    
    try {
      setInitialLoading(true);
      const response = await axios.get(`/api/surveys/${surveyId}`);
      const survey = response.data;
      
      if (survey.status !== 'DRAFT') {
        setErrors(['Only DRAFT surveys can be edited']);
        return;
      }
      
      setTitle(survey.title);
      setDescription(survey.description || '');
      
      // Convert survey questions to editor format
      const editorQuestions: NewQuestion[] = survey.questions
        .sort((a: any, b: any) => a.order - b.order)
        .map((q: any) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          order: q.order,
          isRequired: q.isRequired,
          options: q.options
            ? q.options.sort((a: any, b: any) => a.order - b.order)
                .map((opt: any) => ({
                  text: opt.text,
                  order: opt.order,
                  isExclusive: opt.isExclusive || false
                }))
            : [],
          openItems: q.openItems
            ? q.openItems.sort((a: any, b: any) => a.order - b.order)
                .map((item: any) => ({
                  label: item.label,
                  order: item.order
                }))
            : []
        }));
      
      setQuestions(editorQuestions);
    } catch (error: any) {
      setErrors(['Failed to load survey: ' + (error.response?.data?.error || error.message)]);
    } finally {
      setInitialLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: NewQuestion = {
      id: Date.now().toString(),
      text: '',
      type: 'SINGLE_CHOICE',
      order: questions.length,
      isRequired: false,
      options: [],
      openItems: []
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, patch: Partial<NewQuestion>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...patch };
    setQuestions(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions.map((q, idx) => ({ ...q, order: idx })));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex(q => q.id === active.id);
    const newIndex = questions.findIndex(q => q.id === over.id);

    const newQuestions = arrayMove(questions, oldIndex, newIndex);
    setQuestions(newQuestions.map((q, idx) => ({ ...q, order: idx })));
  };

  const save = async () => {
    setErrors([]);
    const errs: string[] = [];
    
    if (!title.trim()) errs.push('Title is required');
    if (questions.length === 0) errs.push('At least one question is required');
    
    questions.forEach((q, i) => {
      if (!q.text.trim()) errs.push(`Question ${i + 1} text is required`);
      if (['SINGLE_CHOICE', 'MULTI_CHOICE', 'RANKING'].includes(q.type) && q.options.length === 0) {
        errs.push(`Question ${i + 1} needs at least one option`);
      }
      if (q.type === 'MULTI_OPEN_END' && q.openItems.length === 0) {
        errs.push(`Question ${i + 1} needs at least one open item`);
      }
    });
    
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        questions: questions.map(q => ({
          text: q.text.trim(),
          type: q.type,
          order: q.order,
          isRequired: q.isRequired,
          options: q.options,
          openItems: q.openItems
        }))
      };

      if (surveyId) {
        // Update existing survey
        await axios.put(`/api/surveys/${surveyId}`, payload);
      } else {
        // Create new survey
        await axios.post('/api/surveys', payload);
      }
      
      onDone();
    } catch (e: any) {
      setErrors([e.response?.data?.error || 'Failed to save survey']);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div>Loading survey...</div>;
  }

  return (
    <div>
      <h2>{surveyId ? 'Edit Survey' : 'Create Survey'}</h2>
      <label>Title <input value={title} onChange={e => setTitle(e.target.value)} /></label>
      <br />
      <label>Description <input value={description} onChange={e => setDescription(e.target.value)} /></label>
      <br />
      <button onClick={addQuestion}>Add Question</button>
      {!!errors.length && (
        <div className="error preline">{errors.join('\n')}</div>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={questions.map(q => q.id)} 
          strategy={verticalListSortingStrategy}
        >
          {questions.map((q, idx) => (
            <SortableQuestion
              key={q.id}
              question={q}
              index={idx}
              totalQuestions={questions.length}
              onUpdate={(patch) => updateQuestion(idx, patch)}
              onDelete={() => deleteQuestion(idx)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button 
        disabled={!title || questions.length === 0 || loading} 
        onClick={save}
      >
        {loading ? 'Saving...' : (surveyId ? 'Update Survey' : 'Save Survey')}
      </button>
      <button onClick={onDone}>Cancel</button>
    </div>
  );
};