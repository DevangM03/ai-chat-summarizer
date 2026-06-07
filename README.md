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
