# Implementation Roadmap

## 🎯 Current Status: Phase 2 Complete

```
Phase 1: Foundation ✅
├── Swiss Focus Design System ✅
├── Authentication (Google OAuth) ✅
├── RBAC (Role-Based Access Control) ✅
├── Student Dashboard ✅
├── Teacher Dashboard ✅
└── Marketing Pages ✅

Phase 2: Assessment Infrastructure ✅
├── Database Schema ✅
├── TypeScript Types ✅
├── Helper Functions ✅
├── Feedback Sheet Component ✅
├── Build Errors Fixed ✅
└── Documentation Complete ✅

Phase 3: Assessment Integration 🔄 NEXT
├── [ ] Update Exam Builder
├── [ ] Create Grading Interface
├── [ ] Student Assessment View
├── [ ] PDF Export
└── [ ] Admin Panel

Phase 4: Advanced Features 📅 FUTURE
└── See below
```

---

## 📋 Phase 3: Assessment Integration (Next Session)

### Priority 1: Update Exam Builder (2-3 hours)

**Current State:** Uses mock data, no database persistence

**Target State:** Saves to database, assigns to students

#### Tasks:
```typescript
// 1. Add "Save Assessment" button
// File: app/dashboard/exam-builder/page.tsx

import { createAssessment, addQuestionsToAssessment } from '@/lib/assessments/helpers'

const handleSaveAssessment = async () => {
  // Create assessment
  const assessment = await createAssessment({
    title: assessmentTitle,
    tier: selectedTier,
    topic: selectedTopic,
    duration_minutes: 45
  })
  
  // Add questions
  await addQuestionsToAssessment(assessment.id, selectedQuestions.map((q, idx) => ({
    question_number: idx + 1,
    question_text: q.text,
    question_type: 'short_answer',
    max_marks: q.marks,
    learning_objective: q.objective
  })))
  
  toast.success('Assessment saved!')
}
```

#### Features to Add:
- [x] Database schema ✅ (already done)
- [ ] "Save Draft" button
- [ ] "Publish" button (changes status to 'published')
- [ ] "Assign to Students" modal
  - Student selector (multi-select)
  - Due date picker
  - Confirmation
- [ ] Success/error toasts
- [ ] Loading states

#### UI Changes:
```
┌─────────────────────────────────────┐
│ Exam Builder                   [x]  │
├─────────────────────────────────────┤
│                                     │
│ [Questions]  [Preview]  [Settings]  │
│                                     │
│ ... existing interface ...          │
│                                     │
├─────────────────────────────────────┤
│ [Cancel] [Save Draft] [Publish →]  │ ← NEW
└─────────────────────────────────────┘

After clicking "Publish →":
┌─────────────────────────────────────┐
│ Assign Assessment                   │
├─────────────────────────────────────┤
│ Select Students:                    │
│ [ ] Select All                      │
│ [✓] Alex Johnson                    │
│ [✓] Sarah Williams                  │
│ [ ] Michael Chen                    │
│                                     │
│ Due Date: [2026-01-20] [23:59]     │
│                                     │
│ [Cancel] [Assign to X Students]     │
└─────────────────────────────────────┘
```

---

### Priority 2: Create Grading Interface (3-4 hours)

**New Page:** `app/dashboard/grading/page.tsx`

#### Features:
1. **Assignment Queue**
   - List of submitted assessments
   - Filter by: Pending, In Progress, Completed
   - Sort by: Due Date, Student Name, Submission Time

2. **Grading View** (per student)
   - Student info (name, submission time)
   - Assessment title and total marks
   - Question-by-question grading:
     ```
     Q1. Solve x² + 5x + 6 = 0   [Marks: _3_ / 3]
     Student Answer: x = -2, x = -3
     Feedback: [Perfect! Correctly factored...]
     
     Q2. Use quadratic formula...  [Marks: _4_ / 5]
     Student Answer: x = 3, x = 0.5
     Feedback: [Correct answers but...]
     ```
   - Overall feedback textarea
   - Grade selector (A, B, C, etc.)
   - [Save Progress] [Submit Grades]

3. **Auto-Grading** (for multiple choice)
   - Automatically mark correct/incorrect
   - Teacher can override
   - Show percentage instantly

