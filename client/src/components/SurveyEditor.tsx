import React, { useState, useEffect } from 'react';
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
        onChange={(e) => onUpdate({ text: e.target.value })}
        placeholder="Option text"
        variant="outlined"
      />
      {showExclusive && (
        <FormControlLabel
          control={
            <Checkbox
              checked={option.isExclusive || false}
              onChange={(e) => onUpdate({ isExclusive: e.target.checked })}
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
              placeholder="Enter your question"
              value={question.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              variant="outlined"
              size="small"
              label="Question Text"
            />
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Question Type</InputLabel>
                <Select
                  value={question.type}
                  label="Question Type"
                  onChange={(e) => onUpdate({ type: e.target.value })}
                >
                  {questionTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={question.isRequired}
                    onChange={(e) => onUpdate({ isRequired: e.target.checked })}
                    size="small"
                  />
                }
                label="Required"
              />
            </Box>

            {needsOptions && (
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
              </Box>
            )}

            {needsOpenItems && (
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
                {question.openItems.map((item, itemIndex) => (
                  <Box key={itemIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      value={item.label}
                      onChange={(e) => updateOpenItem(itemIndex, { label: e.target.value })}
                      placeholder="Item label"
                      variant="outlined"
                    />
                    <IconButton
                      size="small"
                      onClick={() => deleteOpenItem(itemIndex)}
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
    <Container maxWidth="lg">
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom>
            {surveyId ? 'Edit Survey' : 'Create Survey'}
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
              disabled={!title || questions.length === 0 || loading}
              onClick={save}
              startIcon={<SaveIcon />}
            >
              {loading ? 'Saving...' : (surveyId ? 'Update Survey' : 'Save Survey')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};