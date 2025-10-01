// Add this temporarily to SurveyTaker component to debug the submit payload
const debugSubmit = async () => {
  console.log('=== DEBUG SUBMIT ===');
  console.log('Survey:', survey);
  console.log('Answers:', answers);
  
  const payload = { 
    surveyId, 
    answers: Object.entries(answers).map(([questionId, payload]) => ({ questionId, payload })) 
  };
  
  console.log('Submit payload:', JSON.stringify(payload, null, 2));
  
  // Try the actual submission
  try {
    const response = await fetch('/api/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(payload)
    });
    
    console.log('Response status:', response.status);
    const responseData = await response.text();
    console.log('Response data:', responseData);
    
    if (!response.ok) {
      console.error('Submit failed:', responseData);
    }
  } catch (error) {
    console.error('Submit error:', error);
  }
};