#### UI Mockup:
```
┌────────────────────────────────────────────────┐
│ Grading Queue                                  │
├────────────────────────────────────────────────┤
│ Filter: [All] [Pending] [In Progress] ✓        │
│ Sort: [Due Date ▼]                             │
├────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐  │
│ │ Alex Johnson - Module 5 Assessment       │  │
│ │ Submitted: 2 days ago | Due: 1 day ago   │  │
│ │ [Grade Now →]                            │  │
│ └──────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────┐  │
│ │ Sarah Williams - Module 5 Assessment     │  │
│ │ Submitted: 1 day ago | Due: Today        │  │
│ │ [Grade Now →]                            │  │
│ └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

---

### Priority 3: Student Assessment View (2 hours)

**Location:** `app/student-dashboard/student-dashboard-client.tsx`

#### Update "Assignments" Tab:
1. **Fetch Real Data**
   ```typescript
   const assignments = await getStudentAssessments()
   ```

2. **Show Assessment Cards**
   ```
   ┌─────────────────────────────────────┐
   │ 📝 Module 5: Quadratic Equations    │
   │ Due: January 20, 2026               │
   │ Status: Not Started                 │
   │ Marks: 30 total                     │
   │ [Start Assessment →]                │
   └─────────────────────────────────────┘
   
   ┌─────────────────────────────────────┐
   │ 📝 Geometry: Pythagoras Theorem     │
   │ Submitted: January 15, 2026         │
   │ Status: Graded ✓                    │
   │ Score: 28/30 (93%)                  │
   │ [View Feedback →]                   │
   └─────────────────────────────────────┘
   ```

3. **Feedback View**
   - Show FeedbackSheet component
   - [Print] button
   - [Download PDF] button (Phase 3, Priority 4)

---

### Priority 4: PDF Export (1-2 hours)

**Library:** `react-to-pdf` or `jsPDF` + `html2canvas`

#### Installation:
```bash
npm install jspdf html2canvas
```

#### Implementation:
```typescript
// components/feedback-sheet.tsx

import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

const handleDownloadPDF = async () => {
  const element = feedbackSheetRef.current
  const canvas = await html2canvas(element)
  const imgData = canvas.toDataURL('image/png')
  
  const pdf = new jsPDF('p', 'mm', 'a4')
  const imgWidth = 210 // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
  pdf.save(`feedback-${studentName}-${assessmentTitle}.pdf`)
}

// Add button:
<Button onClick={handleDownloadPDF}>
  <Download className="w-4 h-4 mr-2" />
  Download PDF
</Button>
```

#### Features:
- [x] Print stylesheet ✅ (already done with `print:` classes)
- [ ] PDF download
- [ ] Email delivery (optional)
- [ ] Bulk export (all students in class)

---

### Priority 5: Admin Panel (2-3 hours)

**New Page:** `app/admin/page.tsx`

#### Features:
1. **User Management**
   - List all users
   - Change roles (Student ↔ Teacher ↔ Admin)
   - Deactivate/activate accounts

2. **Bulk Operations**
   - Import students from CSV
   - Bulk role changes
   - Export user list

3. **System Stats**
   - Total users (by role)
   - Active assessments
   - Total submissions
   - System health

#### UI Mockup:
```
┌────────────────────────────────────────────────┐
│ Admin Panel                                    │
├────────────────────────────────────────────────┤
│ Users: 247 | Teachers: 12 | Admins: 2         │
├────────────────────────────────────────────────┤
│ Search: [________________] [Filter: All ▼]    │
├────────────────────────────────────────────────┤
│ Name           Email           Role      Actions│
│ Alex Johnson   alex@...       Student   [Edit] │
│ Sarah Khan     sarah@...      Teacher   [Edit] │
│ John Smith     john@...       Student   [Edit] │
└────────────────────────────────────────────────┘

Edit User Modal:
┌──────────────────────────────┐
│ Edit User: Alex Johnson      │
├──────────────────────────────┤
│ Email: alex@example.com      │
│ Role: [Student ▼]            │
│       - Student              │
│       - Teacher              │
│       - Admin                │
│                              │
│ [Cancel] [Save Changes]      │
└──────────────────────────────┘
```

---

## 📅 Phase 4: Advanced Features (Future)

### Analytics Dashboard
- [ ] Performance by learning objective
- [ ] Class comparison charts
- [ ] Individual student progress tracking
- [ ] Topic mastery heatmaps
- [ ] Prediction models (at-risk students)

### Question Bank System
- [ ] Reusable question library
- [ ] Tag questions by topic, difficulty, objective
- [ ] Search and filter questions
- [ ] Import from exam boards
- [ ] Share questions between teachers

### Automated Features
- [ ] Auto-grading for multiple choice
- [ ] AI-assisted feedback generation
- [ ] Plagiarism detection
- [ ] Automatic extension requests
- [ ] Smart scheduling (optimal assignment dates)

### Communication
- [ ] Email notifications (assignment assigned, graded)
- [ ] Parent portal (view child's progress)
- [ ] In-app messaging
- [ ] Announcement system
- [ ] Feedback request system

### Advanced Grading
- [ ] Rubric templates
- [ ] Peer review functionality
- [ ] Moderation system (second marker)
- [ ] Grade boundaries automation
- [ ] Historical grade tracking

### Mobile App
- [ ] React Native app
- [ ] Offline mode
- [ ] Push notifications
- [ ] Camera for work submission
- [ ] Voice feedback

---

## 🎬 Suggested Next Session Plan

### Session Goal: Connect Exam Builder to Database

**Estimated Time:** 3-4 hours

### Step-by-Step:

#### 1. Update Exam Builder (90 minutes)
```typescript
// app/dashboard/exam-builder/page.tsx

