import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import roleRoutes from './routes/role.routes';
import auditRoutes from './routes/audit.routes';
import courseRoutes from './routes/course.routes';
import subjectRoutes from './routes/subject.routes';
import syllabusRoutes from './routes/syllabus.routes';
import enrollmentRoutes from './routes/enrollment.routes';
import questionRoutes from './routes/question.routes';
import i18nRoutes from './routes/i18n.routes';
import preferenceRoutes from './routes/preference.routes';
import { examPatternRouter } from './routes/exam-patterns.routes';
import { errorHandler } from './middleware/error';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 4000;

// API Middleware Stack (Feature 1.10)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck & Root Landing
app.get('/', (req, res) => {
  res.json({ name: 'ExamOS API', status: 'ONLINE', version: '1.0.0', apiBase: '/api/v1' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Phase 1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/users', preferenceRoutes); // /me/preferences
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/i18n', i18nRoutes);

// Phase 2 Routes (Academic Structure)
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/courses/:courseId/subjects', subjectRoutes);
app.use('/api/v1', subjectRoutes);
app.use('/api/v1/subjects/:subjectId/syllabus', syllabusRoutes);
app.use('/api/v1/syllabus', syllabusRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1', enrollmentRoutes);

// Phase 3 Routes (Question Bank)
app.use('/api/v1/questions', questionRoutes);

// Phase 4 Routes (Exam Pattern)
app.use('/api/v1/exam-patterns', examPatternRouter);

// Error Handling Middleware (Must be last)
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  ExamOS API Server running on port ${PORT}`);
    console.log(`====================================================`);
  });
}
