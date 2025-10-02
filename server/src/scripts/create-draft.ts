import { executeQuery, executeStatement, generateId } from '../db/snowflake';

async function createDraftSurvey() {
  try {
    const surveyId = generateId();
    await executeStatement(
      'INSERT INTO SURVEYS (ID, TITLE, DESCRIPTION, STATUS) VALUES (?, ?, ?, ?)',
      [surveyId, 'Draft Survey - Test', 'This is a draft survey for testing', 'DRAFT']
    );

    // Create questions
    const question1Id = generateId();
    await executeStatement(
      'INSERT INTO QUESTIONS (ID, SURVEY_ID, TEXT, TYPE, ORDER_NUM, IS_REQUIRED) VALUES (?, ?, ?, ?, ?, ?)',
      [question1Id, surveyId, 'What is your favorite color?', 'SINGLE_CHOICE', 0, true]
    );

    // Create options for first question
    const options = [
      { text: 'Red', order: 0 },
      { text: 'Blue', order: 1 },
      { text: 'Green', order: 2 }
    ];

    for (const option of options) {
      await executeStatement(
        'INSERT INTO OPTIONS (ID, QUESTION_ID, TEXT, ORDER_NUM) VALUES (?, ?, ?, ?)',
        [generateId(), question1Id, option.text, option.order]
      );
    }

    // Create second question
    const question2Id = generateId();
    await executeStatement(
      'INSERT INTO QUESTIONS (ID, SURVEY_ID, TEXT, TYPE, ORDER_NUM, IS_REQUIRED) VALUES (?, ?, ?, ?, ?, ?)',
      [question2Id, surveyId, 'Any feedback?', 'OPEN_END_TEXT', 1, false]
    );
    
    console.log('Created draft survey with ID:', surveyId);
    
    // List all surveys to verify
    const allSurveys = await executeQuery(`
      SELECT ID, TITLE, STATUS, CREATED_AT
      FROM SURVEYS
      ORDER BY CREATED_AT DESC
    `);
    
    console.log('All surveys in database:');
    allSurveys.forEach((s: any) => {
      console.log(`- ${s.TITLE} (${s.STATUS}) - ID: ${s.ID}`);
    });
    
  } catch (error) {
    console.error('Error creating draft survey:', error);
  } finally {
    const { closeConnection } = await import('../db/snowflake');
    await closeConnection();
  }
}

createDraftSurvey();