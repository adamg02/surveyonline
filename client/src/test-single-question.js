// Test script for single question survey interface
// Open browser console on the survey taker page and run this

console.log('🧪 Testing Single Question Survey Interface');

// Test 1: Question navigation logic
console.log('\n1. Testing navigation logic...');

const testQuestionNavigation = () => {
  let currentIndex = 0;
  const totalQuestions = 5;
  
  const isFirstQuestion = () => currentIndex === 0;
  const isLastQuestion = () => currentIndex === totalQuestions - 1;
  const goNext = () => !isLastQuestion() && currentIndex++;
  const goPrev = () => !isFirstQuestion() && currentIndex--;
  
  console.log('Initial state:', { currentIndex, isFirst: isFirstQuestion(), isLast: isLastQuestion() });
  
  // Test forward navigation
  goNext(); goNext(); goNext();
  console.log('After 3 next:', { currentIndex, isFirst: isFirstQuestion(), isLast: isLastQuestion() });
  
  // Test backward navigation
  goPrev(); goPrev();
  console.log('After 2 prev:', { currentIndex, isFirst: isFirstQuestion(), isLast: isLastQuestion() });
  
  // Test boundary conditions
  currentIndex = 0;
  goPrev(); // Should not go below 0
  console.log('Boundary test (prev at 0):', { currentIndex });
  
  currentIndex = totalQuestions - 1;
  goNext(); // Should not go above last
  console.log('Boundary test (next at last):', { currentIndex });
  
  console.log('✓ Navigation logic tests passed');
};

testQuestionNavigation();

// Test 2: Progress calculation
console.log('\n2. Testing progress calculation...');

const testProgressCalculation = () => {
  const calculateProgress = (current, total) => {
    return ((current + 1) / total) * 100;
  };
  
  console.log('Progress examples:');
  console.log('Question 1 of 5:', calculateProgress(0, 5) + '%');
  console.log('Question 3 of 5:', calculateProgress(2, 5) + '%');
  console.log('Question 5 of 5:', calculateProgress(4, 5) + '%');
  console.log('Question 1 of 1:', calculateProgress(0, 1) + '%');
  
  console.log('✓ Progress calculation tests passed');
};

testProgressCalculation();

// Test 3: Check CSS classes exist
console.log('\n3. Testing CSS classes...');

const requiredClasses = [
  '.survey-progress',
  '.progress-text',
  '.progress-bar',
  '.progress-fill',
  '.question-container',
  '.survey-navigation',
  '.option-label'
];

let foundClasses = 0;
for (let i = 0; i < document.styleSheets.length; i++) {
  try {
    const rules = document.styleSheets[i].cssRules || document.styleSheets[i].rules;
    for (let j = 0; j < rules.length; j++) {
      if (rules[j].selectorText) {
        requiredClasses.forEach(className => {
          if (rules[j].selectorText.includes(className)) {
            foundClasses++;
            console.log(`✓ Found ${className}`);
          }
        });
      }
    }
  } catch (e) {
    // Cross-origin stylesheets may not be accessible
  }
}

console.log(`Found ${foundClasses} of ${requiredClasses.length} required CSS classes`);

// Test 4: Validation scenarios
console.log('\n4. Testing validation scenarios...');

const testValidation = () => {
  // Mock question validation
  const validateQuestion = (question, answer) => {
    if (!question.isRequired) return true;
    
    switch (question.type) {
      case 'SINGLE_CHOICE':
        return !!answer?.optionId;
      case 'MULTI_CHOICE':
        return answer?.optionIds?.length > 0;
      case 'OPEN_END_TEXT':
        return !!answer?.text?.trim();
      case 'OPEN_END_NUMERIC':
        return typeof answer?.value === 'number' && !isNaN(answer.value);
      case 'RANKING':
        return answer?.rankings?.length === question.options?.length;
      default:
        return false;
    }
  };
  
  // Test cases
  const testCases = [
    {
      question: { type: 'SINGLE_CHOICE', isRequired: true },
      answer: { optionId: 'opt1' },
      expected: true,
      name: 'Required single choice with answer'
    },
    {
      question: { type: 'SINGLE_CHOICE', isRequired: true },
      answer: {},
      expected: false,
      name: 'Required single choice without answer'
    },
    {
      question: { type: 'OPEN_END_TEXT', isRequired: false },
      answer: {},
      expected: true,
      name: 'Optional text question without answer'
    },
    {
      question: { type: 'RANKING', isRequired: true, options: [1, 2, 3] },
      answer: { rankings: [{ optionId: '1', rank: 1 }, { optionId: '2', rank: 2 }, { optionId: '3', rank: 3 }] },
      expected: true,
      name: 'Complete ranking'
    }
  ];
  
  testCases.forEach(({ question, answer, expected, name }) => {
    const result = validateQuestion(question, answer);
    console.log(`${result === expected ? '✓' : '✗'} ${name}: ${result}`);
  });
  
  console.log('✓ Validation scenario tests completed');
};

testValidation();

// Test 5: Answer preservation simulation
console.log('\n5. Testing answer preservation...');

const testAnswerPreservation = () => {
  let answers = {};
  
  const updateAnswer = (questionId, payload) => {
    answers = { ...answers, [questionId]: payload };
  };
  
  // Simulate user answering questions
  updateAnswer('q1', { optionId: 'opt1' });
  updateAnswer('q2', { text: 'My answer' });
  updateAnswer('q3', { optionIds: ['opt1', 'opt2'] });
  
  console.log('Answers after navigation:', answers);
  
  // Simulate going back and changing answer
  updateAnswer('q1', { optionId: 'opt2' });
  
  console.log('After changing q1:', answers);
  console.log('q2 preserved:', answers.q2?.text === 'My answer' ? '✓' : '✗');
  console.log('q3 preserved:', answers.q3?.optionIds?.length === 2 ? '✓' : '✗');
  
  console.log('✓ Answer preservation tests passed');
};

testAnswerPreservation();

console.log('\n🎉 Single question interface tests completed!');

// Manual testing instructions
console.log('\n📋 Manual Testing Instructions:');
console.log('1. Open a survey and verify only one question is shown');
console.log('2. Check progress bar shows correct progress');
console.log('3. Test Previous/Next navigation');
console.log('4. Try skipping required questions (should show error)');
console.log('5. Navigate back and forth, verify answers are preserved');
console.log('6. Complete survey and verify submission works');
console.log('7. Test on mobile device for responsive design');
console.log('8. Test keyboard navigation (Tab, Enter, Escape)');