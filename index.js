import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3000;
createApp({ dbPath: process.env.DB_PATH || 'internhub.db' }).listen(port, () => {
  console.log(`InternHub running at http://localhost:${port}`);
});
