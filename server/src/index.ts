import { createApp } from './app';

const port = process.env.PORT || 4000;
createApp().listen(port, () => {
  console.log(`SurveyOnline server running on port ${port}`);
});
