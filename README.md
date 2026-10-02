# CodeSync — Real-Time Collaborative Code Room

A full-stack collaborative coding workspace built with React, Vite, Monaco Editor, Node.js, Express and Socket.IO.

## Features
- Create or join rooms using a room ID
- Live shared code editing across connected browsers
- Live room chat and participant count
- Language selection and syntax highlighting
- Copy room ID and share it with collaborators
- Responsive dark developer-focused interface

## Run locally
Requires Node.js 18+.

### 1. Install frontend dependencies
```bash
npm install
```

### 2. Install backend dependencies
```bash
cd server
npm install
cd ..
```

### 3. Start backend (terminal 1)
```bash
npm run server
```

### 4. Start frontend (terminal 2)
```bash
npm run dev
```
Open the Vite URL (usually http://localhost:5173) in two browser windows. Enter the same room ID in both to collaborate.

## Deployment
Deploy the frontend as a Vite static site and the backend as a persistent Node web service. Set `VITE_SERVER_URL` in the frontend build environment to the deployed backend URL, and set `CLIENT_ORIGIN` on the backend to the deployed frontend origin. For local use, defaults are configured.

## Note
This is a learning/portfolio project. Code execution, authentication, durable database storage, and advanced conflict-free concurrent editing are not included in this starter version. Do not execute untrusted code on the server.
