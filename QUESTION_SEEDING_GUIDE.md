# Question Database Seeding Guide

## Overview
The `seed-questions.ts` script synthetically populates your Supabase `questions` table using AI generation. This ensures new users have a rich question bank to explore without needing manual data entry or web scraping.

---

## Prerequisites

### 1. Environment Variables
Add the service role key to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # ← New requirement
NEXT_PUBLIC_API_URL=http://localhost:3000        # ← Or your production URL
```

**Where to find Service Role Key:**
1. Go to Supabase Dashboard → Project Settings → API
2. Under "Project API keys", copy the `service_role` key (NOT the `anon` key)
3. ⚠️ **NEVER commit this key to git** - it bypasses Row Level Security!

### 2. Database Migrations
Ensure you've run all migrations:
- `010_create_questions_table.sql`
- `011_create_question_images_storage.sql`

### 3. AI API Running
The script requires your AI generation API endpoint (`/api/ai/generate`) to be running:
- For development: `npm run dev` in another terminal
- For production: Use your production URL

---

## Usage

### Basic Commands

```bash
# Seed with default settings (2 questions per combination)
npm run seed:questions

# Preview without inserting (dry run)
npm run seed:questions:dry

# Clear existing questions and seed fresh
npm run seed:questions:clear

# Custom number of questions per combination
npm run seed:questions -- --count 5

# Combine options
npm run seed:questions -- --clear --count 3
```

### Command Options

| Option | Description | Example |
|--------|-------------|---------|
| `--count <n>` | Questions per combination (default: 2) | `--count 5` |
| `--dry-run` | Preview without database insertion | `--dry-run` |
| `--clear` | Delete all existing questions first | `--clear` |
| `--help` | Show help message | `--help` |

---

## How It Works

### 1. Curriculum Structure

The script uses `SEED_CURRICULUM` constant with this structure:

```typescript
const SEED_CURRICULUM = {
  "GCSE Higher": {
    "Algebra": ["Simultaneous Equations", "Quadratics", ...],
    "Geometry": ["Circle Theorems", "Trigonometry", ...]
  },
  "GCSE Foundation": {
    "Number": ["Fractions", "Percentages", ...],
    "Algebra": ["Solving Linear Equations", ...]
  },
  "A-Level Pure": {
    "Calculus": ["Differentiation", "Integration", ...]
  }
}
```

### 2. Question Combinations

For each (Level, Topic, SubTopic), the script generates questions with:

- **Question Types:** Fluency, Problem Solving, Reasoning/Proof
- **Mark Allocations:** 2, 3, 4, 6 marks
- **Calculator Settings:** Allowed, Not Allowed
- **Quantity:** N questions per combination (default: 2)

**Total Questions Formula:**
```
Total = (Levels × Topics × SubTopics × Types × Marks × CalcSettings) × Count
```

**Example (default settings):**
- 3 levels × 8 topics × 30 subtopics = 720 base combinations
- 720 × 3 types × 4 marks × 2 calc = ~17,280 combinations
- 17,280 × 2 questions/combo = **~34,560 total questions**

### 3. Generation Process

```mermaid
graph LR
    A[Curriculum Data] --> B[Generate Combinations]
    B --> C[For each combination]
    C --> D[Call AI API]
    D --> E[Generate Question]
    E --> F[Insert to DB]
    F --> G[Progress Update]
    G --> C
```

Each question generation:
1. Constructs pedagogically-aware prompt
2. Calls `/api/ai/generate` endpoint
3. Receives LaTeX question + answer + explanation
4. Inserts into `questions` table with metadata
5. Waits 500ms (rate limiting)

---

## Output Examples

### Dry Run Output
```
🌱 Starting Question Database Seeding...

═══════════════════════════════════════════════════════
📊 Configuration:
   • Questions per combination: 2
   • Dry run: YES
   • Clear existing: NO
═══════════════════════════════════════════════════════

📈 Total combinations: 864
📈 Total questions to generate: 1728

