# Real-Time Chat App with AI Summarization

> A secure, scalable multi-room chat platform featuring instant messaging and automated, AI-driven conversation insights. 

---

## Overview

This project is a real-time messaging application built to handle concurrent chat rooms with persistent history and room-based access control. It integrates a pipeline for structured conversation insights using the Google Gemini API to automatically generate comprehensive summaries, extract key topics, and perform sentiment analysis on chat histories.

---

## Key Features

* **Multi-Room Architecture:** Create and join distinct chat rooms protected by passcode authentication for enhanced privacy.
* **AI-Powered Summarization:** Utilizes the Gemini API to analyze chat history and output structured summaries, participant lists, and sentiment data.
* **Real-Time Synchronization:** Leverages Firebase Firestore real-time listeners for instant message delivery across all active sessions.
* **Secure Authentication:** Implements Firebase Auth with secret key validation for robust user registration and profile management.
* **Optimized UI/UX:** Features a responsive interface built with Chakra UI, including auto-scrolling to the latest messages and accurate message timestamps.
* **Scalable Backend:** Designed with optimized Firestore queries to efficiently manage real-time data across concurrent users.

---

## Tech Stack

* **Frontend:** React.js
* **UI Framework:** Chakra UI
* **Backend/Database:** Firebase (Authentication, Firestore)
* **Artificial Intelligence:** Google Gemini API

---

## Getting Started

### Prerequisites
Ensure you have Node.js installed on your machine. You will also need a Firebase account and a Google Gemini API key.

### Installation

**1. Clone the repository:**
```bash
git clone [https://github.com/DevangM03/ai-chat-summarizer.git](https://github.com/DevangM03/ai-chat-summarizer.git)

**2. Navigate to the project directory:**
`cd ai-chat-summarizer`

**3. Install dependencies:**
`npm install`

**4. Set up environment variables:**
Create a `.env` file in the root directory and add your specific configuration details:
`REACT_APP_FIREBASE_API_KEY=your_firebase_api_key`
`REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain`
`REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id`
`REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket`
`REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id`
`REACT_APP_FIREBASE_APP_ID=your_firebase_app_id`
`REACT_APP_GEMINI_API_KEY=your_gemini_api_key`

**5. Start the development server:**
`npm start`

---

## Future Enhancements
* Implementation of direct 1-to-1 messaging
* Rich media sharing (images and files) within chat rooms
* Export functionality for AI-generated summaries
