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
import { errorHandler } from './middleware/error';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 4000;

// API Middleware Stack (Feature 1.10)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Phase 1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/audit', auditRoutes);

// Phase 2 Routes (Academic Structure)
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/courses/:courseId/subjects', subjectRoutes);
app.use('/api/v1', subjectRoutes); // for /api/v1/subject/:id
app.use('/api/v1/subjects/:subjectId/syllabus', syllabusRoutes);
app.use('/api/v1/syllabus', syllabusRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1', enrollmentRoutes); // for /api/v1/students/:id/courses

// Phase 3 Routes (Question Bank)
app.use('/api/v1/questions', questionRoutes);

// Error Handling Middleware (Must be last)
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  ExamOS API Server running on port ${PORT}`);
    console.log(`====================================================`);
  });
}