📚 Level: GCSE Higher
───────────────────────────────────────────────────────

  📖 Topic: Algebra

    📝 Sub-Topic: Simultaneous Equations
      [2.5%] Fluency | 2m | Calc | 1/2 ... ✅ SUCCESS
      [5.0%] Fluency | 2m | Calc | 2/2 ... ✅ SUCCESS
      [7.5%] Fluency | 2m | NoCalc | 1/2 ... ✅ SUCCESS
      ...
```

### Completion Summary
```
═══════════════════════════════════════════════════════
🎉 Seeding Complete!
═══════════════════════════════════════════════════════
✅ Success: 1680
❌ Failures: 48
⏱️  Duration: 3420.5s (57 min)
📊 Success Rate: 97.2%
═══════════════════════════════════════════════════════
```

---

## Curriculum Data

### Current Coverage

**GCSE Higher (3 topics, 17 subtopics)**
- Algebra: 6 subtopics
- Geometry: 6 subtopics
- Number: 5 subtopics

**GCSE Foundation (3 topics, 13 subtopics)**
- Number: 6 subtopics
- Algebra: 5 subtopics
- Geometry: 4 subtopics

**A-Level Pure (3 topics, 13 subtopics)**
- Algebra: 5 subtopics
- Calculus: 4 subtopics
- Trigonometry: 4 subtopics

### Expanding the Curriculum

To add more coverage, edit `SEED_CURRICULUM` in `scripts/seed-questions.ts`:

```typescript
const SEED_CURRICULUM = {
  "GCSE Higher": {
    "Statistics": [  // ← Add new topic
      "Mean, Median, Mode",
      "Probability",
      "Sampling"
    ]
  },
  "A-Level Statistics": {  // ← Add new level
    "Probability": ["..."],
    "Hypothesis Testing": ["..."]
  }
}
```

---

## Performance & Optimization

### Rate Limiting
- Default: 500ms wait between requests
- Prevents overwhelming AI API
- Adjust in script: `setTimeout(resolve, 500)`

### Parallelization (Future)
Current: Sequential generation
Future: Batch processing with Promise.all()

```typescript
// Future enhancement
const batchSize = 10
const promises = combinations.slice(0, batchSize).map(generateQuestion)
await Promise.all(promises)
```

### Estimated Duration

| Questions/Combo | Total Questions | Est. Duration |
|----------------|----------------|---------------|
| 1 | ~17,280 | ~2.5 hours |
| 2 (default) | ~34,560 | ~5 hours |
| 5 | ~86,400 | ~12 hours |

**Calculation:** 
```
Duration (s) = (Total Questions × 0.5s per request) + (Total Questions × ~1-2s AI generation)
```

### Recommendations

**First Run (Quick Test):**
```bash
npm run seed:questions -- --count 1 --dry-run  # Preview first!
```

**Production Seeding:**
```bash
# Start small, verify quality
npm run seed:questions -- --count 1  

# Expand after verification
npm run seed:questions -- --count 2
```

---

## Troubleshooting

### Error: "Missing environment variables"
**Solution:** Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

### Error: "Cannot find module 'dotenv'"
**Solution:** 
```bash
npm install --save-dev dotenv tsx @types/node
```

### Error: "API Error: 429 Too Many Requests"
**Solution:** Increase rate limit delay in script (line with `setTimeout`)

### Error: "Insert Error: violates check constraint"
**Solution:** Check your question data matches schema constraints:
- `question_type` must be: "Fluency", "Problem Solving", or "Reasoning/Proof"
- `difficulty` must be: "Foundation" or "Higher"
- `marks` must be > 0

### High Failure Rate (>10%)
**Causes:**
1. AI API endpoint not responding
2. Network issues
3. Invalid prompt structure
4. Database constraints violations

**Solutions:**
1. Check AI API is running: `curl http://localhost:3000/api/ai/generate`
2. Check Supabase connection
3. Run dry run first to test prompts
4. Check database logs in Supabase Dashboard

---

## Database Schema Reference

Questions inserted with this structure:

```typescript
{
  content_type: 'generated_text',
  question_latex: 'Solve $2x + 5 = 13$',
  curriculum_level: 'GCSE Higher',
  topic: 'Algebra',
  sub_topic: 'Solving Linear Equations',
  difficulty: 'Higher',
  marks: 3,
  question_type: 'Fluency',
  calculator_allowed: false,
  answer_key: {
    answer: '$x = 4$',
    explanation: 'Step 1: Subtract 5... Step 2: Divide by 2...'
  },
  is_verified: true,      // ← Seed questions pre-verified
  created_by: null        // ← System-generated (no user)
}
```

---

## Advanced Usage

### Custom Mark Allocations

Edit `MARK_ALLOCATIONS` in script:

```typescript
// Default
const MARK_ALLOCATIONS = [2, 3, 4, 6]

// Custom (e.g., only 1 and 2 mark questions)
const MARK_ALLOCATIONS = [1, 2]
```

### Custom Question Types

Edit `QUESTION_TYPES`:

```typescript
// Default
const QUESTION_TYPES = ["Fluency", "Problem Solving", "Reasoning/Proof"]

// Custom (e.g., only Fluency)
const QUESTION_TYPES = ["Fluency"]
```

### Custom Calculator Settings

Edit `CALCULATOR_SETTINGS`:

```typescript
// Default
const CALCULATOR_SETTINGS = [true, false]

// Custom (e.g., only calculator allowed)
const CALCULATOR_SETTINGS = [true]
```

---

## Security Considerations

### Service Role Key
⚠️ **CRITICAL:** The service role key bypasses RLS policies!

**Best Practices:**
1. ✅ Store in `.env.local` (never commit)
2. ✅ Use only in server-side scripts
3. ✅ Rotate periodically
4. ❌ Never expose to client-side code
5. ❌ Never commit to version control

### Production Seeding

**Option 1: Local Seeding → Production Database**
```bash
# Point to production Supabase URL
NEXT_PUBLIC_SUPABASE_URL=https://your-prod.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key
npm run seed:questions
```

**Option 2: Server-Side Seeding**
```bash
# SSH into production server
ssh your-server
cd /app
npm run seed:questions
```

**Option 3: One-Time Cloud Function**
Deploy seeding script as a one-time cloud function (Google Cloud Functions, AWS Lambda, etc.)

---

## Maintenance

### Updating Curriculum
1. Edit `SEED_CURRICULUM` in `scripts/seed-questions.ts`
2. Run `npm run seed:questions -- --dry-run` to preview
3. Run `npm run seed:questions` to seed new content

### Clearing Bad Data
```bash
# Clear all and re-seed
npm run seed:questions:clear

# Or manually in Supabase SQL Editor:
DELETE FROM public.questions WHERE created_by IS NULL;
```

### Verifying Quality

**Random Sample Check:**
```sql
-- Get 10 random questions
SELECT 
  curriculum_level,
  topic,
  sub_topic,
  question_type,
  marks,
  question_latex,
  answer_key->>'answer' as answer
FROM public.questions
WHERE created_by IS NULL  -- System-generated only
ORDER BY random()
LIMIT 10;
```

**Count by Level:**
```sql
SELECT 
  curriculum_level,
  COUNT(*) as total,
  COUNT(CASE WHEN is_verified = true THEN 1 END) as verified
FROM public.questions
GROUP BY curriculum_level
ORDER BY curriculum_level;
```

---

## Future Enhancements

### Planned Features
- [ ] Batch parallel generation (10x faster)
- [ ] Resume from last position on failure
- [ ] Progress persistence (save state to JSON)
- [ ] Quality validation (check LaTeX validity)
- [ ] Duplicate detection
- [ ] Multi-language support
- [ ] Export to JSON/CSV

### Contribution
To add features, edit `scripts/seed-questions.ts` and submit a PR!

---

## Summary

✅ **Automated question generation** - No manual data entry  
✅ **Curriculum-aligned** - Structured by level/topic/subtopic  
✅ **Pedagogically diverse** - Multiple types, marks, calculator settings  
✅ **Scalable** - Generate thousands of questions  
✅ **Flexible** - Configurable via CLI arguments  
✅ **Safe** - Dry run mode, error handling, rate limiting  
✅ **Production-ready** - Service role auth, RLS bypass  

Happy seeding! 🌱
