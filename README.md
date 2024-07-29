# Nicolaou Commission

## Table of Contents
1. [Introduction](#introduction)
2. [Technologies](#technologies)
3. [Project Structure](#project-structure)
4. [Task Distribution](#task-distribution)
5. [Checklist](#checklist)

## Introduction
This document outlines the plan for two separate projects: **Marking/Auto Feedback + ESQs (Excel but advanced)** and **Video Platform (Similar to DFM)**. Each project will be broken down into various sections, detailing the functionalities, required technologies, and task distribution among team members.

## Technologies
- **Frontend:** React.js
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Authentication:** JWT (JSON Web Tokens)
- **Deployment:** AWS/GCP/Azure
- **AI/Worksheet Generation:** Python, TensorFlow/PyTorch for AI models

## Project Structure
### Marking/Auto Feedback + ESQs
- **Admin Section:**
  - Upload or select pre-made assessments.
- **Main Section:**
  - Display assessments with corresponding marks and learning objectives.
  - Incorrect marks generate learning objectives and worksheets.
  - All correct marks generate extension questions or shadow papers.
  - Confidence levels color-coded with a revision checklist.
  - Assessments can be done online or printed (preferably printed and timed).
  - KS3 Shadow Papers via TestSpace, KS4 Shadow Papers via ExamWizard.

### Video Platform
- **Student Section:**
  - Access videos and worksheets categorized by GCSE topics.
  - Interactive elements linking worksheets and videos.
- **Teacher Section:**
  - Upload videos and worksheets.
  - Create exams and topic assessments with a bank of categorized questions.
  - Automatic generation of revision lists and feedback sheets.
- **Nicolaou Section:**
  - Upload and manage content, including videos and worksheets.

## Task Distribution
### Team Member 1: Frontend Developer
- **Marking/Auto Feedback + ESQs:**
  - Develop the Admin and Main sections.
  - Implement UI for uploading/selecting assessments and displaying assessment results.
- **Video Platform:**
  - Create Student and Teacher sections.
  - Design the UI for video and worksheet integration.

### Team Member 2: Backend Developer
- **Marking/Auto Feedback + ESQs:**
  - Set up the Node.js server with Express.
  - Create APIs for assessment uploads, selection, and feedback generation.
  - Fetch all data from:
	  - DB 
	  - Question Bank
  - Make an API to handle all of this data, use node-fetch, or express etc
  - Route the API to the respective frontend link
- **Video Platform:**
  - Develop APIs for video and worksheet management.
  - Implement features for exam and assessment creation, including the question bank.

### Team Member 3: AI/Database Specialist
- **Marking/Auto Feedback + ESQs:**
  - Design the database schema for assessments and learning objectives.
  - Integrate AI for worksheet generation based on incorrect marks.
    - Use [SymPy Gamma](https://sympygamma.com) to solve generated questions: 
      [https://github.com/sympy/sympy_gamma](https://sympygamma.com)
    - You will generate suitable Qs yourself for each topic, to ensure decent answers
- **Video Platform:**
  - Manage the database for videos, worksheets, and question banks.
  - Implement AI features for worksheet creation and revision list generation.

## Checklist
### Marking/Auto Feedback + ESQs
1. **Admin Section:**
   - [ ] Create UI for uploading/selecting assessments.
   - [ ] Implement APIs for assessment management.
2. **Main Section:**
   - [ ] Display assessments and corresponding marks.
   - [ ] Generate learning objectives and worksheets based on incorrect marks.
   - [ ] Develop extension question generation.
   - [ ] Color-code confidence levels and update revision checklists.
   - [ ] Ensure assessments can be printed and timed.

### Video Platform
1. **Student Section:**
   - [ ] Develop UI for accessing videos and worksheets.
   - [ ] Implement interactive elements linking videos and worksheets.
2. **Teacher Section:**
   - [ ] Create UI for uploading videos and worksheets.
   - [ ] Develop features for exam and assessment creation.
   - [ ] Implement the question bank and automatic feedback generation.
3. **Nicolaou Section:**
   - [ ] Set up content management for video and worksheet uploads.
   - [ ] Integrate AI for worksheet creation and revision list generation.

## Conclusion
This README provides a comprehensive guide to the development of the Marking/Auto Feedback + ESQs and Video Platform projects. Each team member has clear tasks, and the checklist ensures that all components are developed systematically. Let's collaborate effectively to build these innovative educational tools.
### Meeting summary (Overall Objectives)

  - [ ] Pre-written questions based on each topic
  - [ ] Divye will sort through each question and make    random numbers with suitable answers.
  - [ ]ESQs with year or option to “generate Qs”
  - [ ]Page for Questions , Answers, Users, Admin, Videos
  - [ ] All available topics for people 

