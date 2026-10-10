import './resolve-dist-packages';
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
import { examRouter } from './routes/exam.routes';
import { attemptRouter } from './routes/attempt.routes';
import { archiveRouter } from './routes/archive.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { practiceRouter } from './routes/practice.routes';
import { previewRouter } from './routes/preview.routes';
import aiRouter from './routes/ai.routes';
import interviewRouter from './routes/interview.routes';
import { entitlementRouter } from './routes/entitlement.routes';
import { subscriptionRouter } from './routes/subscription.routes';
import { aiCreditsRouter } from './routes/ai-credits.routes';
import { billingRouter } from './routes/billing.routes';
import { maintenanceRouter } from './routes/maintenance.routes';
import { audioRouter } from './routes/audio.routes';
import { writingRouter } from './routes/writing.routes';
import { vocabularyRouter } from './routes/vocabulary.routes';
import { listeningRouter } from './routes/listening.routes';
import { importExportRouter } from './routes/import-export.routes';
import { systemRouter } from './routes/system.routes';
import { initV2Tables } from './db/init-v2-tables';
import { errorHandler } from './middleware/error';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 4043;

// API Middleware Stack (Feature 1.10)
app.use(cors());
// app.use(express.json())
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Initialize Phase 15 V2 Tables on Boot
initV2Tables().catch((e) => console.error('Failed to init V2 tables:', e));

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
app.use('/api/v1/preferences', preferenceRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/i18n', i18nRoutes);

// Platform Branding & Institutional Theme Presets (docs/v2/features/platform-themes.md)
app.use('/api/v1/system', systemRouter);
app.use('/api/system', systemRouter);

app.get('/api/v1/platform/branding', (req, res) => {
  res.json({
    success: true,
    data: {
      institutionName: 'ExamOS Academy',
      logoUrl: null,
      primaryAccent: 'cyan',
      defaultTheme: 'DARK',
      highContrastAvailable: true,
    },
  });
});

// Phase 15 Routes (V2: Maintenance, Audio, Writing & Vocabulary)
app.use('/api/v1/maintenance', maintenanceRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/v1/audio', audioRouter);
app.use('/api/audio', audioRouter);
app.use('/api/v1/writing', writingRouter);
app.use('/api/v2/writing', writingRouter);
app.use('/api/writing', writingRouter);
app.use('/api/v1/listening', listeningRouter);
app.use('/api/listening', listeningRouter);
app.use('/api/v1/vocabulary', vocabularyRouter);
app.use('/api/vocabulary', vocabularyRouter);

// Phase 11 Routes (AI Question System & Gateway)
app.use('/api/v1/ai', aiRouter);
app.use('/api/ai', aiRouter);

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

// Phase 5 Routes (Exam Generator)
app.use('/api/v1/exams', examRouter);
app.use('/api/exams', examRouter);

// Phase 6 Routes (Exam System & Attempts Engine)
app.use('/api/v1', attemptRouter);
app.use('/api', attemptRouter);

// Phase 7 Routes (Published Exam Archive & Immutability Engine)
app.use('/api/v1/archive', archiveRouter);
app.use('/api/archive', archiveRouter);

// Phase 8 Routes (Student Analytics & Mastery Engine)
app.use('/api/v1', analyticsRouter);
app.use('/api', analyticsRouter);

// Phase 9 Routes (Personalized Practice & Adaptive Mastery)
app.use('/api/v1/practice', practiceRouter);
app.use('/api/practice', practiceRouter);

// Phase 10 Routes (Preview & Impersonation System)
app.use('/api/v1/preview', previewRouter);
app.use('/api/preview', previewRouter);
app.use('/api/v1/impersonate', previewRouter);
app.use('/api/impersonate', previewRouter);

// Phase 12 Routes (AI Interview System)
app.use('/api/v1/interview', interviewRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/v1/interviews', interviewRouter);
app.use('/api/interviews', interviewRouter);

// Phase 13 Routes (Subscriptions, Entitlements & Pluggable Billing Engine)
app.use('/api/v1/entitlements', entitlementRouter);
app.use('/api/entitlements', entitlementRouter);
app.use('/api/v1/subscriptions', subscriptionRouter);
app.use('/api/subscriptions', subscriptionRouter);
app.use('/api/v1/ai-credits', aiCreditsRouter);
app.use('/api/ai-credits', aiCreditsRouter);
app.use('/api/v1/credits', aiCreditsRouter);
app.use('/api/credits', aiCreditsRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/billing', billingRouter);

// Feature 15.16 (Schema-Validated JSON Import & Export)
app.use('/api/v1/import-export', importExportRouter);
app.use('/api/import-export', importExportRouter);
app.use('/api/v1/import', importExportRouter);
app.use('/api/v1/export', importExportRouter);

// Error Handling Middleware (Must be last)
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  ExamOS API Server running on port ${PORT}`);
    console.log(`====================================================`);
  });

  const shutdown = async () => {
    try {
      const { pgDb } = await import('@repo/database');
      if (pgDb && typeof pgDb.close === 'function') {
        await pgDb.close();
      }
    } catch {}
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