// Add state
const [isSaving, setIsSaving] = useState(false)
const [assessmentId, setAssessmentId] = useState<string | null>(null)

// Add save function
const handleSave = async () => {
  setIsSaving(true)
  try {
    const assessment = await createAssessment({...})
    await addQuestionsToAssessment(assessment.id, questions)
    setAssessmentId(assessment.id)
    toast.success('Assessment saved!')
  } catch (error) {
    toast.error('Failed to save')
  } finally {
    setIsSaving(false)
  }
}

// Add UI
<Button onClick={handleSave} disabled={isSaving}>
  {isSaving ? 'Saving...' : 'Save Draft'}
</Button>
```

#### 2. Add Assignment Modal (60 minutes)
- Create modal component
- Student selector (fetch from profiles table)
- Due date picker
- Call `assignAssessmentToStudents()`

#### 3. Test End-to-End (30 minutes)
1. Create assessment
2. Add questions
3. Save to database
4. Verify in Supabase
5. Assign to test student
6. Verify assignment created

#### 4. Update Student Dashboard (60 minutes)
- Fetch real assignments
- Display assignment cards
- Add "Start" button
- Show status badges

#### 5. Create Simple Grading View (60 minutes)
- List pending assessments
- Click to grade
- Manual mark entry
- Save to database
- Generate feedback sheet

---

## ⚡ Quick Wins (Can Do Today)

1. **Run the Migration** (5 minutes)
   - Copy `003_assessments_schema.sql` to Supabase
   - Verify tables created

2. **Test Helper Functions** (10 minutes)
   ```typescript
   const test = await createAssessment({
     title: "Test",
     tier: "foundation",
     topic: "Algebra"
   })
   console.log('Created:', test)
   ```

3. **Add "Save" Button to Exam Builder** (15 minutes)
   - Just the button
   - Wire up to `createAssessment()`
   - Test save functionality

4. **Display Real Assignments** (20 minutes)
   - Update student dashboard
   - Call `getStudentAssessments()`
   - Map to existing UI

---

## 🚀 Launch Checklist

### Before Student Beta:
- [ ] Assessment creation works
- [ ] Assignment system works
- [ ] Grading interface complete
- [ ] Feedback sheets generate
- [ ] PDF export works
- [ ] Email notifications sent
- [ ] Mobile responsive
- [ ] Performance tested (100+ students)

### Before Teacher Beta:
- [ ] All student features +
- [ ] Analytics dashboard
- [ ] Question bank
- [ ] Bulk grading tools
- [ ] Export functionality
- [ ] Admin panel

### Before Public Launch:
- [ ] All beta features +
- [ ] Payment integration
- [ ] Terms of service
- [ ] Privacy policy
- [ ] User documentation
- [ ] Video tutorials
- [ ] Support system
- [ ] Backup system
- [ ] Monitoring/alerts

---

## 📊 Feature Comparison

| Feature | Phase 2 (Now) | Phase 3 (Next) | Phase 4 (Future) |
|---------|---------------|----------------|------------------|
| Create assessments | ✅ Database | ✅ UI | ✅ Templates |
| Assign work | ✅ Database | ✅ UI | ✅ Auto-assign |
| Grade work | ✅ Database | ✅ UI | ✅ Auto-grade |
| Feedback sheets | ✅ Component | ✅ PDF | ✅ Email |
| Analytics | ❌ | ❌ | ✅ Full |
| Question bank | ❌ | ❌ | ✅ Full |
| Mobile app | ❌ | ❌ | ✅ Native |

---

## 💡 Tips for Next Session

1. **Start with Migration**
   - Run `003_assessments_schema.sql` first
   - Verify all tables exist
   - Test with sample data

2. **One Feature at a Time**
   - Don't try to do everything
   - Complete save → assign → grade → feedback
   - Test each step thoroughly

3. **Use Existing Components**
   - FeedbackSheet already built ✅
   - Question cards already styled ✅
   - Swiss Focus design system ready ✅

4. **Leverage Helper Functions**
   - All database logic done ✅
   - Just call the functions
   - Type-safe, tested, documented

5. **Test as You Go**
   - Use Supabase dashboard to verify data
   - Console.log liberally
   - Test with real user accounts

---

**Last Updated:** January 13, 2026  
**Current Phase:** Phase 2 Complete ✅  
**Next Priority:** Phase 3 - Assessment Integration  
**Estimated Time to MVP:** 8-12 hours of development
