import { pgDb } from '../src/index';
import { AITranslationService } from '../../../apps/api/src/services/ai-translation.service';
import { BASELINE_LANGUAGES } from '../../../apps/api/src/routes/i18n.routes';

export interface TranslationKeyDefinition {
  key: string;
  english: string;
  description: string;
  module: string;
  category?: string;
}

export const SEED_TRANSLATION_KEYS: TranslationKeyDefinition[] = [
  // --------------------------------------------------------------------------
  // Module: nav
  // --------------------------------------------------------------------------
  { key: 'nav_dashboard', english: 'Dashboard', description: 'Sidebar link to main dashboard', module: 'nav', category: 'navigation' },
  { key: 'nav_student_exams', english: 'My Assessments & Tests', description: 'Sidebar link to student exam catalog', module: 'nav', category: 'navigation' },
  { key: 'nav_practice', english: 'Practice & Training', description: 'Sidebar link to practice drill workspace', module: 'nav', category: 'navigation' },
  { key: 'nav_interview', english: 'AI Interview & Viva', description: 'Sidebar link to AI oral interview evaluation', module: 'nav', category: 'navigation' },
  { key: 'nav_listening_practice', english: 'Listening Practice', description: 'Sidebar link to audio listening comprehension drills', module: 'nav', category: 'navigation' },
  { key: 'nav_writing_practice', english: 'Writing Practice', description: 'Sidebar link to essay writing evaluations', module: 'nav', category: 'navigation' },
  { key: 'nav_vocabulary', english: 'Vocabulary Training', description: 'Sidebar link to spaced-repetition vocabulary', module: 'nav', category: 'navigation' },
  { key: 'nav_subscription', english: 'Subscription & Credits', description: 'Sidebar link to subscription billing and tiers', module: 'nav', category: 'navigation' },
  { key: 'nav_analytics', english: 'Student Analytics & Mastery', description: 'Sidebar link to student performance and mastery graphs', module: 'nav', category: 'navigation' },
  { key: 'nav_exams', english: 'Exam Generator & Papers', description: 'Sidebar link to exam generation management', module: 'nav', category: 'navigation' },
  { key: 'nav_archive', english: 'Published Archive', description: 'Sidebar link to historical published test papers', module: 'nav', category: 'navigation' },
  { key: 'nav_exam_patterns', english: 'Exam Patterns', description: 'Sidebar link to exam blueprint rules', module: 'nav', category: 'navigation' },
  { key: 'nav_question_bank', english: 'Question Bank', description: 'Sidebar link to curriculum question authoring', module: 'nav', category: 'navigation' },
  { key: 'nav_courses', english: 'Academic Structure', description: 'Sidebar link to courses, subjects, and topics', module: 'nav', category: 'navigation' },
  { key: 'nav_users', english: 'User Management', description: 'Sidebar link to users, roles, and permissions', module: 'nav', category: 'navigation' },
  { key: 'nav_settings', english: 'Settings', description: 'Sidebar link to administrative settings and i18n', module: 'nav', category: 'navigation' },

  // --------------------------------------------------------------------------
  // Module: common / shell
  // --------------------------------------------------------------------------
  { key: 'app_title', english: 'ExamOS // Adaptive Learning Platform', description: 'Global application header title', module: 'common', category: 'branding' },
  { key: 'app_subtitle', english: 'Adaptive Learning & Assessment OS', description: 'Global application header subtitle', module: 'common', category: 'branding' },
  { key: 'preview_as_student', english: 'Preview as Student', description: 'Header button to enter student view impersonation', module: 'common', category: 'actions' },
  { key: 'logout', english: 'Log Out', description: 'User sign-out button', module: 'common', category: 'actions' },
  { key: 'logout_tooltip', english: 'Sign out from ExamOS', description: 'Tooltip on user logout button', module: 'common', category: 'tooltips' },
  { key: 'logout_locked_tooltip', english: 'Exam in progress - complete assessment first', description: 'Disabled logout tooltip during active exam', module: 'common', category: 'tooltips' },
  { key: 'sidebar_modules', english: 'Modules', description: 'Section divider heading in navigation sidebar', module: 'common', category: 'navigation' },
  { key: 'offline_badge', english: 'Offline', description: 'Pill badge indicating offline network status', module: 'common', category: 'status' },
  { key: 'nav_locked_tooltip', english: 'Navigation locked during active exam session', description: 'Tooltip when trying to leave active exam', module: 'common', category: 'tooltips' },
  { key: 'feature_maintenance_tooltip', english: 'Feature disabled for maintenance', description: 'Tooltip on features disabled by admin maintenance', module: 'common', category: 'tooltips' },
  { key: 'verifying_session', english: 'Verifying ExamOS session...', description: 'Full-screen authentication loading text', module: 'common', category: 'loading' },
  { key: 'welcome', english: 'Welcome to ExamOS Platform', description: 'Welcome greeting header', module: 'common', category: 'messages' },
  { key: 'dashboard_welcome_desc', english: 'Welcome to ExamOS. Select a module from the sidebar to begin your academic workflow.', description: 'Dashboard intro text', module: 'common', category: 'messages' },
  { key: 'role_main_admin', english: 'Main Admin', description: 'Role display title for platform super administrator', module: 'common', category: 'roles' },
  { key: 'role_sub_admin', english: 'Sub Admin', description: 'Role display title for institutional administrator', module: 'common', category: 'roles' },
  { key: 'role_teacher', english: 'Teacher', description: 'Role display title for educator', module: 'common', category: 'roles' },
  { key: 'role_student', english: 'Student', description: 'Role display title for learner candidate', module: 'common', category: 'roles' },
  { key: 'theme_light', english: 'Light', description: 'Theme label for light mode', module: 'common', category: 'theme' },
  { key: 'theme_slate', english: 'Slate', description: 'Theme label for neutral slate mode', module: 'common', category: 'theme' },
  { key: 'theme_dark', english: 'Dark', description: 'Theme label for dark mode', module: 'common', category: 'theme' },
  { key: 'search', english: 'Search', description: 'Generic search placeholder or button', module: 'common', category: 'actions' },
  { key: 'filter', english: 'Filter', description: 'Generic filter button label', module: 'common', category: 'actions' },
  { key: 'actions', english: 'Actions', description: 'Table column header for row actions', module: 'common', category: 'table' },
  { key: 'status', english: 'Status', description: 'Table column header or status field', module: 'common', category: 'table' },
  { key: 'save', english: 'Save', description: 'Generic save button label', module: 'common', category: 'actions' },
  { key: 'saving', english: 'Saving...', description: 'In-flight saving button label', module: 'common', category: 'actions' },
  { key: 'saved', english: 'Saved ✓', description: 'Save confirmed notification label', module: 'common', category: 'status' },
  { key: 'cancel', english: 'Cancel', description: 'Generic cancel button label', module: 'common', category: 'actions' },
  { key: 'delete', english: 'Delete', description: 'Generic delete button label', module: 'common', category: 'actions' },
  { key: 'edit', english: 'Edit', description: 'Generic edit button label', module: 'common', category: 'actions' },
  { key: 'close', english: 'Close', description: 'Generic close modal button label', module: 'common', category: 'actions' },
  { key: 'confirm', english: 'Confirm', description: 'Generic confirm button label', module: 'common', category: 'actions' },
  { key: 'loading', english: 'Loading...', description: 'Generic loading spinner label', module: 'common', category: 'status' },
  { key: 'success', english: 'Success', description: 'Generic success alert title', module: 'common', category: 'status' },
  { key: 'error', english: 'Error', description: 'Generic error alert title', module: 'common', category: 'status' },
  { key: 'refresh', english: 'Refresh', description: 'Generic refresh button label', module: 'common', category: 'actions' },
  { key: 'all', english: 'All', description: 'Generic all filter option', module: 'common', category: 'filters' },

  // --------------------------------------------------------------------------
  // Module: auth
  // --------------------------------------------------------------------------
  { key: 'login_heading', english: 'Sign in to ExamOS', description: 'Login card title', module: 'auth', category: 'auth' },
  { key: 'login_subheading', english: 'Enter your credentials or choose a quick demo account', description: 'Login card subtitle', module: 'auth', category: 'auth' },
  { key: 'login_invalid_credentials', english: 'Invalid email or password', description: 'Error message for bad login', module: 'auth', category: 'auth' },
  { key: 'login_email_label', english: 'Email Address', description: 'Login email form label', module: 'auth', category: 'auth' },
  { key: 'login_email_placeholder', english: 'name@examos.com', description: 'Login email input placeholder', module: 'auth', category: 'auth' },
  { key: 'login_password_label', english: 'Password', description: 'Login password form label', module: 'auth', category: 'auth' },
  { key: 'login_btn_hide', english: 'Hide', description: 'Password toggle hide button', module: 'auth', category: 'auth' },
  { key: 'login_btn_show', english: 'Show', description: 'Password toggle show button', module: 'auth', category: 'auth' },
  { key: 'login_btn_submit', english: 'Sign In', description: 'Login submit button', module: 'auth', category: 'auth' },
  { key: 'login_btn_authenticating', english: 'Authenticating...', description: 'Login in-progress button', module: 'auth', category: 'auth' },
  { key: 'login_quick_demo', english: 'QUICK DEMO ACCOUNTS (ONE-CLICK)', description: 'Demo accounts section title', module: 'auth', category: 'auth' },
  { key: 'login_autofill', english: 'Auto-Fill', description: 'Demo credential auto-fill button', module: 'auth', category: 'auth' },

  // --------------------------------------------------------------------------
  // Module: settings
  // --------------------------------------------------------------------------
  { key: 'settings_header_title', english: 'System Settings & Administration', description: 'Settings page header title', module: 'settings', category: 'admin' },
  { key: 'settings_header_desc', english: 'Configure AI model providers, gateway cascade routing, appearance preferences, and exam theme styling', description: 'Settings page header description', module: 'settings', category: 'admin' },
  { key: 'settings_tab_ai', english: 'AI & Model Configuration', description: 'Settings subtab for AI providers', module: 'settings', category: 'navigation' },
  { key: 'settings_tab_appearance', english: 'Appearance & Theme', description: 'Settings subtab for UI themes', module: 'settings', category: 'navigation' },
  { key: 'settings_tab_exam_themes', english: 'Exam Paper Themes', description: 'Settings subtab for paper design themes', module: 'settings', category: 'navigation' },
  { key: 'settings_tab_maintenance', english: 'System Maintenance', description: 'Settings subtab for maintenance control', module: 'settings', category: 'navigation' },
  { key: 'settings_tab_entitlements', english: 'Feature Matrix & Entitlements', description: 'Settings subtab for feature entitlements', module: 'settings', category: 'navigation' },
  { key: 'settings_tab_languages', english: 'Language Management', description: 'Settings subtab for i18n languages', module: 'settings', category: 'navigation' },

  // --------------------------------------------------------------------------
  // Module: exam_player
  // --------------------------------------------------------------------------
  { key: 'exam_player_title', english: 'Exam Hall', description: 'Exam player assessment title', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_time_left', english: 'Time Left', description: 'Exam countdown timer label', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_question_counter', english: 'Question', description: 'Question numbering badge prefix', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_of', english: 'of', description: 'Question counter separator (e.g. Question 1 of 50)', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_marks', english: 'Marks', description: 'Question point value label', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_single_choice', english: 'Single Choice', description: 'Single choice question type indicator', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_multiple_choice', english: 'Multiple Choice', description: 'Multiple choice question type indicator', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_numerical', english: 'Numerical Value', description: 'Numerical question type indicator', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_clear_answer', english: 'Clear Response', description: 'Button to deselect answers', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_mark_review', english: 'Mark for Review', description: 'Button to flag question for review', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_unmark_review', english: 'Unmark Review', description: 'Button to remove review status', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_flag_question', english: 'Flag Dispute', description: 'Button to dispute error in question', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_flag_modal_title', english: 'Dispute / Flag Question', description: 'Flag question modal title', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_flag_modal_desc', english: 'Report ambiguities, inaccuracies, or typos in this question.', description: 'Flag question modal description', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_flag_reason_placeholder', english: 'Describe the issue or error in detail...', description: 'Flag modal input placeholder', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_flag_submit', english: 'Submit Flag', description: 'Submit question flag button', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_flag_cancel', english: 'Cancel', description: 'Cancel flag modal button', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_flag_success', english: 'Question flagged successfully for review.', description: 'Question flag success message', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_submit_exam', english: 'Submit Test', description: 'Button to submit whole exam', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_submit_modal_title', english: 'Confirm Exam Submission', description: 'Submit confirmation modal title', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_submit_modal_desc', english: 'Are you sure you want to finalize and submit your assessment? Unanswered questions cannot be changed after submission.', description: 'Submit confirmation modal message', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_submit_confirm', english: 'Yes, Submit Exam', description: 'Confirm submit exam button', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_submit_cancel', english: 'Return to Exam', description: 'Cancel submit modal button', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_answered', english: 'Answered', description: 'Palette status: answered questions', module: 'exam_player', category: 'palette' },
  { key: 'exam_player_unanswered', english: 'Unanswered', description: 'Palette status: unanswered questions', module: 'exam_player', category: 'palette' },
  { key: 'exam_player_marked_for_review', english: 'Marked for Review', description: 'Palette status: marked for review', module: 'exam_player', category: 'palette' },
  { key: 'exam_player_not_visited', english: 'Not Visited', description: 'Palette status: unvisited questions', module: 'exam_player', category: 'palette' },
  { key: 'exam_player_next', english: 'Save & Next', description: 'Proceed to next question button', module: 'exam_player', category: 'exam' },
  { key: 'exam_player_prev', english: 'Previous', description: 'Return to previous question button', module: 'exam_player', category: 'exam' },
  { key: 'question_palette', english: 'Question Palette', description: 'Palette drawer title', module: 'exam_player', category: 'palette' },
  { key: 'select_your_answer', english: 'Select your answer:', description: 'Prompt before choice list', module: 'exam_player', category: 'exam' },

  // --------------------------------------------------------------------------
  // Module: exam_result
  // --------------------------------------------------------------------------
  { key: 'exam_result_title', english: 'Evaluation Scorecard & Analysis', description: 'Exam result page title', module: 'exam_result', category: 'result' },
  { key: 'exam_result_score', english: 'Total Score', description: 'Result score achieved label', module: 'exam_result', category: 'result' },
  { key: 'exam_result_percentage', english: 'Percentage', description: 'Score percentage label', module: 'exam_result', category: 'result' },
  { key: 'exam_result_total_marks', english: 'Maximum Marks', description: 'Total maximum marks label', module: 'exam_result', category: 'result' },
  { key: 'exam_result_back_to_exams', english: 'Back to Assessments', description: 'Button returning from result to exam list', module: 'exam_result', category: 'result' },
  { key: 'exam_result_breakdown', english: 'Section Performance Breakdown', description: 'Result section breakdown table title', module: 'exam_result', category: 'result' },
  { key: 'scorecard_solution_analysis', english: 'Solution & Answer Key Analysis', description: 'Header for question solutions review', module: 'exam_result', category: 'result' },
  { key: 'correct_choice_label', english: 'Correct Answer', description: 'Label identifying the correct option', module: 'exam_result', category: 'result' },
  { key: 'your_choice_label', english: 'Your Response', description: 'Label identifying student choice', module: 'exam_result', category: 'result' },
  { key: 'explanation', english: 'Explanation', description: 'Answer explanation block label', module: 'exam_result', category: 'result' },

  // --------------------------------------------------------------------------
  // Module: student_exams
  // --------------------------------------------------------------------------
  { key: 'student_exams_title', english: 'My Assessments & Tests', description: 'Student exams catalog title', module: 'student_exams', category: 'exams' },
  { key: 'student_exams_subtitle', english: 'Assigned curriculum examinations, mock papers, and historical test sessions', description: 'Student exams catalog subtitle', module: 'student_exams', category: 'exams' },
  { key: 'student_exams_available', english: 'Available Assessments', description: 'Available exams tab', module: 'student_exams', category: 'exams' },
  { key: 'student_exams_completed', english: 'Evaluated Attempts', description: 'Completed attempts tab', module: 'student_exams', category: 'exams' },
  { key: 'student_exams_start_exam', english: 'Enter Exam Hall', description: 'Start new exam attempt button', module: 'student_exams', category: 'exams' },
  { key: 'student_exams_view_result', english: 'View Scorecard', description: 'View scorecard button for finished test', module: 'student_exams', category: 'exams' },
  { key: 'resume_exam', english: 'Resume Active Session', description: 'Resume ongoing exam button', module: 'student_exams', category: 'exams' },
  { key: 'no_active_exams', english: 'No assessments available right now', description: 'Empty state message for exams', module: 'student_exams', category: 'exams' },
  { key: 'no_active_exams_desc', english: 'You do not have any pending tests scheduled for your enrolled curriculum.', description: 'Empty state description for exams', module: 'student_exams', category: 'exams' },

  // --------------------------------------------------------------------------
  // Module: student_analytics
  // --------------------------------------------------------------------------
  { key: 'student_analytics_title', english: 'Student Analytics & Mastery', description: 'Student analytics page header', module: 'student_analytics', category: 'analytics' },
  { key: 'student_analytics_subtitle', english: 'Track performance trends, syllabus coverage, and priority areas across all test sessions', description: 'Student analytics subtitle', module: 'student_analytics', category: 'analytics' },
  { key: 'student_analytics_total_tests', english: 'Tests Completed', description: 'Total exams attempted counter label', module: 'student_analytics', category: 'analytics' },
  { key: 'student_analytics_avg_score', english: 'Weighted Score', description: 'Historical weighted average score label', module: 'student_analytics', category: 'analytics' },
  { key: 'student_analytics_accuracy', english: 'Accuracy Rate', description: 'Global correct answer accuracy percentage label', module: 'student_analytics', category: 'analytics' },
  { key: 'top_strengths', english: 'Top Mastery Strengths', description: 'Strong syllabus topics card title', module: 'student_analytics', category: 'analytics' },
  { key: 'priority_weaknesses', english: 'Priority Weaknesses', description: 'Weak syllabus topics card title', module: 'student_analytics', category: 'analytics' },
  { key: 'recalculate_mastery', english: 'Recalculate Mastery', description: 'Recalculate mastery statistics button', module: 'student_analytics', category: 'analytics' },

  // --------------------------------------------------------------------------
  // Module: listening_practice
  // --------------------------------------------------------------------------
  { key: 'listening_lab_title', english: 'Listening Comprehension Lab', description: 'Listening lab page title', module: 'listening_practice', category: 'drills' },
  { key: 'listening_lab_subtitle', english: 'Standardized audio drills with natural multi-accent speech and comprehension items', description: 'Listening lab page subtitle', module: 'listening_practice', category: 'drills' },
  { key: 'audio_passage', english: 'Audio Passage', description: 'Audio player section heading', module: 'listening_practice', category: 'drills' },
  { key: 'comprehension_questions', english: 'Comprehension Questions', description: 'Questions list header in listening drill', module: 'listening_practice', category: 'drills' },
  { key: 'submit_listening_drill', english: 'Submit Drill Evaluation', description: 'Submit listening drill button', module: 'listening_practice', category: 'drills' },
  { key: 'no_listening_drills', english: 'No listening drills found for selected filter.', description: 'Empty state message for listening catalog', module: 'listening_practice', category: 'drills' },

  // --------------------------------------------------------------------------
  // Module: writing_practice
  // --------------------------------------------------------------------------
  { key: 'writing_practice_title', english: 'Writing Assessment & Essay Lab', description: 'Writing practice page title', module: 'writing_practice', category: 'drills' },
  { key: 'writing_practice_desc', english: 'AI-evaluated essay submissions across task achievement, coherence, lexical resource, and grammatical accuracy', description: 'Writing practice page subtitle', module: 'writing_practice', category: 'drills' },
  { key: 'writing_practice_word_count', english: 'Word Count', description: 'Essay word counter indicator', module: 'writing_practice', category: 'drills' },
  { key: 'writing_practice_submit', english: 'Submit for AI Evaluation', description: 'Submit essay button', module: 'writing_practice', category: 'drills' },

  // --------------------------------------------------------------------------
  // Module: interview
  // --------------------------------------------------------------------------
  { key: 'interview_title', english: 'AI Interview & Oral Viva', description: 'Interview module header title', module: 'interview', category: 'interview' },
  { key: 'interview_desc', english: 'Conduct interactive voice and text oral examinations with multi-turn adaptive follow-ups and rubric scoring', description: 'Interview module subtitle', module: 'interview', category: 'interview' },
  { key: 'interview_start', english: 'Start Interview Session', description: 'Begin new oral interview button', module: 'interview', category: 'interview' },
  { key: 'interview_end', english: 'Conclude Interview & Grade', description: 'Conclude interview session button', module: 'interview', category: 'interview' },
  { key: 'interview_mic_on', english: 'Microphone Active', description: 'Speech recognition active state', module: 'interview', category: 'interview' },
  { key: 'interview_mic_off', english: 'Muted', description: 'Microphone muted state', module: 'interview', category: 'interview' },

  // --------------------------------------------------------------------------
  // Module: question_bank
  // --------------------------------------------------------------------------
  { key: 'qb_title', english: 'Question Bank Workbench', description: 'Question bank header title', module: 'question_bank', category: 'authoring' },
  { key: 'qb_desc', english: 'Author, version, tag, review, and organize curriculum question assets', description: 'Question bank header subtitle', module: 'question_bank', category: 'authoring' },
  { key: 'qb_search_placeholder', english: 'Search questions by statement, formula, or tag...', description: 'Question search input placeholder', module: 'question_bank', category: 'authoring' },
  { key: 'qb_add_question', english: '+ New Question', description: 'Create question modal button', module: 'question_bank', category: 'authoring' },
  { key: 'qb_filter_subject', english: 'Filter by Subject', description: 'Subject dropdown filter', module: 'question_bank', category: 'authoring' },
  { key: 'qb_filter_difficulty', english: 'All Difficulties', description: 'Difficulty dropdown filter', module: 'question_bank', category: 'authoring' },
  { key: 'qb_no_questions', english: 'No questions match the current filter criteria.', description: 'Empty state message for question bank', module: 'question_bank', category: 'authoring' },

  // --------------------------------------------------------------------------
  // Module: courses
  // --------------------------------------------------------------------------
  { key: 'courses_title', english: 'Academic Course Hierarchy', description: 'Courses page header title', module: 'courses', category: 'curriculum' },
  { key: 'courses_desc', english: 'Manage courses, subjects, chapters, and hierarchical syllabus taxonomy', description: 'Courses page header subtitle', module: 'courses', category: 'curriculum' },
  { key: 'courses_add_course', english: '+ Add Course', description: 'Create new course button', module: 'courses', category: 'curriculum' },
  { key: 'courses_no_courses', english: 'No academic courses registered yet.', description: 'Empty state message for courses', module: 'courses', category: 'curriculum' },

  // --------------------------------------------------------------------------
  // Module: users
  // --------------------------------------------------------------------------
  { key: 'users_title', english: 'User & Identity Management', description: 'Users page header title', module: 'users', category: 'users' },
  { key: 'users_desc', english: 'Manage institutional accounts, role assignments, and authentication permissions', description: 'Users page header subtitle', module: 'users', category: 'users' },
  { key: 'users_add_user', english: '+ Create User', description: 'Create user button', module: 'users', category: 'users' },
  { key: 'users_search_placeholder', english: 'Search users by name, email, or role...', description: 'User search input placeholder', module: 'users', category: 'users' },
  { key: 'users_role_filter', english: 'All Roles', description: 'Role filter select placeholder', module: 'users', category: 'users' },
  { key: 'users_no_users', english: 'No users found matching query.', description: 'Empty state message for users', module: 'users', category: 'users' },
];

export async function runTranslationKeysSeed(): Promise<void> {
  console.log('================================================================');
  console.log('STARTING I18N TRANSLATION KEYS & BASELINE SEED');
  console.log('================================================================');

  // 1. Ensure baseline languages exist in DB
  let seededLangs = 0;
  for (const lang of BASELINE_LANGUAGES) {
    await pgDb.query(
      `INSERT INTO "languages" ("id", "code", "name", "nativeName", "isDefault")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "nativeName" = EXCLUDED."nativeName", "isDefault" = EXCLUDED."isDefault"`,
      [lang.id, lang.code, lang.name, lang.nativeName, Boolean(lang.isDefault)]
    );
    seededLangs++;
  }
  console.log(`✓ Languages synchronized: ${seededLangs} baseline languages.`);

  // 2. Fetch language ID mapping
  const langRows = await pgDb.query(`SELECT "id", "code" FROM "languages"`);
  const langIdMap = new Map<string, string>();
  langRows.rows.forEach((r: any) => langIdMap.set(r.code, r.id));

  const enLangId = langIdMap.get('en');
  if (!enLangId) {
    throw new Error('English ("en") baseline language not found in DB');
  }

  // 3. Seed translation keys & English translation rows (with isVerified = true)
  let seededKeys = 0;
  const allKeysPayload = [];

  for (const def of SEED_TRANSLATION_KEYS) {
    const keyId = `tk_${def.key}`;
    await pgDb.query(
      `INSERT INTO "translation_keys" ("id", "key", "description", "module", "category")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description", "module" = EXCLUDED."module", "category" = EXCLUDED."category"`,
      [keyId, def.key, def.description, def.module, def.category || 'general']
    );

    // Fetch confirmed keyId from DB in case it pre-existed with different ID
    const actualKeyRes = await pgDb.query(`SELECT "id" FROM "translation_keys" WHERE "key" = $1`, [def.key]);
    const actualKeyId = actualKeyRes.rows[0]?.id || keyId;

    // English translation row (isVerified = true)
    const enTransId = `t_en_${def.key}`;
    await pgDb.query(
      `INSERT INTO "translations" ("id", "languageId", "translationKeyId", "value", "isVerified")
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT ("languageId", "translationKeyId")
       DO UPDATE SET "value" = EXCLUDED."value", "isVerified" = true`,
      [enTransId, enLangId, actualKeyId, def.english]
    );

    allKeysPayload.push({
      key: def.key,
      en: def.english,
      description: def.description,
      module: def.module,
    });
    seededKeys++;
  }
  // Ensure all English translations have isVerified = true
  await pgDb.query(`UPDATE "translations" SET "isVerified" = true WHERE "languageId" = $1`, [enLangId]);
  console.log(`✓ Translation keys seeded: ${seededKeys} keys with English base translations (all verified).`);

  // 4. Batch AI translation pass for all non-English baseline languages (Part B)
  console.log('Executing batch translation pass for all baseline languages...');
  let totalTranslatedLangs = 0;

  for (const lang of BASELINE_LANGUAGES) {
    if (lang.code === 'en') continue;
    const targetCode = lang.code;

    try {
      const translatedMap = await AITranslationService.translateBatchForLanguage(targetCode, allKeysPayload);
      // Persist with isVerified = false (Part B)
      const count = await AITranslationService.persistTranslations(targetCode, translatedMap, false);
      totalTranslatedLangs++;
      console.log(`  - ${lang.name} (${targetCode}): ${count} keys populated (isVerified = false).`);
    } catch (langErr) {
      console.warn(`  ! Warning translating ${targetCode}:`, langErr);
    }
  }

  console.log(`✓ Batch AI translation pass complete across ${totalTranslatedLangs} baseline languages.`);
  console.log('================================================================');
}

if (require.main === module) {
  runTranslationKeysSeed()
    .then(async () => {
      await pgDb.close();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('Translation keys seed error:', e);
      try {
        await pgDb.close();
      } catch {}
      process.exit(1);
    });
}
