# Specification 31: 3-Theme Switcher & Database-Driven Multilingual Engine

## 1. Overview & Objectives

The **3-Theme Switcher & Database-Driven Multilingual Engine** provides platform-wide visual customization and internationalization (i18n) across all user roles, interfaces, and tabs on both web and mobile experiences.

### Key Objectives:
1. **3 Visual Theme Modes**:
   - **`LIGHT`**: Clean, high-contrast light mode for daytime study.
   - **`GRAY`**: Slate warm neutral low-contrast mode designed for prolonged reading and minimal eye strain during exams.
   - **`DARK`**: Obsidian dark mode with sleek glassmorphism accents.
2. **Database-Driven Multilingual System**:
   - Out-of-the-box support for **22 Official 8th Schedule Languages of India** + **English** (23 baseline languages).
   - Fully extensible database translation storage (`languages`, `translation_keys`, `translations`), allowing real-time addition of new languages and updated translation strings via API without requiring code redeployments.
3. **Seamless Preference Synchronization**:
   - Synchronizes user theme and language selections across sessions in the database, with fast client-side fallback via local storage and Redis caching.

---

## 2. Supported Baseline Languages (23 Total)

The database is pre-seeded with 23 baseline languages:

| ISO Code | English Name | Native Name | Direction | Initial Status |
|---|---|---|---|---|
| `en` | English | English | LTR | Active |
| `hi` | Hindi | हिन्दी | LTR | Active |
| `bn` | Bengali | বাংলা | LTR | Active |
| `te` | Telugu | తెలుగు | LTR | Active |
| `mr` | Marathi | मराठी | LTR | Active |
| `ta` | Tamil | தமிழ் | LTR | Active |
| `ur` | Urdu | اُردُو | RTL | Active |
| `gu` | Gujarati | ગુજરાતી | LTR | Active |
| `kn` | Kannada | ಕನ್ನಡ | LTR | Active |
| `ml` | Malayalam | മലയാളം | LTR | Active |
| `or` | Odia | ওଡ଼ିଆ | LTR | Active |
| `pa` | Punjabi | ਪੰਜਾਬੀ | LTR | Active |
| `as` | Assamese | অসমীয়া | LTR | Active |
| `ma` | Maithili | मैथिली | LTR | Active |
| `sat`| Santali | ᱥᱟᱱᱛᱟᱲᱤ | LTR | Active |
| `ks` | Kashmiri | কশ্‌মিৰী / کشمیری | LTR/RTL | Active |
| `ne` | Nepali | नेपाली | LTR | Active |
| `kok`| Konkani | कोंकणी | LTR | Active |
| `sd` | Sindhi | سنڌي / सिन्धी | LTR/RTL | Active |
| `dog`| Dogri | डोगरी | LTR | Active |
| `mni`| Manipuri (Meitei) | মৈতৈলোন্ | LTR | Active |
| `brx`| Bodo | बड़ो | LTR | Active |
| `sa` | Sanskrit | संस्कृतम् | LTR | Active |

---

## 3. Visual Theme Specifications

The application UI supports three discrete themes toggled via a top-bar component available across all screens and tabs:

### 3.1 Light Mode (`LIGHT`)
- **Background**: `#FFFFFF` / Card: `#F8FAFC`
- **Primary Accent**: `#2563EB` (Royal Blue)
- **Text Color**: `#0F172A` (Slate 900)
- **Use Case**: Standard daytime browsing and bright lighting environments.

### 3.2 Gray Mode (`GRAY`)
- **Background**: `#1E293B` (Slate 800) / Card: `#334155` (Slate 700)
- **Primary Accent**: `#3B82F6` (Bright Blue)
- **Text Color**: `#F1F5F9` (Slate 100)
- **Use Case**: Warm, neutral, low-contrast mode designed specifically for multi-hour exam taking and reading, minimizing digital eye fatigue.

### 3.3 Dark Mode (`DARK`)
- **Background**: `#090D16` (Deep Obsidian) / Card: `#111827` (Gray 900)
- **Primary Accent**: `#60A5FA` (Light Blue)
- **Text Color**: `#F9FAFB` (Gray 50)
- **Use Case**: Low-light environments and energy-saving OLED screens.

---

## 4. Database Schema Requirements

```text
Table: languages
├── id           CUID        PK
├── code         VARCHAR     UNIQUE, NOT NULL — e.g. "hi", "en", "ta"
├── name         VARCHAR     NOT NULL — e.g. "Hindi"
├── native_name  VARCHAR     NOT NULL — e.g. "हिन्दी"
├── is_rtl       BOOLEAN     DEFAULT false
├── is_active    BOOLEAN     DEFAULT true
├── created_at   TIMESTAMP
└── updated_at   TIMESTAMP

Table: translation_keys
├── id           CUID        PK
├── namespace    VARCHAR     NOT NULL — e.g. "auth", "exam", "dashboard"
├── key          VARCHAR     NOT NULL — e.g. "start_exam_button"
├── default_text TEXT        NOT NULL — English fallback text
├── description  TEXT
└── created_at   TIMESTAMP

Indexes: (namespace, key) UNIQUE

Table: translations
├── id               CUID    PK
├── key_id           CUID    FK, NOT NULL (translation_keys.id)
├── language_id      CUID    FK, NOT NULL (languages.id)
├── translated_text  TEXT    NOT NULL
├── is_verified      BOOLEAN DEFAULT true
├── created_at       TIMESTAMP
└── updated_at       TIMESTAMP

Indexes: (key_id, language_id) UNIQUE

Table: user_preferences
├── user_id               CUID    PK, FK (users.id)
├── theme_mode            ENUM    ('LIGHT', 'GRAY', 'DARK') DEFAULT 'LIGHT'
├── preferred_lang_code   VARCHAR DEFAULT 'en'
├── updated_at            TIMESTAMP
```

---

## 5. API Endpoints

*(Master catalog defined in [API Reference Catalog](../guides/02-api-reference.md))*

| Method | Path | Description | Auth | Permission |
|---|---|---|---|---|
| `GET` | `/api/v1/i18n/languages` | List all supported languages | Public | - |
| `GET` | `/api/v1/i18n/translations/:langCode` | Fetch translation dictionary for locale | Public | - |
| `POST` | `/api/v1/i18n/languages` | Add new language dynamically | Yes | `i18n.manage` |
| `POST` | `/api/v1/i18n/translations` | Add/update translation entries | Yes | `i18n.manage` |
| `GET` | `/api/v1/users/me/preferences` | Get current user's theme & language preference | Yes | `preferences.read` |
| `PATCH` | `/api/v1/users/me/preferences` | Update theme & language preference | Yes | `preferences.update` |

---

## 6. Business & Validation Rules

1. **Fallbacks**: If a key is missing in a selected target language, the engine automatically falls back to `default_text` (English).
2. **Caching**: Translations are cached in Redis (`i18n:dict:<langCode>`) with TTL invalidation when admins update translation keys.
3. **Anonymous Users**: Unauthenticated users select theme and language via top-bar controls, stored in `localStorage`. Upon login, preferences sync with `user_preferences`.
4. **Exam Questions Localization**: Exam question content supports multi-language variants via the Question Bank schema (`question_versions.language_variants`).
