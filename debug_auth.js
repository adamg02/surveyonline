const axios = require('axios');

async function testAuth() {
  try {
    console.log('Testing authentication flow...');
    
    // First, login as admin
    const loginResponse = await axios.post('http://localhost:4000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    console.log('Login successful:', loginResponse.data);
    
    const token = loginResponse.data.token;
    
    // Then, get surveys with the token
    const surveysResponse = await axios.get('http://localhost:4000/api/surveys', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Surveys response:', surveysResponse.data);
    
    // Test without token (anonymous)
    const anonymousResponse = await axios.get('http://localhost:4000/api/surveys');
    console.log('Anonymous surveys response:', anonymousResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAuth();