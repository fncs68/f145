// --- filepath: lib/db.ts ---
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'onemcn.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    target_exam TEXT DEFAULT 'neet',
    role TEXT DEFAULT 'student',
    is_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, slug TEXT UNIQUE, description TEXT
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER REFERENCES exams(id),
    name TEXT, order_index INTEGER
  );

  CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER REFERENCES subjects(id),
    name TEXT, weightage REAL, difficulty TEXT, order_index INTEGER
  );

  CREATE TABLE IF NOT EXISTS explanations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER REFERENCES chapters(id),
    content_markdown TEXT, video_url TEXT, pdf_url TEXT, key_points TEXT
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER REFERENCES chapters(id),
    type TEXT DEFAULT 'mcq_single',
    text TEXT, options TEXT, correct_answer INTEGER,
    explanation TEXT, marks REAL DEFAULT 4, negative_marks REAL DEFAULT 1,
    difficulty TEXT, subject_id INTEGER, exam_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT, chapter_id INTEGER, time_limit_seconds INTEGER
  );

  CREATE TABLE IF NOT EXISTS quiz_questions (
    quiz_id INTEGER REFERENCES quizzes(id),
    question_id INTEGER REFERENCES questions(id),
    order_index INTEGER
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER REFERENCES flashcard_decks(id),
    front TEXT, back TEXT, hint TEXT
  );

  CREATE TABLE IF NOT EXISTS flashcard_decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT, chapter_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS flashcard_reviews (
    user_id TEXT, card_id INTEGER,
    ease_factor REAL DEFAULT 2.5, interval INTEGER DEFAULT 0,
    repetitions INTEGER DEFAULT 0, next_review TEXT,
    PRIMARY KEY (user_id, card_id)
  );

  CREATE TABLE IF NOT EXISTS mock_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER, title TEXT, total_marks REAL,
    duration_minutes INTEGER, total_questions INTEGER,
    difficulty TEXT, is_premium INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS mock_test_questions (
    mock_test_id INTEGER REFERENCES mock_tests(id),
    question_id INTEGER REFERENCES questions(id),
    order_index INTEGER
  );

  CREATE TABLE IF NOT EXISTS mock_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT, mock_test_id INTEGER,
    start_time TEXT, submit_time TEXT,
    total_score REAL, status TEXT DEFAULT 'in_progress'
  );

  CREATE TABLE IF NOT EXISTS mock_answers (
    attempt_id INTEGER REFERENCES mock_attempts(id),
    question_id INTEGER, selected_option INTEGER,
    is_correct INTEGER, time_spent INTEGER
  );

  CREATE TABLE IF NOT EXISTS pyqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER, subject_id INTEGER, year INTEGER,
    question_text TEXT, options TEXT, correct_answer INTEGER,
    solution_text TEXT, marks REAL
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT, pack_id TEXT,
    start_date TEXT, end_date TEXT,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    user_id TEXT, chapter_id INTEGER,
    completion_percent REAL DEFAULT 0,
    last_accessed TEXT,
    PRIMARY KEY (user_id, chapter_id)
  );

  -- Seed exams
  INSERT OR IGNORE INTO exams (id, name, slug) VALUES (1, 'NEET UG', 'neet');
  INSERT OR IGNORE INTO exams (id, name, slug) VALUES (2, 'JEE Main', 'jee-main');
  INSERT OR IGNORE INTO exams (id, name, slug) VALUES (3, 'CUET UG', 'cuet');

  -- Seed subjects for NEET
  INSERT OR IGNORE INTO subjects (id, exam_id, name, order_index) VALUES (1, 1, 'Physics', 1);
  INSERT OR IGNORE INTO subjects (id, exam_id, name, order_index) VALUES (2, 1, 'Chemistry', 2);
  INSERT OR IGNORE INTO subjects (id, exam_id, name, order_index) VALUES (3, 1, 'Biology', 3);

  -- Seed chapters (a few for Physics)
  INSERT OR IGNORE INTO chapters (id, subject_id, name, weightage, difficulty, order_index) VALUES (1, 1, 'Units & Measurements', 3, 'easy', 1);
  INSERT OR IGNORE INTO chapters (id, subject_id, name, weightage, difficulty, order_index) VALUES (2, 1, 'Kinematics', 5, 'medium', 2);
  INSERT OR IGNORE INTO chapters (id, subject_id, name, weightage, difficulty, order_index) VALUES (3, 1, 'Laws of Motion', 8, 'medium', 3);

  -- Seed a sample explanation
  INSERT OR IGNORE INTO explanations (chapter_id, content_markdown, key_points) VALUES (3,
    '# Laws of Motion\n\nNewton''s First Law: An object remains at rest or in uniform motion unless acted upon by an external force.\n\nNewton''s Second Law: F = dp/dt = ma (for constant mass).\n\nNewton''s Third Law: For every action, there is an equal and opposite reaction.',
    'Inertia,F=ma,Action-Reaction'
  );

  -- Seed a few questions for Laws of Motion
  INSERT OR IGNORE INTO questions (id, chapter_id, type, text, options, correct_answer, explanation, marks, negative_marks, subject_id, exam_id)
  VALUES (1, 3, 'mcq_single',
    'A body of mass 5 kg is acted upon by a net force of 10 N. Its acceleration is:',
    '["0.5 m/s²", "2 m/s²", "50 m/s²", "5 m/s²"]', 1,
    'F = ma => a = F/m = 10/5 = 2 m/s²', 4, 1, 1, 1);

  INSERT OR IGNORE INTO questions (id, chapter_id, type, text, options, correct_answer, explanation, marks, negative_marks, subject_id, exam_id)
  VALUES (2, 3, 'mcq_single',
    'Newton''s third law implies:',
    '["Forces always occur in pairs", "Action and reaction act on same body", "Force is proportional to mass", "None"]', 0,
    'Forces always occur in action-reaction pairs.', 4, 1, 1, 1);

  -- Seed a quiz
  INSERT OR IGNORE INTO quizzes (id, title, chapter_id, time_limit_seconds) VALUES (1, 'Laws of Motion - Quick Quiz', 3, 600);
  INSERT OR IGNORE INTO quiz_questions (quiz_id, question_id, order_index) VALUES (1, 1, 1);
  INSERT OR IGNORE INTO quiz_questions (quiz_id, question_id, order_index) VALUES (1, 2, 2);

  -- Seed a flashcard deck
  INSERT OR IGNORE INTO flashcard_decks (id, title, chapter_id) VALUES (1, 'Laws of Motion Deck', 3);
  INSERT OR IGNORE INTO flashcards (deck_id, front, back, hint) VALUES (1, 'What is inertia?', 'Resistance to change in state of motion.', 'Property of mass');
  INSERT OR IGNORE INTO flashcards (deck_id, front, back, hint) VALUES (1, 'State Newton''s Second Law', 'F = ma', 'Force = mass x acceleration');

  -- Seed a mock test for NEET
  INSERT OR IGNORE INTO mock_tests (id, exam_id, title, total_marks, duration_minutes, total_questions, difficulty)
  VALUES (1, 1, 'NEET Full Mock #1 (Sample)', 8, 10, 2, 'easy');
  INSERT OR IGNORE INTO mock_test_questions (mock_test_id, question_id, order_index) VALUES (1, 1, 1);
  INSERT OR IGNORE INTO mock_test_questions (mock_test_id, question_id, order_index) VALUES (1, 2, 2);
