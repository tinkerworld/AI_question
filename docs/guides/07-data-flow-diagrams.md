# Data Flow Diagrams

This document visualizes the critical workflows and data flows within the Adaptive Examination & AI Learning Platform using Mermaid diagrams.

## 1. Student Login Flow

**Description**: The authentication process for students, including credentials validation, JWT issuance, and role-based redirection.

```mermaid
sequenceDiagram
    participant Browser
    participant LoginPage
    participant AuthAPI as POST /auth/login
    participant DB as PostgreSQL
    
    Browser->>LoginPage: Enter credentials (email, password)
    LoginPage->>AuthAPI: Send credentials
    AuthAPI->>DB: Query user by email
    DB-->>AuthAPI: User record (hash, role, status)
    AuthAPI->>AuthAPI: Validate bcrypt hash & status
    
    alt Validation Failed
        AuthAPI-->>LoginPage: 401 Unauthorized
        LoginPage-->>Browser: Show error message
    else Validation Successful
        AuthAPI->>AuthAPI: Generate Access JWT (15m) & Refresh JWT (7d)
        AuthAPI->>DB: Update last login
        AuthAPI-->>LoginPage: Return JWTs & User Profile
        LoginPage->>Browser: Store tokens & redirect by role (Student Dashboard)
    end
```

## 2. Exam Taking Flow

**Description**: The process of taking an exam, from loading the exam to final submission and auto-evaluation.

```mermaid
sequenceDiagram
    participant Student
    participant Browser
    participant API
    participant DB
    
    Student->>Browser: Start Exam
    Browser->>API: POST /attempts/start (Exam ID)
    API->>DB: Check eligibility & active attempts
    DB-->>API: OK
    API->>DB: Create Attempt record
    API-->>Browser: Return Attempt ID & Initial Questions
    
    loop During Exam
        Student->>Browser: Select Answer
        Browser->>API: POST /attempts/{id}/autosave
        API->>DB: Update Attempt State
        DB-->>API: Success
        API-->>Browser: Autosave Confirmed
    end
    
    Student->>Browser: Submit Exam (or Timer Expires)
    Browser->>API: POST /attempts/{id}/submit
    API->>DB: Mark Attempt as SUBMITTED
    API->>API: Auto-evaluate answers
    API->>DB: Save Result & Mastery updates
    API-->>Browser: Return Final Score
```

## 3. Mastery Calculation Flow

**Description**: How the system calculates and updates a student's topic mastery and weakness pool based on exam results.

```mermaid
flowchart TD
    A[Exam Submitted] --> B[Extract Answers]
    B --> C[Group Answers by Topic]
    C --> D{Evaluate Answers}
    D -- Correct --> E[Calculate Per-Topic Score]
    D -- Incorrect --> F[Calculate Per-Topic Score]
    
    E --> G[Apply Mastery Algorithm]
    F --> G
    
    G --> H[Update Topic Mastery Score]
    G --> I{Threshold Check}
    
    I -- Score < 60% --> J[Add to Weakness Pool]
    I -- Score >= 60% --> K[Remove from Weakness Pool if present]
    
    H --> L[Save Mastery Profile]
    J --> L
    K --> L
```

## 4. AI Question Modification

**Description**: Process of modifying a question using the AI Gateway, supporting multiple providers.

```mermaid
sequenceDiagram
    participant Teacher
    participant UI
    participant API
    participant AIGateway as AI Gateway
    participant Provider as AI Provider (e.g., OpenAI, Ollama)
    participant DB
    
    Teacher->>UI: Select Question & Modification Type (e.g., Make Harder)
    UI->>API: POST /ai/modify-question
    API->>API: Construct Prompt
    API->>AIGateway: Request Modification (Prompt, Config)
    AIGateway->>Provider: Send request
    Provider-->>AIGateway: Return generated variation
    AIGateway-->>API: Return response
    API->>API: Validate Output format (Zod)
    API->>DB: Save as DRAFT question
    API-->>UI: Return New Question Draft
    UI-->>Teacher: Display Draft for Review
```

## 5. AI Interview Session

**Description**: An interactive AI-driven interview session for practice, involving text-to-speech and speech-to-text.

