========================================================================
ExamOS — Pre-configured Database Package
========================================================================

This package contains the pre-seeded PostgreSQL (PGlite) database for ExamOS,
including:
  - Complete Course & Syllabus Trees (JEE, NEET, IELTS)
  - Full Question Bank with Multi-Type Questions
  - Exam Patterns & Blueprints
  - AI Configuration & Multi-Provider Stacking (Groq, Gemini, Ollama, etc.)
  - Subscriptions, Plans & Entitlements Engine
  - Pre-seeded Personas & Roles

------------------------------------------------------------------------
HOW TO INSTALL (Windows):
------------------------------------------------------------------------
Option A (Recommended):
  1. Extract this zip file directly into your ExamOS root folder
     (the folder containing start_all.bat and ExamOS-Build-Directive.md).
  2. Run:
       setupdb.bat
  3. Start ExamOS:
       start_all.bat

Option B (Stand-alone folder):
  1. Extract this zip file anywhere on your computer.
  2. Run setupdb.bat — it will locate or prompt for your ExamOS path
     and install the database cleanly.

------------------------------------------------------------------------
HOW TO INSTALL (macOS / Linux):
------------------------------------------------------------------------
  1. Extract this zip file into your ExamOS root folder.
  2. In your terminal, run:
       bash setupdb.sh
  3. Start ExamOS:
       bash start_all.sh

------------------------------------------------------------------------
DEFAULT LOGIN CREDENTIALS:
------------------------------------------------------------------------
  - Main Admin:   admin@examos.com    / Admin@123
  - Sub-Admin:    subadmin@examos.com / SubAdmin@123
  - Teacher:      teacher@examos.com  / Teacher@123
  - Student 1:    student@examos.com  / Student@123
  - Student 2:    student2@examos.com / Student2@123

========================================================================
