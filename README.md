# HireNudge - Autonomous Career Agent

HireNudge is an autonomous, AI-powered career assistant built with a sleek, high-contrast brutalist aesthetic. It simplifies the arduous job hunting process by automatically extracting your resume data and using Large Language Models (LLMs) to actively scrape, rank, and match you with highly compatible live job postings.

## What It Does

HireNudge operates in two main phases:

1. **AI Resume Builder:** 
   Upload your PDF resume, and HireNudge securely reads the file. Using your provided LLM API key (Gemini, Groq, or OpenRouter), it extracts your core data into structured sub-sections (Experience, Projects, Skills, and Education). You can then manually refine these extracted details using an integrated Rich Text Editor and native date pickers.
   
2. **Autonomous Job Matcher:** 
   Once your profile and job preferences (target roles, locations) are set, the Python backend utilizes `jobspy` to actively scrape live job boards (LinkedIn, Indeed, ZipRecruiter) in real-time. The AI then acts as a copilot, dynamically scoring each scraped job against your specific resume details to surface only the most relevant opportunities. You can easily save jobs, mark them as "Applied", and manage your applications directly from the Match Dashboard.

---

## Tech Stack
- **Frontend:** React (Vite), Framer Motion (Animations), Lucide React (Icons), pdfjs-dist (PDF Parsing)
- **Backend:** FastAPI (Python), python-jobspy (Live Job Scraping), Pandas
- **AI Integrations:** Google Gemini, Groq, OpenRouter

---

## Step-by-Step Instructions

Follow these steps to run HireNudge locally on your machine.

### 1. Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (for the frontend)
- [Python 3.8+](https://www.python.org/) (for the backend)
- An API Key from [Google Gemini](https://aistudio.google.com/app/apikey), [Groq](https://console.groq.com/keys), or [OpenRouter](https://openrouter.ai/keys).

### 2. Set Up the Backend
The backend is responsible for scraping the live job data.

1. Open your terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```
   *The backend will now be running on `http://localhost:8000`.*

### 3. Set Up the Frontend
The frontend houses the brutalist UI and the AI prompt orchestration.

1. Open a **new** terminal window and navigate to the root `hirenudge` directory.
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will now be accessible at `http://localhost:5173`.*

### 4. How to Use the Application

1. **Launch the App:** Open `http://localhost:5173` in your browser.
2. **Input API Key:** Click **Start Applying** and paste your LLM API Key (Gemini, Groq, or OpenRouter) into the setup screen. *Note: Your key is stored securely in your browser's local storage.*
3. **Set Preferences:** Enter your desired job titles (e.g., "Software Engineer") and target locations.
4. **Upload Resume:** Click the menu icon in the top right and open the **Resume Builder**. Upload your PDF resume, watch the AI parse it into structured sub-cards, and hit **Save & Proceed**.
5. **Get Matches:** Return to the Job Matcher and let the AI scrape and rank live jobs for you. Review your matches, save your favorites, and track your applications!
