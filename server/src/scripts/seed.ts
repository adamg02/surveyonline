import 'dotenv/config';
import { executeQuery, executeStatement, generateId } from '../db/snowflake';
import bcrypt from 'bcryptjs';

async function main() {
  // Set the correct database, warehouse, and schema context  
  await executeStatement(`USE WAREHOUSE ${process.env.SNOWFLAKE_WAREHOUSE}`);
  await executeStatement(`USE DATABASE ${process.env.SNOWFLAKE_DATABASE}`);
  await executeStatement(`USE SCHEMA "${process.env.SNOWFLAKE_SCHEMA}"`);
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  
  const existing = await executeQuery('SELECT * FROM USERS WHERE EMAIL = ?', [adminEmail]);
  if (existing.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await executeStatement(
      'INSERT INTO USERS (ID, EMAIL, PASSWORD, ROLE) VALUES (?, ?, ?, ?)',
      [generateId(), adminEmail, hash, 'ADMIN']
    );
    console.log('Created admin:', adminEmail);
    if (process.env.NODE_ENV !== 'production') {
      console.log('Admin password:', adminPassword);
    }
  } else {
    console.log('Admin already exists');
  }

  const surveyCount = await executeQuery('SELECT COUNT(*) as COUNT FROM SURVEYS');
  if (surveyCount[0].COUNT === 0) {
    const surveyId = generateId();
    await executeStatement(
      'INSERT INTO SURVEYS (ID, TITLE, DESCRIPTION, STATUS) VALUES (?, ?, ?, ?)',
      [surveyId, 'Sample Product Feedback', 'Demo survey for seeding', 'ACTIVE']
    );

    // Create questions and options
    const questions = [
      {
        id: generateId(),
        text: 'Overall satisfaction',
        type: 'RANKING',
        order: 0,
        isRequired: true,
        options: [
          { text: 'UI', order: 0 },
          { text: 'Performance', order: 1 },
          { text: 'Support', order: 2 }
        ]
      },
      {
        id: generateId(),
        text: 'Would you recommend us?',
        type: 'SINGLE_CHOICE',
        order: 1,
        isRequired: true,
        options: [
          { text: 'Yes', order: 0 },
          { text: 'No', order: 1 }
        ]
      },
      {
        id: generateId(),
        text: 'Features you use',
        type: 'MULTI_CHOICE',
        order: 2,
        isRequired: false,
        options: [
          { text: 'Dashboard', order: 0 },
          { text: 'Exports', order: 1 },
          { text: 'API', order: 2 }
        ]
      },
      {
        id: generateId(),
        text: 'Any other comments',
        type: 'OPEN_END_TEXT',
        order: 3,
        isRequired: false,
        options: []
      },
      {
        id: generateId(),
        text: 'Monthly spend ($)',
        type: 'OPEN_END_NUMERIC',
        order: 4,
        isRequired: false,
        options: []
      },
      {
        id: generateId(),
        text: 'List up to 3 improvements',
        type: 'MULTI_OPEN_END',
        order: 5,
        isRequired: false,
        options: [],
        openItems: [
          { label: 'Idea 1', order: 0 },
          { label: 'Idea 2', order: 1 },
          { label: 'Idea 3', order: 2 }
        ]
      }
    ];

    for (const question of questions) {
      await executeStatement(
        'INSERT INTO QUESTIONS (ID, SURVEY_ID, TEXT, TYPE, ORDER_NUM, IS_REQUIRED) VALUES (?, ?, ?, ?, ?, ?)',
        [question.id, surveyId, question.text, question.type, question.order, question.isRequired]
      );

      // Add options if any
      for (const option of question.options) {
        await executeStatement(
          'INSERT INTO OPTIONS (ID, QUESTION_ID, TEXT, ORDER_NUM) VALUES (?, ?, ?, ?)',
          [generateId(), question.id, option.text, option.order]
        );
      }

      // Add open items if any
      if (question.openItems) {
        for (const openItem of question.openItems) {
          await executeStatement(
            'INSERT INTO OPEN_ITEMS (ID, QUESTION_ID, LABEL, ORDER_NUM) VALUES (?, ?, ?, ?)',
            [generateId(), question.id, openItem.label, openItem.order]
          );
        }
      }
    }

    console.log('Seeded sample survey.');
  } else {
    console.log('Surveys already present, skipping sample survey.');
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { 
  const { closeConnection } = await import('../db/snowflake');
  await closeConnection();
});