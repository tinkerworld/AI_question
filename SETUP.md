# ExamOS Quick Start Guide

ExamOS is a full-stack, enterprise-grade online examination, AI-assisted authoring, and assessment platform. It features authentic multi-section exam players, live proctoring, AI interviews, mastery tracking, student impersonation/preview mode, and subscription & entitlement management.

---

## 1. Prerequisites

Before installing, make sure you have the following installed:
- **Node.js**: v18.0.0 or higher ([Download from nodejs.org](https://nodejs.org/))
- **pnpm**: v8.0.0 or higher
  - If you don't have pnpm, install it with: `npm install -g pnpm`

---

## 2. One-Click Installation

Run the automatic installer for your operating system:

### On Windows
Double-click `install.bat` or run in Command Prompt / PowerShell:
```cmd
install.bat
```

### On macOS / Linux
Open Terminal and run:
```bash
chmod +x install.sh start_all.sh stop_all.sh
bash install.sh
```

The installer will:
1. Verify Node.js and pnpm dependencies
2. Install all workspace monorepo packages (`pnpm install`)
3. Initialize the embedded PostgreSQL 16 database and run all schema migrations
4. Seed the database with courses, subjects, question banks, sample exams, AI models, and student attempt profiles

---

## 3. Starting the Application

### On Windows
```cmd
start_all.bat
```
*(To stop all services: run `stop_all.bat`)*

### On macOS / Linux
```bash
bash start_all.sh
```
*(To stop all services: run `bash stop_all.sh`)*

### Service URLs
| Service | URL | Description |
| :--- | :--- | :--- |
| **Web Application** | [http://localhost:3000](http://localhost:3000) | Main React UI for Students, Teachers & Admins |
| **Express API Server** | [http://localhost:4000](http://localhost:4000) | REST API & In-Process PostgreSQL 16 Engine |
| **Build Tracker UI** | [http://localhost:3050](http://localhost:3050) | Architecture state & verification monitor |

---

## 4. Baseline Persona Login Credentials

Use any of the seeded test personas to log in at [http://localhost:3000](http://localhost:3000):

| Role | Email | Password | Scope & Permissions |
| :--- | :--- | :--- | :--- |
| **Main Admin** | `admin@examos.com` | `Admin@123` | Full system access, users, settings, AI gateways, billing refunds |
| **Sub-Admin** | `subadmin@examos.com` | `SubAdmin@123` | Operational management, exam reviews, user views |
| **Teacher / Faculty** | `teacher@examos.com` | `Teacher@123` | Question bank authoring, AI generators, grading, student analytics |
| **Student 1 (Free)** | `student@examos.com` | `Student@123` | Exam attempts, practice papers, basic AI interview, Free Tier limits |
| **Student 2 (Premium)** | `student2@examos.com` | `Student2@123` | Enrolled in JEE/NEET, active Premium subscription, AI interviews |

---

## 5. More Information & Architecture

For detailed architecture documentation, question type specifications, security boundary documentation, and developer guides, refer to [`README.md`](README.md) and the [`docs/`](docs/) directory.
