import { DatabaseSync } from 'node:sqlite';

const SEED = [
  ['Frontend Developer Intern', 'Brightwave', 'Remote', 'Build accessible React interfaces and work with design systems.'],
  ['Backend Developer Intern', 'DataForge', 'Bengaluru', 'Design REST APIs, write SQL, and add automated tests.'],
  ['Full Stack Intern', 'Cloudnest', 'Coimbatore', 'Ship features end to end: UI, API, and database.'],
  ['Cybersecurity Intern', 'ShieldOps', 'Remote', 'Help audit web apps against the OWASP Top 10.'],
  ['DevOps Intern', 'PipelineIO', 'Chennai', 'Automate CI/CD pipelines and monitor deployments.'],
  ['QA Automation Intern', 'TestLoop', 'Hyderabad', 'Write end-to-end tests and improve release quality.'],
];

export function openDb(path = ':memory:') {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS internships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      internship_id INTEGER NOT NULL REFERENCES internships(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      resume_url TEXT,
      cover_letter TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (internship_id, email)
    );
  `);
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM internships').get();
  if (n === 0) {
    const ins = db.prepare(
      'INSERT INTO internships (title, company, location, description) VALUES (?, ?, ?, ?)'
    );
    for (const row of SEED) ins.run(...row);
  }
  return db;
}
