
# ✨ nicolaou-site

nicolaou-site is a sophisticated, AI-powered educational platform designed to revolutionize how students learn and teachers manage progress. It merges powerful educational functionality with a visually stunning, futuristic interface inspired by Apple Vision Pro and the data clarity of Baremetrics.



## 📖 Table of Contents

  - [About The Project](https://www.google.com/search?q=%23-about-the-project)
  - [Key Features](https://www.google.com/search?q=%23-key-features)
  - [🎨 Design Philosophy](https://www.google.com/search?q=%23-design-philosophy)
  - [🛠️ Built With](https://www.google.com/search?q=%23-built-with)
  - [🚀 Getting Started](https://www.google.com/search?q=%23-getting-started)
      - [Prerequisites](https://www.google.com/search?q=%23prerequisites)
      - [Installation](https://www.google.com/search?q=%23installation)
  - [🧭 Roadmap](https://www.google.com/search?q=%23-roadmap)
  - [🤝 Contributing](https://www.google.com/search?q=%23-contributing)
  - [📄 License](https://www.google.com/search?q=%23-license)
  - [📧 Contact](https://www.google.com/search?q=%23-contact)

-----

## 🌟 About The Project

This repository contains the codebase for nicolaou-site, an educational platform focused on providing a rich, interactive, and personalized learning experience. The core of the application allows students to engage with a vast library of video lessons, take assessments, and interact with worksheets.

The project's ambition is to create an ecosystem that not only serves students but also empowers teachers with advanced class management tools, AI-driven content generation, and insightful analytics, all wrapped in a cutting-edge, high-polish user interface.

-----

## ✨ Key Features

### 📊 Current Features

  - **Assessment Engine:** Students can answer questions one-by-one with real-time marking.
  - **Content Library:** A filterable library of video lessons organised by topic.
  - **LaTeX Rendering:** Flawless rendering of mathematical and algebraic expressions using KaTeX/MathJax.
  - **Topic & Difficulty Filtering:** Users can find content based on topic (e.g., Algebra) and difficulty (e.g., GCSE tiers).
  - **Secure Authentication:** A context-based authentication system with protected routes.

### 🔮 Planned Features

  - **AI-Powered Tools:**
      - **Generative AI Worksheet Builder:** Generate exam-style worksheets based on user prompts.
      - **Personalized Recommendations:** Suggest content to students based on performance gaps.
  - **👩‍🏫 Teacher Portal:**
      - **Interactive Scheme of Work:** Editable curriculum planner with linked platform content.
      - **Class Management:** Assign work to classes or individual students.
      - **Progress Analytics:** Track and visualize class and student performance.
      - **Feedback System:** A streamlined interface for teachers to leave feedback.
  - **👨‍🎓 Enhanced Student Dashboard:**
      - **Granular Progress Tracking:** Visualize scores by topic over time.
      - **AI-Generated Revision Paths:** Get intelligent suggestions on the "next best topic" to study.

-----

## 🎨 Design Philosophy

The user interface is a core component of the project's identity. The goal is a futuristic, ultra-polished, high-tech aesthetic.

> **Inspiration:** The UI polish of **Apple Vision Pro** meets the data-rich clarity of **Baremetrics**.

  - **Theme:** Dark mode-first (`#0E1117`) with luminous neon accents (Electric Blue, Violet, Mint Green).
  - **Effects:** Heavy use of **Glassmorphism** for panels and modals (semi-transparent, blurred backgrounds with glowing borders).
  - **Layout:** Generous negative space, soft shadows, and fully rounded corners.
  - **Motion:** Fluid and meaningful animations are integral. Charts animate on load, UI elements have smooth hover effects, and section transitions are spring-like and seamless.
  - **Typography:** Modern sans-serif font (**Geist**, **Satoshi**, or **Space Grotesk**).

-----

## 🛠️ Built With

This project leverages a modern, powerful tech stack:

  - **Frontend:** [React](https://reactjs.org/)
  - **Styling:** [Tailwind CSS](https://tailwindcss.com/)
  - **Animation:** [Framer Motion](https://www.framer.com/motion/)
  - **Backend & DB:** [Supabase](https://supabase.io/)
  - **AI Integration:** [OpenAI API](https://openai.com/api/)
  - **LaTeX Rendering:** [KaTeX](https://katex.org/)
  - **Deployment:** [Vercel](https://vercel.com/)

-----

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Make sure you have Node.js and npm (or yarn/pnpm) installed.

  - npm
    ```sh
    npm install npm@latest -g
    ```

### Installation

1.  **Clone the repository**

    ```sh
    git clone https://github.com/aspekts/nicolaou-site.git
    ```

2.  **Navigate to the project directory**

    ```sh
    cd nicolaou-site
    ```

3.  **Install NPM packages**

    ```sh
    npm install
    ```

4.  **Set up your environment variables**
    Create a `.env.local` file in the root of the project and add the following variables. Get these from your Supabase and OpenAI dashboards.

    ```sh
    # .env.local

    # Supabase
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

    # OpenAI
    OPENAI_API_KEY=your_openai_api_key
    ```

5.  **Run the development server**

    ```sh
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

-----

## 🧭 Roadmap

See the [open issues](https://github.com/aspekts/nicolaou-site/issues) for a full list of proposed features and known issues.

  - [ ] **Phase 1: UI Overhaul**
      - [ ] Implement the new Glassmorphism design system across all existing pages.
      - [ ] Add scroll-triggered animations and enhance UI polish.
      - [ ] Optimize responsive design for all major breakpoints.
  - [ ] **Phase 2: Teacher Portal**
      - [ ] Build the core dashboard UI.
      - [ ] Implement class and student management logic.
      - [ ] Integrate data visualizations for progress tracking.
  - [ ] **Phase 3: AI Integration**
      - [ ] Develop the AI Worksheet Generator module.
      - [ ] Build and test the content recommendation engine.
  - [ ] **Phase 4: Student Dashboard V2**
      - [ ] Redesign dashboard with advanced progress visualizations.
      - [ ] Implement the "Next Best Topic" feature.
  - [ ] **Phase 5: Admin Panel**
      - [ ] Create CRUD interfaces for all major data models (topics, videos, etc.).

-----

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

-----

## 📄 License

Distributed under the MIT License. See `LICENSE.txt` for more information.

-----