`);

export default db;


// --- filepath: lib/utils.ts ---
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'onemcn-super-secret-key';

export function generateToken(user: { id: string; role: string }) {
  return jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// SM-2 spaced repetition algorithm
export function sm2(quality: number, prev: { easeFactor: number; interval: number; repetitions: number }) {
  let { easeFactor, interval, repetitions } = prev;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);

    repetitions += 1;
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  return { easeFactor, interval, repetitions, nextReview: nextReview.toISOString() };
}


// --- filepath: lib/featureGate.ts ---
import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from './utils';
import db from './db';

export function withAuth(handler: (req: any, res: NextApiResponse) => any) {
  return (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid token' });
    (req as any).userId = payload.userId;
    (req as any).role = payload.role;
    return handler(req, res);
  };
}

export function checkMockLimit(userId: string): boolean {
  const activeSub = db.prepare(
    `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' AND end_date >= datetime('now')`
  ).get(userId);
  if (activeSub) return true; // Pro user, unlimited

  const { count } = db.prepare(
    `SELECT COUNT(*) as count FROM mock_attempts WHERE user_id = ? AND start_time >= date('now','start of month')`
  ).get(userId) as any;
  return count < 2;
}

export function adminOnly(handler: any) {
  return withAuth((req, res) => {
    if ((req as any).role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    return handler(req, res);
  });
}


// --- filepath: lib/api.ts ---
const BASE_URL = '/api';

export async function request(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('onemcn_token') : null;
  const headers: any = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/auth';
    return null;
  }
  return res.json();
}

export const api = {
  auth: {
    signup: (data: any) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    verifySignup: (data: any) => request('/auth/verify-signup', { method: 'POST', body: JSON.stringify(data) }),
    sendOtp: (data: any) => request('/auth/send-otp', { method: 'POST', body: JSON.stringify(data) }),
    verifyOtp: (data: any) => request('/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }),
  },
  dashboard: {
    stats: () => request('/user/dashboard-stats'),
    subscription: () => request('/user/subscription'),
  },
  mockTests: {
    list: () => request('/mock-tests'),
    start: (id: number) => request(`/mock-tests/${id}/start`, { method: 'POST' }),
    submit: (attemptId: number, data: any) => request(`/mock-attempts/${attemptId}/submit`, { method: 'POST', body: JSON.stringify(data) }),
  },
  quizzes: {
    get: (id: number) => request(`/quizzes/${id}`),
    start: (id: number) => request(`/quizzes/${id}/start`, { method: 'POST' }),
    submit: (attemptId: number, data: any) => request(`/quiz-attempts/${attemptId}/submit`, { method: 'POST', body: JSON.stringify(data) }),
  },
  flashcard: {
    reviewSession: (deckId: number, limit = 20) => request(`/user/flashcard-session?deckId=${deckId}&limit=${limit}`),
    submitReview: (cardId: number, quality: number) => request('/user/flashcard-reviews', { method: 'POST', body: JSON.stringify({ cardId, quality }) }),
  },
  packs: () => request('/packs'),
  subscribe: (packId: string) => request('/subscriptions', { method: 'POST', body: JSON.stringify({ packId }) }),
};


// --- filepath: components/Logo.tsx ---
export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <svg className={className} viewBox="0 0 32 32" fill="currentColor">
        <path d="M8 28V6h10v22H8z" />
        <path d="M22 28L28 14 34 28H22z" />
        <circle cx="8" cy="6" r="4" />
        <circle cx="18" cy="6" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
      <span className="text-2xl font-bold tracking-tight text-gray-900">OneMCN</span>
    </div>
  );
}


// --- filepath: components/Navbar.tsx ---
import { useRouter } from 'next/router';
import { useState } from 'react';
import Logo from './Logo';

