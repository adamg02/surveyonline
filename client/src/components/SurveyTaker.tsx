import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  LinearProgress,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormGroup,
  Checkbox,
  TextField,
  Paper,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  DragIndicator as DragIndicatorIcon,
  Send as SendIcon,
  ExitToApp as ExitToAppIcon,
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
        gap: 2,
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
      <Chip 
        label={index + 1} 
        size="small" 
        color="primary" 
        sx={{ minWidth: 32 }}
      />
      <Typography variant="body1" sx={{ flexGrow: 1 }}>
        {item.text}
      </Typography>
    </Paper>
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
      // Initialize with original option order and save to answers
      const initialItems = question.options.map((option: any, index: number) => ({
        id: option.id,
        text: option.text,
        rank: index + 1
      }));
      
      // Automatically save initial rankings to answers
      const initialRankings = initialItems.map((item: any, index: number) => ({
        optionId: item.id,
        rank: index + 1
      }));
      updateAnswer(question.id, { rankings: initialRankings });
      
      return initialItems;
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
    
    try {
      console.log('Submitting payload:', JSON.stringify(payload, null, 2));
      await axios.post('/api/responses', payload);
      setSubmitted(true);
    } catch (error: any) {
      console.error('Submit error:', error);
      console.error('Error response:', error.response?.data);
      setErrors([`Submission failed: ${error.response?.data?.error || error.message}`]);
    }
  };

  if (!survey) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <Typography>Loading...</Typography>
    </Box>
  );
  
  if (submitted) return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <CardContent sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h5" gutterBottom color="success.main">
          Thank you for your response!
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Your survey has been submitted successfully.
        </Typography>
        <Button 
          variant="contained" 
          onClick={onBack}
          startIcon={<ArrowBackIcon />}
        >
          Back to Surveys
        </Button>
      </CardContent>
    </Card>
  );

  const currentQuestion = getCurrentQuestion();
  if (!currentQuestion) return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Typography>No questions available.</Typography>
        <Button onClick={onBack} sx={{ mt: 2 }}>Back</Button>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom>
            {survey.title}
          </Typography>
          {survey.description && (
            <Typography variant="body1" color="text.secondary">
              {survey.description}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Progress indicator */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Question {currentQuestionIndex + 1} of {getTotalQuestions()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(((currentQuestionIndex + 1) / getTotalQuestions()) * 100)}% Complete
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={((currentQuestionIndex + 1) / getTotalQuestions()) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </CardContent>
      </Card>

      {/* Error display */}
      {errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </Alert>
      )}

      {/* Current question */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h6" component="h2">
              {currentQuestion.text}
            </Typography>
            {currentQuestion.isRequired && (
              <Chip label="Required" size="small" color="error" variant="outlined" />
            )}
          </Box>
          
          {/* Single Choice */}
          {currentQuestion.type === 'SINGLE_CHOICE' && (
            <FormControl component="fieldset">
              <RadioGroup
                value={answers[currentQuestion.id]?.optionId || ''}
                onChange={(e) => updateAnswer(currentQuestion.id, { optionId: e.target.value })}
              >
                {currentQuestion.options.map((o: any) => (
                  <FormControlLabel
                    key={o.id}
                    value={o.id}
                    control={<Radio />}
                    label={o.text}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          )}

          {/* Multi Choice */}
          {currentQuestion.type === 'MULTI_CHOICE' && (
            <FormGroup>
              {currentQuestion.options.map((o: any) => {
                const set = new Set((answers[currentQuestion.id]?.optionIds) || []);
                const toggle = () => { 
                  if (set.has(o.id)) set.delete(o.id); 
                  else set.add(o.id); 
                  updateAnswer(currentQuestion.id, { optionIds: Array.from(set) }); 
                };
                return (
                  <FormControlLabel
                    key={o.id}
                    control={
                      <Checkbox 
                        checked={set.has(o.id)} 
                        onChange={toggle} 
                      />
                    }
                    label={o.text}
                  />
                );
              })}
            </FormGroup>
          )}

          {/* Open End Text */}
          {currentQuestion.type === 'OPEN_END_TEXT' && (
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Your answer"
              value={answers[currentQuestion.id]?.text || ''}
              onChange={e => updateAnswer(currentQuestion.id, { text: e.target.value })}
              variant="outlined"
            />
          )}

          {/* Open End Numeric */}
          {currentQuestion.type === 'OPEN_END_NUMERIC' && (
            <TextField
              fullWidth
              type="number"
              placeholder="Enter a number"
              value={answers[currentQuestion.id]?.value || ''}
              onChange={e => {
                const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                updateAnswer(currentQuestion.id, { value });
              }}
              variant="outlined"
            />
          )}

          {/* Multi Open End */}
          {currentQuestion.type === 'MULTI_OPEN_END' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {currentQuestion.openItems.map((it: any) => (
                <TextField
                  key={it.id}
                  fullWidth
                  label={it.label}
                  value={answers[currentQuestion.id]?.items?.find((x: any) => x.openItemId === it.id)?.text || ''}
                  onChange={e => {
                    const existing = answers[currentQuestion.id]?.items || [];
                    const filtered = existing.filter((x: any) => x.openItemId !== it.id);
                    updateAnswer(currentQuestion.id, { items: [...filtered, { openItemId: it.id, text: e.target.value }] });
                  }}
                  variant="outlined"
                />
              ))}
            </Box>
          )}

          {/* Ranking */}
          {currentQuestion.type === 'RANKING' && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Drag to reorder items by preference (1st = most preferred):
              </Typography>
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
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="outlined"
              onClick={goToPreviousQuestion}
              disabled={isFirstQuestion()}
              startIcon={<ArrowBackIcon />}
            >
              Previous
            </Button>
            
            <Button
              variant="outlined"
              onClick={onBack}
              startIcon={<ExitToAppIcon />}
              color="error"
            >
              Exit Survey
            </Button>
            
            {!isLastQuestion() ? (
              <Button
                variant="contained"
                onClick={goToNextQuestion}
                endIcon={<ArrowForwardIcon />}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                onClick={submit}
                endIcon={<SendIcon />}
              >
                Submit Survey
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
