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
  { key: 'practice_mode', english: 'Practice Mode', description: 'Mode toggle: un-timed practice mode', module: 'common', category: 'modes' },
  { key: 'exam_mode', english: 'Exam Mode', description: 'Mode toggle: strictly timed simulation mode', module: 'common', category: 'modes' },
  { key: 'filter_by_course', english: 'Filter by Course', description: 'Label for course selection filter dropdown', module: 'common', category: 'filters' },
  { key: 'all_courses_option', english: 'All Eligible Courses', description: 'Option for all enrolled courses filter', module: 'common', category: 'filters' },
  { key: 'my_attempts', english: 'My Attempts', description: 'Tab button for reviewing past attempts', module: 'common', category: 'navigation' },
  { key: 'practice_history', english: 'Practice History', description: 'Header for history of practice sessions', module: 'common', category: 'history' },
  { key: 'exit_attempt', english: 'Exit Attempt', description: 'Button to exit an in-progress practice attempt', module: 'common', category: 'actions' },
  { key: 'submitting_evaluating', english: 'Submitting & Evaluating...', description: 'Loading state during submission and evaluation', module: 'common', category: 'loading' },
  { key: 'back_to_catalog', english: 'Back to Catalog', description: 'Button to return to question catalog', module: 'common', category: 'actions' },
  { key: 'total_score', english: 'Total Score', description: 'Label for total accumulated score', module: 'common', category: 'metrics' },
  { key: 'scorecard', english: 'Scorecard', description: 'Scorecard heading', module: 'common', category: 'metrics' },
  { key: 'correct', english: 'Correct', description: 'Label indicating correct answer', module: 'common', category: 'status' },
  { key: 'wrong', english: 'Incorrect', description: 'Label indicating incorrect answer', module: 'common', category: 'status' },
  { key: 'accuracy', english: 'Accuracy', description: 'Accuracy percentage metric label', module: 'common', category: 'metrics' },
  { key: 'duration', english: 'Duration', description: 'Duration time label', module: 'common', category: 'metrics' },
  { key: 'duration_label', english: 'Time Duration', description: 'Duration heading label', module: 'common', category: 'metrics' },
  { key: 'candidate', english: 'Candidate', description: 'Candidate user label', module: 'common', category: 'labels' },
  { key: 'completed_on', english: 'Completed on', description: 'Completion timestamp label', module: 'common', category: 'labels' },
  { key: 'current', english: 'Current', description: 'Current active item badge', module: 'common', category: 'status' },
  { key: 'mins', english: 'mins', description: 'Minutes abbreviation label', module: 'common', category: 'metrics' },
  { key: 'questions', english: 'Questions', description: 'Generic questions label', module: 'common', category: 'labels' },
  { key: 'questions_attempted', english: 'Questions Attempted', description: 'Count of attempted questions', module: 'common', category: 'metrics' },
  { key: 'answered', english: 'Answered', description: 'Answered count status', module: 'common', category: 'status' },
  { key: 'attempted', english: 'Attempted', description: 'Attempted status', module: 'common', category: 'status' },
  { key: 'unattempted', english: 'Unattempted', description: 'Unattempted status label', module: 'common', category: 'status' },
  { key: 'review', english: 'Review', description: 'Generic review button or label', module: 'common', category: 'actions' },
  { key: 'score', english: 'Score', description: 'Generic score label', module: 'common', category: 'metrics' },

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
  { key: 'save_and_next', english: 'Save & Next', description: 'Save answer and go to next question', module: 'exam_player', category: 'exam' },
  { key: 'mark_for_review', english: 'Mark for Review', description: 'Tag question for subsequent review', module: 'exam_player', category: 'exam' },
  { key: 'clear_response', english: 'Clear Response', description: 'Clear selected answer option', module: 'exam_player', category: 'exam' },
  { key: 'submit_test', english: 'Submit Test', description: 'Finalize and submit the examination', module: 'exam_player', category: 'exam' },
  { key: 'time_left_suffix', english: 'Time Left', description: 'Suffix for remaining countdown timer', module: 'exam_player', category: 'exam' },
  { key: 'question_statement', english: 'Question Statement', description: 'Header for the question text', module: 'exam_player', category: 'exam' },

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
  { key: 'correct_answers', english: 'Correct Answers', description: 'Summary metric for correct answers', module: 'exam_result', category: 'result' },
  { key: 'marks_obtained', english: 'Marks Obtained', description: 'Score earned metric label', module: 'exam_result', category: 'result' },

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
  { key: 'overall_mastery', english: 'Overall Mastery', description: 'Overall course mastery percentage', module: 'student_analytics', category: 'analytics' },

  // --------------------------------------------------------------------------
  // Module: listening_practice
  // --------------------------------------------------------------------------
  { key: 'listening_lab_title', english: 'Listening Comprehension Lab', description: 'Listening lab page title', module: 'listening_practice', category: 'drills' },
  { key: 'listening_lab_subtitle', english: 'Standardized audio drills with natural multi-accent speech and comprehension items', description: 'Listening lab page subtitle', module: 'listening_practice', category: 'drills' },
  { key: 'listening_catalog', english: 'Listening Catalog', description: 'Button to view listening drills catalog', module: 'listening_practice', category: 'navigation' },
  { key: 'start_listening_practice', english: 'Start Listening Drill', description: 'Button to start audio listening drill', module: 'listening_practice', category: 'actions' },
  { key: 'audio_passage', english: 'Audio Passage', description: 'Audio player section heading', module: 'listening_practice', category: 'drills' },
  { key: 'comprehension_questions', english: 'Comprehension Questions', description: 'Questions list header in listening drill', module: 'listening_practice', category: 'drills' },
  { key: 'solution_review', english: 'Solution Review', description: 'Section reviewing listening solution explanations', module: 'listening_practice', category: 'results' },
  { key: 'submit_listening_drill', english: 'Submit Drill Evaluation', description: 'Submit listening drill button', module: 'listening_practice', category: 'drills' },
  { key: 'no_listening_drills', english: 'No listening drills found for selected filter.', description: 'Empty state message for listening catalog', module: 'listening_practice', category: 'drills' },

  // --------------------------------------------------------------------------
  // Module: writing_practice
  // --------------------------------------------------------------------------
  { key: 'writing_practice', english: 'Writing Practice', description: 'Navigation tab label for writing practice', module: 'writing_practice', category: 'navigation' },
  { key: 'writing_practice_title', english: 'Writing Assessment & Essay Lab', description: 'Writing practice page title', module: 'writing_practice', category: 'drills' },
  { key: 'writing_lab_title', english: 'Standalone Writing Practice & AI Evaluation Studio', description: 'Main header for writing practice lab', module: 'writing_practice', category: 'drills' },
  { key: 'writing_lab_subtitle', english: 'Academic essay composition, real-time word counting compliance, and multi-criteria rubric evaluation.', description: 'Subheader for writing practice lab', module: 'writing_practice', category: 'drills' },
  { key: 'writing_practice_desc', english: 'AI-evaluated essay submissions across task achievement, coherence, lexical resource, and grammatical accuracy', description: 'Writing practice page subtitle', module: 'writing_practice', category: 'drills' },
  { key: 'writing_catalog', english: 'Writing Catalog', description: 'Button to switch to writing question catalog view', module: 'writing_practice', category: 'actions' },
  { key: 'start_writing_practice', english: 'Start Writing Practice', description: 'Button to start writing prompt attempt', module: 'writing_practice', category: 'actions' },
  { key: 'no_writing_drills', english: 'No writing prompts available for your enrolled course(s).', description: 'Empty state message when no writing questions exist', module: 'writing_practice', category: 'drills' },
  { key: 'writing_practice_word_count', english: 'Word Count', description: 'Essay word counter indicator', module: 'writing_practice', category: 'drills' },
  { key: 'writing_practice_submit', english: 'Submit for AI Evaluation', description: 'Submit essay button', module: 'writing_practice', category: 'drills' },
  { key: 'submit_writing_drill', english: 'Submit Essay for AI Evaluation', description: 'Button to finalize and submit essay for evaluation', module: 'writing_practice', category: 'actions' },
  { key: 'evaluating_essay', english: 'Evaluating Essay...', description: 'Loading indicator while AI evaluates essay', module: 'writing_practice', category: 'loading' },
  { key: 'candidate_essay_composition', english: 'Candidate Essay Composition', description: 'Section header for essay textarea editor', module: 'writing_practice', category: 'drills' },
  { key: 'prompt_stimulus', english: 'Prompt Stimulus', description: 'Header for the writing prompt stimulus text', module: 'writing_practice', category: 'drills' },
  { key: 'task_stimulus_chart', english: 'Task Stimulus Chart / Diagram', description: 'Header for visual stimulus chart or diagram', module: 'writing_practice', category: 'drills' },
  { key: 'enlarge_fullscreen', english: 'Enlarge Fullscreen', description: 'Button to open stimulus diagram in zoomable modal lightbox', module: 'writing_practice', category: 'actions' },
  { key: 'click_to_zoom', english: 'Click to Zoom', description: 'Tooltip overlay on diagram thumbnail', module: 'writing_practice', category: 'tooltips' },
  { key: 'background_context', english: 'Background Context', description: 'Header for background context of writing prompt', module: 'writing_practice', category: 'drills' },
  { key: 'evaluation_criteria', english: 'Evaluation Criteria', description: 'Header for evaluation rubrics criteria list', module: 'writing_practice', category: 'rubrics' },
  { key: 'target_words_range', english: 'words target', description: 'Label suffix for target word count range', module: 'writing_practice', category: 'compliance' },
  { key: 'writing_assessment_report', english: 'Writing Assessment Report', description: 'Header for writing scorecard report', module: 'writing_practice', category: 'results' },
  { key: 'writing_report_desc', english: 'Evaluated against standard rubrics and word count compliance rules.', description: 'Description in writing scorecard report', module: 'writing_practice', category: 'results' },
  { key: 'submitted_essay_text', english: 'Submitted Essay Text', description: 'Header for viewing the user submitted essay text', module: 'writing_practice', category: 'results' },
  { key: 'my_writing_attempts', english: 'My Standalone Writing Attempts', description: 'Header for writing attempt history view', module: 'writing_practice', category: 'history' },
  { key: 'no_writing_history', english: 'No past writing attempts recorded yet. Start practicing from the catalog!', description: 'Empty state message for writing attempt history', module: 'writing_practice', category: 'history' },
  { key: 'writing_scorecard', english: 'Writing Scorecard', description: 'Writing scorecard title', module: 'writing_practice', category: 'results' },
  { key: 'task_achievement', english: 'Task Achievement', description: 'IELTS Task 1 criterion for answering requirements and data accuracy', module: 'writing_practice', category: 'rubrics' },
  { key: 'task_response', english: 'Task Response', description: 'IELTS Task 2 criterion for addressing prompt and developing arguments', module: 'writing_practice', category: 'rubrics' },
  { key: 'coherence_cohesion', english: 'Coherence and Cohesion', description: 'Criterion for clarity, progression, and linking devices', module: 'writing_practice', category: 'rubrics' },
  { key: 'lexical_resource', english: 'Lexical Resource', description: 'Criterion for vocabulary variety, accuracy, and collocations', module: 'writing_practice', category: 'rubrics' },
  { key: 'grammatical_range', english: 'Grammatical Range & Accuracy', description: 'Criterion for syntactic variety, structure control, and punctuation', module: 'writing_practice', category: 'rubrics' },
  { key: 'topic_development', english: 'Topic Development', description: 'TOEFL criterion for substantive explanation and concrete examples', module: 'writing_practice', category: 'rubrics' },
  { key: 'organization_structure', english: 'Organization & Structure', description: 'TOEFL criterion for well-formed introduction, body, and conclusion', module: 'writing_practice', category: 'rubrics' },
  { key: 'language_use', english: 'Language Use', description: 'TOEFL criterion for syntactic variety and idiomatic phrasing', module: 'writing_practice', category: 'rubrics' },
  { key: 'word_count', english: 'Word Count', description: 'Label for word count indicator', module: 'writing_practice', category: 'compliance' },
  { key: 'non_compliant_length', english: 'Non-compliant length', description: 'Warning indicator when essay does not meet word count requirements', module: 'writing_practice', category: 'compliance' },
  { key: 'word_count_on_target', english: 'Word count on target', description: 'Status message when word count satisfies requirements', module: 'writing_practice', category: 'compliance' },
  { key: 'under_minimum_words', english: 'Under minimum words needed', description: 'Status indicator when essay is below minimum words', module: 'writing_practice', category: 'compliance' },
  { key: 'exceeds_maximum_words', english: 'Exceeds maximum words', description: 'Status indicator when essay exceeds maximum words', module: 'writing_practice', category: 'compliance' },
  { key: 'min_words', english: 'Min Words', description: 'Label for minimum word count target', module: 'writing_practice', category: 'compliance' },
  { key: 'max_words', english: 'Max Words', description: 'Label for maximum word count target', module: 'writing_practice', category: 'compliance' },
  { key: 'time_spent', english: 'Time Spent', description: 'Label for duration spent on writing drill', module: 'writing_practice', category: 'metrics' },
  { key: 'stimulus_image', english: 'Stimulus Image', description: 'Label for visual stimulus prompt image', module: 'writing_practice', category: 'drills' },
  { key: 'zoom_in', english: 'Zoom In', description: 'Button to zoom in on stimulus diagram', module: 'writing_practice', category: 'actions' },
  { key: 'zoom_out', english: 'Zoom Out', description: 'Button to zoom out on stimulus diagram', module: 'writing_practice', category: 'actions' },
  { key: 'reset_zoom', english: 'Reset Zoom', description: 'Button to reset stimulus diagram zoom to 100%', module: 'writing_practice', category: 'actions' },
  { key: 'close_lightbox', english: 'Close', description: 'Button to dismiss the diagram lightbox modal', module: 'writing_practice', category: 'actions' },
  { key: 'overall_score', english: 'Overall Score', description: 'Total calculated writing score', module: 'writing_practice', category: 'results' },
  { key: 'overall_band', english: 'Overall Band', description: 'Standardized IELTS band score (e.g. Band 7.5)', module: 'writing_practice', category: 'results' },
  { key: 'examiner_feedback', english: 'Examiner Feedback', description: 'Detailed qualitative feedback from evaluator', module: 'writing_practice', category: 'results' },
  { key: 'lexical_suggestions', english: 'Lexical & Vocabulary Suggestions', description: 'Section listing vocabulary improvement suggestions', module: 'writing_practice', category: 'results' },
  { key: 'grammar_feedback', english: 'Grammar & Syntax Feedback', description: 'Section listing grammatical and syntactic corrections', module: 'writing_practice', category: 'results' },
  { key: 'underlength_penalty', english: 'Underlength Penalty Applied', description: 'Notice that essay received penalty for underlength', module: 'writing_practice', category: 'results' },
  { key: 'IELTS_TASK_1', english: 'IELTS Academic Task 1', description: 'Preset template for IELTS Academic Task 1', module: 'writing_practice', category: 'presets' },
  { key: 'IELTS_TASK_2', english: 'IELTS Academic Task 2', description: 'Preset template for IELTS Academic Task 2', module: 'writing_practice', category: 'presets' },
  { key: 'TOEFL_INDEPENDENT', english: 'TOEFL Independent Essay', description: 'Preset template for TOEFL Independent Essay', module: 'writing_practice', category: 'presets' },
  { key: 'prompt_stem', english: 'Prompt Stem', description: 'Label for prompt instructions and question stem', module: 'writing_practice', category: 'authoring' },
  { key: 'stimulus_text', english: 'Stimulus Text', description: 'Label for supplementary passage or data context', module: 'writing_practice', category: 'authoring' },
  { key: 'sample_model_answer', english: 'Sample Model Answer', description: 'Label for high-band benchmark response', module: 'writing_practice', category: 'authoring' },
  { key: 'writing_authoring', english: 'Writing Question Authoring', description: 'Authoring modal title for writing questions', module: 'writing_practice', category: 'authoring' },
  { key: 'writing_presets', english: 'Writing Presets', description: 'Preset templates selector for authoring writing questions', module: 'writing_practice', category: 'authoring' },

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