export default function Navbar() {
  const router = useRouter();
  const [exam, setExam] = useState('NEET');
  const exams = ['NEET', 'JEE', 'CUET'];

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={() => router.push('/dashboard')} className="flex-shrink-0">
          <Logo className="h-8 w-8 text-gray-900" />
        </button>
        <div className="hidden sm:flex bg-gray-100 rounded-full p-1 gap-1">
          {exams.map((e) => (
            <button
              key={e}
              onClick={() => setExam(e)}
              className={`px-5 py-1.5 text-sm font-medium rounded-full transition ${
                exam === e ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-gray-900">
          <button onClick={() => router.push('/flashcards-review')} className="p-1 hover:bg-gray-100 rounded-md">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1-1-2.5-2-4-2-2.5 0-5 2-5 5s2.5 5 5 5c1.5 0 3-1 4-2m0 0c1 1 2.5 2 4 2 2.5 0 5-2 5-5s-2.5-5-5-5c-1.5 0-3 1-4 2z" />
            </svg>
          </button>
          <button onClick={() => router.push('/auth')} className="p-1 hover:bg-gray-100 rounded-md">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}


// --- filepath: pages/mock-tests/index.tsx ---
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function MockTestHub() {
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    api.mockTests.list().then(setTests);
    api.dashboard.subscription().then(setSubscription);
  }, []);

  const freeMocksLeft = subscription?.limits?.mocksPerMonth ?? 2;
  const isPro = subscription?.active;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Mock Tests</h1>
      <p className="text-gray-500 mb-8">Full‑length & sectional practice papers.</p>
      {!isPro && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-700">
          {freeMocksLeft > 0
            ? `You have ${freeMocksLeft} free mock test(s) left this month.`
            : 'You have used all free mock tests this month.'}
          <button onClick={() => router.push('/pricing')} className="ml-4 underline font-medium text-gray-900">
            Upgrade for unlimited
          </button>
        </div>
      )}
      <div className="space-y-4">
        {tests.map((test) => (
          <div key={test.id} className="border border-gray-200 rounded-xl p-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{test.title}</h2>
              <div className="flex gap-4 mt-1 text-sm text-gray-500">
                <span>{test.total_questions} Q</span>
                <span>{test.duration_minutes} min</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (!isPro && freeMocksLeft <= 0) return router.push('/pricing');
                router.push(`/mock-tests/${test.id}`);
              }}
              className="bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800"
            >
              Start Test
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


// --- filepath: pages/mock-tests/[id]/session.tsx ---
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function TestSession() {
  const router = useRouter();
  const { id } = router.query;
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [marked, setMarked] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.mockTests.start(Number(id)).then((data) => {
      if (data.error) return router.push('/pricing');
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setTimeLeft(data.durationMinutes * 60);
    });
  }, [id]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && attemptId && !isSubmitting) handleSubmit();
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const res = await api.mockTests.submit(attemptId!, { answers, timeTakenSeconds: (questions.length > 0 ? 120 * 60 - timeLeft : 0) });
    router.push(`/mock-tests/${id}/result?score=${res.totalScore}&total=${res.totalMarks}`);
  };

  if (questions.length === 0) return <div className="p-10 text-center">Loading test...</div>;

  const q = questions[current];
  const answeredCount = Object.keys(answers).length;
  const notAnsweredCount = questions.length - answeredCount;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6">
        <h1 className="text-lg font-bold">Mock Test</h1>
        <div className="flex items-center gap-6">
          <span className="text-sm text-gray-500">{answeredCount} answered · {notAnsweredCount} left</span>
          <span className="text-xl font-mono font-bold">{formatTime(timeLeft)}</span>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm text-gray-500 mb-4">Question {current + 1} of {questions.length}</p>
            <p className="text-lg text-gray-900 mb-8">{q.text}</p>
            <div className="space-y-3">
              {q.options.map((opt: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.attemptQuestionId]: idx }))}
                  className={`w-full text-left p-4 border rounded-xl flex items-center gap-3 ${
                    answers[q.attemptQuestionId] === idx ? 'border-gray-900 bg-gray-100' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                    answers[q.attemptQuestionId] === idx ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300'
                  }`}>{String.fromCharCode(65 + idx)}</span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <button onClick={() => setMarked((prev) => prev.includes(q.attemptQuestionId) ? prev.filter(id => id !== q.attemptQuestionId) : [...prev, q.attemptQuestionId])}
                className={`text-sm px-4 py-2 rounded-lg border ${marked.includes(q.attemptQuestionId) ? 'bg-gray-100 border-gray-400' : 'border-gray-200'}`}>
                {marked.includes(q.attemptQuestionId) ? '✓ Marked' : 'Mark for review'}
              </button>
              <div className="flex gap-3">
                <button disabled={current === 0} onClick={() => setCurrent(c => c - 1)} className="px-4 py-2 border rounded-lg disabled:opacity-40">Previous</button>
                <button disabled={current === questions.length - 1} onClick={() => setCurrent(c => c + 1)} className="px-4 py-2 border rounded-lg disabled:opacity-40">Next</button>
              </div>
            </div>
          </div>
        </main>
        <aside className="w-72 border-l border-gray-200 p-4 flex flex-col">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">Question Palette</h3>
          <div className="grid grid-cols-5 gap-2 mb-6">
            {questions.map((q, idx) => {
              const isAnswered = answers.hasOwnProperty(q.attemptQuestionId);
              const isMarked = marked.includes(q.attemptQuestionId);
              const isCurrent = idx === current;
              let bg = 'bg-gray-50 border-gray-200 text-gray-600';
              if (isAnswered && !isMarked) bg = 'bg-gray-800 text-white border-gray-800';
              if (isMarked) bg = 'bg-white border-gray-400 text-gray-900 font-medium';
              if (isCurrent) bg = 'bg-gray-900 text-white ring-2 ring-gray-300';
              return (
                <button key={q.attemptQuestionId} onClick={() => setCurrent(idx)}
                  className={`w-10 h-10 rounded-md border text-sm ${bg}`}>{idx + 1}</button>
              );
            })}
          </div>
          <button onClick={handleSubmit} className="mt-auto w-full bg-gray-900 text-white py-2 rounded-lg font-semibold">Submit Test</button>
        </aside>
      </div>
    </div>
  );
}


// --- filepath: pages/index.tsx ---
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';

export default function Home() {
  const router = useRouter();
  const exams = [
    { name: 'NEET', desc: 'Physics, Chemistry, Biology', icon: '🔬' },
    { name: 'JEE', desc: 'Main & Advanced', icon: '🔧' },
    { name: 'CUET', desc: 'Language & Domain Subjects', icon: '📖' },
  ];
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-6xl mx-auto py-24 px-4 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">Prepare Smarter with <span className="text-gray-900">OneMCN</span></h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-16">Chapter explanations, smart flashcards, PYQs & mock tests – all in one place.</p>
        <div className="grid md:grid-cols-3 gap-8">
          {exams.map((exam) => (
            <div key={exam.name} onClick={() => { localStorage.setItem('targetExam', exam.name.toLowerCase()); router.push('/dashboard'); }}
              className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition cursor-pointer">
              <div className="text-4xl mb-4">{exam.icon}</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{exam.name}</h3>
              <p className="text-gray-600">{exam.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-12 text-sm text-gray-400">Already have an account? <a href="/auth" className="underline font-medium text-gray-900">Log in</a></p>
      </main>
    </div>
  );
}


// --- filepath: pages/mock-tests/[id].tsx ---
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function TestLauncher() {
  const router = useRouter();
  const { id } = router.query;
  const [test, setTest] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    api.mockTests.list().then(tests => setTest(tests.find((t: any) => t.id == id)));
  }, [id]);

  if (!test) return null;
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full border border-gray-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold">{test.title}</h1>
        <p className="text-sm text-gray-500 mb-4">{test.total_questions} Q · {test.duration_minutes} min</p>
        <div className="bg-gray-50 border p-4 rounded-xl mb-6">
          <h3 className="font-semibold">Instructions</h3>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            <li>Answer all questions; negative marking applies.</li>
            <li>Use the palette to navigate.</li>
            <li>Submit before time runs out.</li>
          </ul>
        </div>
        <button onClick={() => router.push(`/mock-tests/${id}/session`)} className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold">Begin Test</button>
      </div>
    </div>
  );
}


// --- filepath: pages/api/auth/signup.ts ---
import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { generateOtp } from '../../../lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, password, targetExam } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  const hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  try {
    db.prepare(`INSERT INTO users (id, name, email, password_hash, target_exam) VALUES (?, ?, ?, ?, ?)`).run(id, name, email, hash, targetExam || 'neet');
    const otp = generateOtp();
    console.log(`[OTP for ${email}]: ${otp}`);
    res.status(200).json({ message: 'OTP sent to email (check console)', otp }); // demo reveals OTP
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint')) return res.status(409).json({ error: 'Email already used' });
    res.status(500).json({ error: 'Server error' });
  }
}


// --- filepath: pages/api/auth/verify-signup.ts ---
import db from '../../../lib/db';
import { generateToken } from '../../../lib/utils';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, otp } = req.body;
  const user = db.prepare(`SELECT * FROM users WHERE email = ? AND is_verified = 0`).get(email) as any;
  if (!user) return res.status(400).json({ error: 'Invalid request' });
  // In production we'd check OTP from Redis/DB; here we accept any demo OTP
  // For security, in demo mode we'll just approve verification
  db.prepare(`UPDATE users SET is_verified = 1 WHERE email = ?`).run(email);
  const token = generateToken({ id: user.id, role: user.role });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}


// --- filepath: pages/api/auth/login.ts ---
import db from '../../../lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '../../../lib/utils';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body;
  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as any;
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (!user.is_verified) return res.status(403).json({ error: 'Please verify email first' });
  const token = generateToken({ id: user.id, role: user.role });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}


// --- filepath: pages/api/user/subscription.ts ---
import { withAuth } from '../../../lib/featureGate';
import db from '../../../lib/db';

export default withAuth(async (req, res) => {
  const userId = (req as any).userId;
  const sub = db.prepare(`SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' AND end_date >= datetime('now')`).get(userId);
  if (sub) {
    return res.json({ active: true, pack: (sub as any).pack_id, expiresAt: (sub as any).end_date, features: { unlimitedMocks: true } });
  }
  res.json({ active: false, limits: { mocksPerMonth: 2, quizzesPerDay: 3, flashcardsPerDay: 10 } });
});


// --- filepath: pages/api/user/flashcard-reviews.ts ---
import { withAuth } from '../../../lib/featureGate';
import db from '../../../lib/db';

export default withAuth(async (req, res) => {
  const userId = (req as any).userId;
  const { deckId, limit = 20 } = req.query;

  const cards = db.prepare(`
    SELECT f.*, r.ease_factor, r.interval, r.repetitions, r.next_review
    FROM flashcards f
    LEFT JOIN flashcard_reviews r ON f.id = r.card_id AND r.user_id = ?
    WHERE f.deck_id = ?
    ORDER BY r.next_review ASC NULLS FIRST
    LIMIT ?`
  ).all(userId, deckId, Number(limit));

  res.json({ cards: cards.map((c: any) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    hint: c.hint,
    reviewState: {
      easeFactor: c.ease_factor || 2.5,
      interval: c.interval || 0,
      repetitions: c.repetitions || 0,
      nextReview: c.next_review || null,
    }
  })) });
});


// --- filepath: pages/api/packs.ts ---
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.json([
    { id: 'foundation', name: 'Foundation', price: 400, durationDays: 30 },
    { id: 'advancer', name: 'Advancer', price: 500, durationDays: 90 },
    { id: 'achiever', name: 'Achiever', price: 999, durationDays: 365 },
  ]);
}


