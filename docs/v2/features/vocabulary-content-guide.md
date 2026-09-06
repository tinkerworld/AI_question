# Vocabulary Bank Content Editor Guide (Phase 15)

This guide is designed for content authors, curriculum designers, and teachers who want to expand the ExamOS Vocabulary Bank for IELTS Academic preparation without needing deep software engineering knowledge.

---

## 1. Overview & Data Schema

The ExamOS vocabulary engine uses the **SuperMemo SM-2 spaced repetition algorithm** to schedule active review sessions for students based on their mastery streaks and recall speed.

Every vocabulary word consists of the following fields:

| Field | Type | Required? | Description & Format Rules |
| :--- | :--- | :--- | :--- |
| `word` | `string` | **Yes** | The term in lower case (e.g., `mitigate`, `ubiquitous`). Must not be empty. |
| `definition` | `string` | **Yes** | A clear, comprehensive definition suitable for academic learners. |
| `difficulty` | `string` | No (default `B2`) | CEFR scale level: `B1`, `B2`, `C1`, or `C2` (see scale below). |
| `phonetic` | `string` | Recommended | International Phonetic Alphabet (IPA) format enclosed in slashes, e.g. `/'mɪt.ɪ.ɡeɪt/`. |
| `partOfSpeech` | `string` | Recommended | One of: `noun`, `verb`, `adjective`, `adverb`, `preposition`, `conjunction`. |
| `exampleSentence` | `string` | Recommended | Authentic sentence illustrating natural academic or IELTS usage. |
| `synonyms` | `string[]` | Optional | Array of 3+ synonyms, e.g. `["alleviate", "lessen", "moderate"]`. |
| `antonyms` | `string[]` | Optional | Array of 2+ antonyms, e.g. `["exacerbate", "intensify"]` (empty array if none). |
| `courseId` | `string` | Optional | Identifier of target course (defaults to IELTS course, e.g. `c3`). |
| `syllabusNodeId` | `string` | Optional | Optional syllabus topic anchor. |

---

## 2. The CEFR Difficulty Scale

Assign the difficulty rating according to standard Common European Framework of Reference (CEFR) guidelines:

- **B1 (Intermediate / IELTS Band 4.0–5.0)**:
  Everyday academic words needed for foundational reading and clear communication (e.g., *achieve*, *analyse*, *benefit*, *factor*, *principle*).
- **B2 (Upper Intermediate / IELTS Band 5.5–6.5)**:
  Standard academic discourse vocabulary covering cause, effect, comparison, and abstract ideas (e.g., *accommodate*, *fluctuate*, *inherent*, *preliminary*, *utilize*).
- **C1 (Advanced / IELTS Band 7.0–8.0)**:
  Sophisticated lexical items enabling nuanced argumentation, precision, and formal tone in academic essays (e.g., *exacerbate*, *paradigm*, *pragmatic*, *scrutinize*, *ubiquitous*).
- **C2 (Proficiency / IELTS Band 8.5–9.0)**:
  High-register, rare, and stylistic expressions indicating native-level stylistic mastery and precise shades of meaning (e.g., *ephemeral*, *esoteric*, *perspicacious*, *quintessential*, *serendipitous*).

---

## 3. Adding a Single Word via API

Staff members (with `questions.create` permission, such as Admins and Teachers) can create individual words in real time.

### Step 1: Obtain a Staff JWT Token
```bash
curl -s -X POST http://localhost:4043/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@examos.com","password":"Admin@123"}' | jq -r '.data.token'
```

### Step 2: Post the Word
```bash
curl -X POST http://localhost:4043/api/v1/vocabulary/words \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <STAFF_JWT_TOKEN>" \
  -d '{
    "word": "ameliorate",
    "phonetic": "/əˈmiːl.jə.reɪt/",
    "partOfSpeech": "verb",
    "definition": "To make something that is bad, unsatisfactory, or difficult better.",
    "exampleSentence": "Targeted public health investments help ameliorate systemic health disparities.",
    "synonyms": ["improve", "better", "alleviate", "enhance"],
    "antonyms": ["worsen", "exacerbate", "deteriorate"],
    "difficulty": "C1",
    "courseId": "c3"
  }'
```

---

## 4. Bulk Importing Words from JSON

When preparing tens or hundreds of new terms, use the bulk import endpoint. It validates every entry, prevents duplicates from causing crashes, and returns a detailed report.

- **Endpoint**: `POST /api/v1/vocabulary/words/bulk-import`
- **Permission**: Requires `questions.create` (Staff / Admin).
- **Batch Limit**: Up to 200 words per request.

### Example `words.json` File:
```json
{
  "courseId": "c3",
  "words": [
    {
      "word": "concomitant",
      "phonetic": "/kənˈkɒm.ɪ.tənt/",
      "partOfSpeech": "adjective",
      "definition": "Naturally accompanying or associated with something.",
      "exampleSentence": "Rapid economic industrialization often brings concomitant ecological challenges.",
      "synonyms": ["accompanying", "attendant", "collateral"],
      "antonyms": ["unrelated", "independent"],
      "difficulty": "C2"
    },
    {
      "word": "dichotomy",
      "phonetic": "/daɪˈkɒt.ə.mi/",
      "partOfSpeech": "noun",
      "definition": "A division or contrast between two things that are represented as being entirely opposed.",
      "exampleSentence": "The seminar explored the classic dichotomy between nature and nurture.",
      "synonyms": ["division", "polarity", "split"],
      "antonyms": ["unity", "cohesion"],
      "difficulty": "C1"
    }
  ]
}
```

### Executing the Bulk Import:
```bash
curl -X POST http://localhost:4043/api/v1/vocabulary/words/bulk-import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <STAFF_JWT_TOKEN>" \
  -d @words.json
```

### Expected Response:
```json
{
  "success": true,
  "data": {
    "total": 2,
    "inserted": 2,
    "skipped": 0,
    "errors": []
  }
}
```

If any entry has invalid or missing required fields, it is captured in `errors` while valid words in the same payload are safely inserted.

---

## 5. Permanently Adding Words to the Baseline Seed

To guarantee words survive a full database reset (`reset_db.bat` or `reset_db.sh`), add them directly to the baseline seed list:

1. Open: `Exam/packages/database/prisma/seed-vocabulary.ts`.
2. Locate the `SEED_VOCABULARY_WORDS` array.
3. Append your new entry:
   ```ts
   {
     word: 'juxtapose',
     phonetic: '/ˌdʒʌk.stəˈpəʊz/',
     partOfSpeech: 'verb',
     definition: 'To place or deal with close together for contrasting effect.',
     exampleSentence: 'The visual artist chose to juxtapose rural pastoral scenes with harsh industrial machinery.',
     synonyms: ['contrast', 'collocate', 'compare', 'pair'],
     antonyms: ['separate', 'isolate'],
     difficulty: 'C1'
   },
   ```
4. Run the seed script to apply changes immediately:
   ```bash
   # From the Exam/ directory:
   npx ts-node -r tsconfig-paths/register --project apps/api/tsconfig.json packages/database/prisma/seed-vocabulary.ts
   ```
5. Because the script uses `ON CONFLICT ("id") DO UPDATE`, it will update any existing terms and insert new ones idempotently without duplicating data.
