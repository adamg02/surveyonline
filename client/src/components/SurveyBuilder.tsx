import React, { useState } from 'react';
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

interface BuilderProps { onDone: () => void; }

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
  index: number;
  questionType: string;
  onUpdate: (patch: any) => void;
  onDelete: () => void;
  totalOptions: number;
}

const SortableOption: React.FC<SortableOptionProps> = ({ 
  option, 
  index, 
  questionType,
  onUpdate, 
  onDelete, 
  totalOptions 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `option-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="option-item"
      {...attributes}
    >
      <div className="flex-row gap-xs">
        <div
          {...listeners}
          className={`drag-handle ${isDragging ? 'dragging' : ''}`}
        >
          ⋮⋮
        </div>
        <input 
          value={option.text} 
          placeholder="Option text" 
          onChange={e => onUpdate({ text: e.target.value })} 
        />
        {questionType !== 'RANKING' && (
          <label>
            Exclusive 
            <input 
              type="checkbox" 
              checked={!!option.isExclusive} 
              onChange={e => onUpdate({ isExclusive: e.target.checked })} 
            />
          </label>
        )}
        <button 
          type="button" 
          className="reorder-btn" 
          onClick={onDelete}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

const SortableQuestion: React.FC<SortableQuestionProps> = ({ 
  question, 
  index, 
  onUpdate, 
  onDelete, 
  totalQuestions 
}) => {
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

  const addOption = () => {
    onUpdate({ options: [...question.options, { text: '', order: question.options.length }] });
  };

  const addOpenItem = () => {
    onUpdate({ openItems: [...question.openItems, { label: '', order: question.openItems.length }] });
  };

  const handleOptionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeIndex = parseInt(active.id.toString().replace('option-', ''));
      const overIndex = parseInt(over.id.toString().replace('option-', ''));
      
      const reorderedOptions = arrayMove(question.options, activeIndex, overIndex);
      onUpdate({ options: reorderedOptions.map((opt, index) => ({ ...opt, order: index })) });
    }
  };

  const updateOption = (optIndex: number, patch: any) => {
    onUpdate({ 
      options: question.options.map((opt, i) => 
        i === optIndex ? { ...opt, ...patch } : opt
      ) 
    });
  };

  const deleteOption = (optIndex: number) => {
    onUpdate({ 
      options: question.options.filter((_, i) => i !== optIndex).map((opt, i) => ({ ...opt, order: i })) 
    });
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="question-card"
      {...attributes}
    >
      <div className="flex-row gap-xs">
        <div 
          {...listeners}
          className={`drag-handle ${isDragging ? 'dragging' : ''}`}
        >
          ⋮⋮
        </div>
        <div className="question-content">
          <input 
            placeholder="Question text" 
            value={question.text} 
            onChange={e => onUpdate({ text: e.target.value })} 
          />
          <select 
            aria-label="Question type" 
            value={question.type} 
            onChange={e => onUpdate({ type: e.target.value })}
          >
            {questionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <label>
            Required 
            <input 
              type="checkbox" 
              checked={question.isRequired} 
              onChange={e => onUpdate({ isRequired: e.target.checked })} 
            />
          </label>
          <button 
            type="button" 
            className="reorder-btn delete-question-btn" 
            onClick={onDelete}
          >
            ✕
          </button>
          
          {['SINGLE_CHOICE','MULTI_CHOICE','RANKING'].includes(question.type) && (
            <div>
              <button type="button" onClick={addOption}>Add Option</button>
              <DndContext
                sensors={useSensors(
                  useSensor(PointerSensor),
                  useSensor(KeyboardSensor, {
                    coordinateGetter: sortableKeyboardCoordinates,
                  })
                )}
                collisionDetection={closestCenter}
                onDragEnd={handleOptionDragEnd}
              >
                <SortableContext 
                  items={question.options.map((_, i) => `option-${i}`)} 
                  strategy={verticalListSortingStrategy}
                >
                  {question.options.map((o, oi) => (
                    <SortableOption
                      key={oi}
                      option={o}
                      index={oi}
                      questionType={question.type}
                      totalOptions={question.options.length}
                      onUpdate={(patch) => updateOption(oi, patch)}
                      onDelete={() => deleteOption(oi)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
          
          {question.type === 'MULTI_OPEN_END' && (
            <div>
              <button type="button" onClick={addOpenItem}>Add Sub Item</button>
              {question.openItems.map((o, oi) => (
                <div key={oi} className="flex-row gap-xs">
                  <input 
                    value={o.label} 
                    placeholder="Item label" 
                    onChange={e => onUpdate({ 
                      openItems: question.openItems.map((oo,j) => 
                        j===oi ? { ...oo, label: e.target.value } : oo
                      ) 
                    })} 
                  />
                  <button 
                    type="button" 
                    className="reorder-btn" 
                    onClick={() => {
                      if (oi === 0) return;
                      const arr = [...question.openItems];
                      [arr[oi-1], arr[oi]] = [arr[oi], arr[oi-1]];
                      onUpdate({ openItems: arr.map((x,j2) => ({ ...x, order: j2 })) });
                    }} 
                    disabled={oi===0}
                  >
                    ↑
                  </button>
                  <button 
                    type="button" 
                    className="reorder-btn" 
                    onClick={() => {
                      if (oi === question.openItems.length-1) return;
                      const arr = [...question.openItems];
                      [arr[oi+1], arr[oi]] = [arr[oi], arr[oi+1]];
                      onUpdate({ openItems: arr.map((x,j2) => ({ ...x, order: j2 })) });
                    }} 
                    disabled={oi===question.openItems.length-1}
                  >
                    ↓
                  </button>
                  <button 
                    type="button" 
                    className="reorder-btn" 
                    onClick={() => onUpdate({ 
                      openItems: question.openItems.filter((_,j) => j!==oi).map((x,j2) => ({ ...x, order: j2 })) 
                    })}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const SurveyBuilder: React.FC<BuilderProps> = ({ onDone }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<NewQuestion[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addQuestion = () => {
    const newId = `question-${Date.now()}-${Math.random()}`;
    setQuestions(q => [...q, { 
      id: newId,
      text: '', 
      type: 'SINGLE_CHOICE', 
      order: q.length, 
      isRequired: false, 
      options: [], 
      openItems: [] 
    }]);
  };

  const updateQuestion = (idx: number, patch: Partial<NewQuestion>) => {
    setQuestions(qs => qs.map((q,i) => i === idx ? { ...q, ...patch } : q));
  };

  const deleteQuestion = (idx: number) => {
    setQuestions(qs => qs.filter((_,i) => i !== idx).map((q,i) => ({ ...q, order: i })));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        return reorderedItems.map((item, index) => ({
          ...item,
          order: index
        }));
      });
    }
  };

  const [errors, setErrors] = useState<string[]>([]);

  const validate = () => {
    const errs: string[] = [];
    if (!title.trim()) errs.push('Title required');
    questions.forEach((q,i) => {
      if (!q.text.trim()) errs.push(`Question ${i+1} text required`);
      if (['SINGLE_CHOICE','MULTI_CHOICE','RANKING'].includes(q.type) && q.options.length < 2) errs.push(`Question ${i+1} needs at least 2 options`);
      if (q.type === 'MULTI_OPEN_END' && q.openItems.length === 0) errs.push(`Question ${i+1} needs at least 1 sub-item`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    // Filter shapes per type
    const payload = {
      title,
      description,
      questions: questions.map(q => ({
        text: q.text,
        type: q.type,
        order: q.order,
        isRequired: q.isRequired,
        options: ['SINGLE_CHOICE','MULTI_CHOICE','RANKING'].includes(q.type) ? q.options : undefined,
        openItems: q.type === 'MULTI_OPEN_END' ? q.openItems : undefined
      }))
    };
    await axios.post('/api/surveys', payload);
    onDone();
  };

  return (
    <div>
      <h2>Create Survey</h2>
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

      <button disabled={!title || questions.length===0} onClick={save}>Save Survey</button>
      <button onClick={onDone}>Cancel</button>
    </div>
  );
};
