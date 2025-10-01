import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  IconButton,
  Paper,
  Chip,
  Divider,
  Alert,
  Container,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIndicatorIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AddCircle as AddCircleIcon,
  RemoveCircle as RemoveCircleIcon,
} from '@mui/icons-material';
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
  };

  return (
    <Paper
      ref={setNodeRef}
      sx={{
        ...style,
        opacity: isDragging ? 0.5 : 1,
        p: 2,
        mb: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
      elevation={isDragging ? 8 : 1}
      {...attributes}
    >
      <IconButton
        size="small"
        {...listeners}
        sx={{ 
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <DragIndicatorIcon />
      </IconButton>
      <TextField
        fullWidth
        size="small"
        value={option.text}
        placeholder="Option text"
        onChange={e => onUpdate({ text: e.target.value })}
        variant="outlined"
      />
      {questionType !== 'RANKING' && (
        <FormControlLabel
          control={
            <Checkbox
              checked={!!option.isExclusive}
              onChange={e => onUpdate({ isExclusive: e.target.checked })}
              size="small"
            />
          }
          label="Exclusive"
        />
      )}
      <IconButton
        size="small"
        onClick={onDelete}
        color="error"
      >
        <DeleteIcon />
      </IconButton>
    </Paper>
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
    <Card
      ref={setNodeRef}
      sx={{
        ...style,
        opacity: isDragging ? 0.5 : 1,
        mb: 2,
        cursor: isDragging ? 'grabbing' : 'default',
        border: '1px solid',
        borderColor: isDragging ? 'primary.main' : 'divider',
      }}
      elevation={isDragging ? 8 : 2}
      {...attributes}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <IconButton
            {...listeners}
            sx={{ 
              cursor: 'grab',
              '&:active': { cursor: 'grabbing' },
              mt: 0.5,
            }}
            size="small"
          >
            <DragIndicatorIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={`Question ${index + 1}`} size="small" color="primary" />
              <IconButton
                onClick={onDelete}
                color="error"
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
            
            <TextField
              fullWidth
              placeholder="Question text"
              value={question.text}
              onChange={e => onUpdate({ text: e.target.value })}
              variant="outlined"
              size="small"
            />
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Question Type</InputLabel>
                <Select
                  value={question.type}
                  label="Question Type"
                  onChange={e => onUpdate({ type: e.target.value })}
                >
                  {questionTypes.map(t => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={question.isRequired}
                    onChange={e => onUpdate({ isRequired: e.target.checked })}
                    size="small"
                  />
                }
                label="Required"
              />
            </Box>
            
            {/* Options for choice and ranking questions */}
            {['SINGLE_CHOICE','MULTI_CHOICE','RANKING'].includes(question.type) && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2">Options</Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addOption}
                    size="small"
                    variant="outlined"
                  >
                    Add Option
                  </Button>
                </Box>
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
              </Box>
            )}

            {/* Open items for multi open end questions */}
            {question.type === 'MULTI_OPEN_END' && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2">Open Items</Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={addOpenItem}
                    size="small"
                    variant="outlined"
                  >
                    Add Item
                  </Button>
                </Box>
                {question.openItems.map((o, oi) => (
                  <Box key={oi} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      value={o.label}
                      placeholder="Item label"
                      onChange={e => onUpdate({ 
                        openItems: question.openItems.map((oo,j) => 
                          j===oi ? { ...oo, label: e.target.value } : oo
                        ) 
                      })}
                    />
                    <IconButton
                      size="small"
                      onClick={() => onUpdate({ 
                        openItems: question.openItems.filter((_,j) => j!==oi).map((x,j2) => ({ ...x, order: j2 })) 
                      })}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
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
    <Container maxWidth="lg">
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom>
            Create Survey
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Survey Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              variant="outlined"
              required
            />
            
            <TextField
              fullWidth
              label="Survey Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              variant="outlined"
              multiline
              rows={2}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Questions</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={addQuestion}
              >
                Add Question
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </Alert>
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

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={onDone}
              startIcon={<CancelIcon />}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={!title || questions.length === 0}
              onClick={save}
              startIcon={<SaveIcon />}
            >
              Save Survey
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};
