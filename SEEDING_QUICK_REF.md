# Question Seeding - Quick Reference

## Setup (One-time)

1. **Add Service Role Key to `.env.local`:**
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
   
   Find it: Supabase Dashboard → Settings → API → `service_role` key

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run Migrations:**
   - Ensure migrations 010 and 011 are applied in Supabase

---

## Usage

### Quick Commands

```bash
# Test (dry run - no database writes)
npm run seed:questions:dry

# Seed database (default: 2 questions per combination)
npm run seed:questions

# Clear all existing and re-seed
npm run seed:questions:clear

# Custom count (e.g., 5 questions per combination)
npm run seed:questions -- --count 5
```

---

## What Gets Generated

For each curriculum combination, generates:
- **3 Question Types:** Fluency, Problem Solving, Reasoning/Proof
- **4 Mark Values:** 2, 3, 4, 6 marks
- **2 Calculator Settings:** Allowed, Not Allowed
- **N Questions:** (default: 2 per combination)

**Total with default settings:**
- ~34,560 questions
- ~5 hours generation time

---

## Curriculum Coverage

### Current Data
- **GCSE Higher:** 3 topics, 17 subtopics
- **GCSE Foundation:** 3 topics, 13 subtopics  
- **A-Level Pure:** 3 topics, 13 subtopics

### Expanding Curriculum
Edit `SEED_CURRICULUM` in `scripts/seed-questions.ts`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing environment variables" | Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` |
| "Cannot find module" | Run `npm install` |
| "API Error: 429" | Increase rate limit in script |
| High failure rate | Check AI API is running, check database constraints |

---

## Safety

✅ Always test with `--dry-run` first  
✅ Never commit `.env.local` with service key  
✅ Start with `--count 1` to verify quality  
✅ Monitor progress and success rate  

---

## Output Example

```
🌱 Starting Question Database Seeding...
═══════════════════════════════════════
📊 Configuration:
   • Questions per combination: 2
   • Dry run: NO
   • Clear existing: NO
═══════════════════════════════════════

📈 Total questions to generate: 34,560

📚 Level: GCSE Higher
───────────────────────────────────────
  📖 Topic: Algebra
    📝 Sub-Topic: Simultaneous Equations
      [2.5%] Fluency | 2m | Calc | 1/2 ... ✅ SUCCESS
      ...

═══════════════════════════════════════
🎉 Seeding Complete!
═══════════════════════════════════════
✅ Success: 33,820
❌ Failures: 740
⏱️  Duration: 18,432s (5.1 hours)
📊 Success Rate: 97.9%
═══════════════════════════════════════
```

---

## Full Documentation

See `QUESTION_SEEDING_GUIDE.md` for complete details.
