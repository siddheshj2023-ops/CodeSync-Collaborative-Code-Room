# 🚀 CodeSync — Real-Time Collaborative Code Room

A real-time collaborative coding platform where developers can join shared rooms, write code together, chat, and execute programs online.

🔴 **Live Demo:** [https://codesync-vercel-deployment.vercel.app/](https://codesync-vercel-deployment.vercel.app/)

## ✨ Features

- 👥 **Collaborative Rooms** — Create a room or join with a room ID.
- ⚡ **Real-Time Code Synchronization** — Collaborate with other users in the same room.
- 💬 **Live Chat** — Communicate with teammates inside the coding workspace.
- 🧑‍💻 **Code Editor** — Write and edit code with syntax highlighting.
- ▶️ **Online Code Execution** — Run supported programs and view their output.
- 🌐 **Deployed Application** — Frontend hosted on Vercel and backend hosted on Render.

## 🛠️ Tech Stack

**Frontend**

- React
- Vite
- Monaco Editor
- Socket.IO Client
- CSS

**Backend**

- Node.js
- Express.js
- Socket.IO
- Judge0 API for code execution

## 💻 Supported Languages

- JavaScript
- Python
- Java
- C++

The editor also includes syntax highlighting for additional languages.

## 🚀 Getting Started

### Prerequisites

- Node.js and npm installed
- Git installed

### 1. Clone the repository

```bash
git clone https://github.com/siddheshj2023-ops/CodeSync-Collaborative-Code-Room.git
cd CodeSync-Collaborative-Code-Room
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Configure and start the backend

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
JUDGE0_URL=https://ce.judge0.com
```

Start the backend:

```bash
node server.js
```

### 4. Start the frontend

Open a second terminal in the project root directory and run:

```bash
npm run dev
```

Open the local URL shown by Vite in your terminal.

## 🌐 Live Deployment

- **Frontend:** [Vercel Live Demo](https://codesync-vercel-deployment.vercel.app/)
- **Backend:** [Render Backend](https://codesync-collaborative-code-room-4.onrender.com/)

The backend health endpoint is available at `/health`.

## 🎯 Project Goals

CodeSync demonstrates practical full-stack development concepts, including real-time communication, shared application state, API integration, collaborative editing, and deployment.

## 👨‍💻 Author

**Siddhesh**

GitHub: [siddheshj2023-ops](https://github.com/siddheshj2023-ops)

---

⭐ If you find this project interesting, consider giving the repository a star!