```mermaid
sequenceDiagram
    participant Student
    participant UI as Browser (WebRTC/MediaRecorder)
    participant STT as STT Service
    participant API as Interview API
    participant AI as AI Gateway
    participant TTS as TTS Service
    participant DB
    
    Student->>UI: Start Interview
    UI->>API: Initialize Session
    API->>DB: Create Session
    API->>AI: Generate Greeting
    AI-->>API: Text Greeting
    API->>TTS: Synthesize Speech
    TTS-->>API: Audio Stream
    API-->>UI: Audio Greeting
    UI-->>Student: Play Audio
    
    loop Q&A Exchange
        Student->>UI: Speak Answer
        UI->>STT: Stream Audio
        STT-->>UI: Transcribed Text
        UI->>API: Send Transcript
        API->>DB: Track State
        API->>AI: Evaluate & Generate Next Prompt
        AI-->>API: Text Response
        API->>TTS: Synthesize Speech
        TTS-->>API: Audio Stream
        API-->>UI: Audio Response
        UI-->>Student: Play Audio
    end
    
    Student->>UI: End Interview
    UI->>API: Finalize Session
    API->>AI: Generate Final Feedback
    AI-->>API: Feedback Text
    API->>DB: Save Feedback
    API-->>UI: Return Report
```

## 6. Exam Generation Flow

**Description**: Automatic generation of an exam based on a predefined pattern.

```mermaid
flowchart TD
    A[Select Exam Pattern] --> B[Validate Pattern constraints against Question Bank]
    B --> C{Constraints Met?}
    C -- No --> D[Return Error: Insufficient Questions]
    C -- Yes --> E[Query Questions by Subject/Topic/Difficulty]
    
    E --> F[Apply Rules: Exclude recently used, balance options]
    F --> G[Randomize/Shuffle Selection]
    G --> H[Create Exam Draft]
    
    H --> I[Review Mode]
    I --> J{Teacher Action}
    J -- Swap Question --> E
    J -- Approve --> K[Publish Exam]
    K --> L[Generate Exam Snapshot]
```

## 7. Subscription Check Flow

**Description**: Entitlement checking process to ensure users have active subscriptions for premium features.

```mermaid
sequenceDiagram
    participant Student
    participant API as Protected Endpoint
    participant Entitlement as Entitlement Engine
    participant DB
    
    Student->>API: Action (e.g., Start AI Interview)
    API->>Entitlement: Check Access (ActionType)
    Entitlement->>DB: Get User Subscription & Usage
    DB-->>Entitlement: Plan Details & Current Usage
    
    Entitlement->>Entitlement: Evaluate Limits (e.g., Interviews/month)
    
    alt Limit Exceeded or No Plan
        Entitlement-->>API: DENY
        API-->>Student: 403 Forbidden (Upgrade Required)
    else Within Limits
        Entitlement-->>API: ALLOW
        API->>DB: Increment Usage Tracker
        API->>API: Execute Action
        API-->>Student: 200 OK (Result)
    end
```

## 8. Preview Student Flow

**Description**: Staff masquerading as a student to preview content, with strict isolation and auditing.

```mermaid
sequenceDiagram
    participant Staff
    participant AuthAPI
    participant PreviewDB as DB (Preview Tables)
    participant ActionAPI as Exam API
    
    Staff->>AuthAPI: Request Preview Mode (Select Plan/Courses)
    AuthAPI->>AuthAPI: Generate Preview Context JWT
    AuthAPI-->>Staff: Return Preview JWT
    
    Staff->>ActionAPI: Start Exam (using Preview JWT)
    ActionAPI->>ActionAPI: Detect Preview Mode
    ActionAPI->>PreviewDB: Read Courses/Questions (Production DB)
    ActionAPI->>PreviewDB: Write Attempt Data to Preview Tables Only!
    
    ActionAPI->>PreviewDB: Audit Action (Actor: Staff ID, Target: Preview Student)
    ActionAPI-->>Staff: Return Exam Data
```

## 9. Question Lifecycle

**Description**: State machine and lifecycle of a question item within the bank.

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Created by Teacher/AI
    DRAFT --> REVIEW: Submitted for Verification
    REVIEW --> DRAFT: Rejected (Needs edits)
    REVIEW --> PUBLISHED: Approved
    PUBLISHED --> ARCHIVED: Deprecated/Outdated
    ARCHIVED --> [*]
    
    state PUBLISHED {
        [*] --> AVAILABLE
        AVAILABLE --> IN_EXAM: Selected for Exam
        IN_EXAM --> AVAILABLE: Exam Over/Snapshot Taken
    }
```

## 10. Published Exam Snapshot

**Description**: Creating immutable snapshots of exams to preserve integrity even if underlying questions change.

```mermaid
flowchart LR
    A[Publish Action Triggered] --> B[Generate Unique Snapshot ID]
    B --> C[Fetch Exam Metadata]
    B --> D[Fetch All Selected Questions]
    B --> E[Fetch Answer Key]
    B --> F[Fetch Exam Pattern Rules]
    
    C & D & E & F --> G[Construct Immutable JSON Document]
    G --> H[Save to Snapshot Table/Storage]
    H --> I[Link Exam ID to Snapshot ID]
    
    I --> J[Student Attempts Use Snapshot Data]
```