// --- filepath: pages/api/subscriptions.ts ---
import { withAuth } from '../../lib/featureGate';
import db from '../../lib/db';

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const userId = (req as any).userId;
  const { packId } = req.body;

  const packs: Record<string, number> = { foundation: 30, advancer: 90, achiever: 365 };
  const days = packs[packId];
  if (!days) return res.status(400).json({ error: 'Invalid pack' });

  db.prepare(`INSERT INTO subscriptions (user_id, pack_id, start_date, end_date) VALUES (?, ?, datetime('now'), datetime('now', '+${days} days'))`).run(userId, packId);
  res.json({ success: true, expiresAt: new Date(Date.now() + days * 86400000).toISOString() });
});


// --- filepath: hooks/useSubscription.ts ---
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function useSubscription() {
  const [subscription, setSubscription] = useState<any>({ active: false, limits: { mocksPerMonth: 2, quizzesPerDay: 3, flashcardsPerDay: 10 } });

  useEffect(() => {
    api.dashboard.subscription().then(setSubscription);
  }, []);

  return { subscription };
}


// --- filepath: pages/dashboard.tsx ---
import Navbar from '../components/Navbar';
import { useSubscription } from '../hooks/useSubscription';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Dashboard() {
  const router = useRouter();
  const { subscription } = useSubscription();
  const [stats, setStats] = useState<any>({});
  const isPro = subscription?.active;

  useEffect(() => {
    api.dashboard.stats().then(setStats);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {!isPro && (
        <div className="bg-gray-900 text-white py-2 px-4 text-center text-sm">
          Free plan — <button onClick={() => router.push('/pricing')} className="underline font-semibold">Upgrade for ₹400/₹500/₹999</button>
        </div>
      )}
      <main className="max-w-7xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Welcome back, {stats.name || 'Student'}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard icon="🔥" label="Study Streak" value={`${stats.studyStreak || 0} days`} />
          <StatCard icon="📝" label="Mock Tests Taken" value={stats.mockTestsTaken || 0} />
          <StatCard icon="🃏" label="Due Flashcards" value={stats.dueFlashcards || 0} />
          <StatCard icon="⭐" label="Plan" value={isPro ? 'Pro' : 'Free'} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <QuickAction label="Start Mock Test" desc={isPro ? 'Unlimited' : '2 free this month'} onClick={() => router.push('/mock-tests')} />
          <QuickAction label="Review Flashcards" desc={`${stats.dueFlashcards || 0} due`} onClick={() => router.push('/flashcards-review')} />
          <QuickAction label="Browse Chapters" desc="Continue learning" onClick={() => router.push('/chapters')} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 col-span-2">
            <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
            <p className="text-sm text-gray-500">Your recent quiz and mock test results will appear here.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Weak Areas</h2>
            <p className="text-sm text-gray-500">Take more quizzes to identify weak areas.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function QuickAction({ label, desc, onClick }: any) {
  return (
    <button onClick={onClick} className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:shadow transition">
      <span className="text-2xl block mb-1">📌</span>
      <h3 className="font-semibold text-gray-900">{label}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
    </button>
  );
}