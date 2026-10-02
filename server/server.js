
import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';

// --------------------------------------------------
// 1. Express app and HTTP server
// --------------------------------------------------

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const allowedOrigin =
  process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '100kb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CodeSync server'
  });
});

// --------------------------------------------------
// 2. Code execution configuration
// --------------------------------------------------

const languageIds = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54
};

// Limit execution requests per IP
const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Too many run requests. Please wait a minute.'
  }
});

// --------------------------------------------------
// 3. Run Code API using Judge0
// --------------------------------------------------

app.post('/api/run', runLimiter, async (req, res) => {
  try {
    const { code, language, input = '' } = req.body || {};

    // Validate code, language and input
    if (
      typeof code !== 'string' ||
      !code.trim() ||
      code.length > 20000 ||
      typeof input !== 'string' ||
      input.length > 5000 ||
      typeof language !== 'string' ||
      !Object.hasOwn(languageIds, language)
    ) {
      return res.status(400).json({
        error: 'Invalid code, input, or language.'
      });
    }

    const judge0Url = process.env.JUDGE0_URL;

    if (!judge0Url) {
      return res.status(500).json({
        error: 'Code runner is not configured.'
      });
    }

    // Submit code to Judge0's isolated execution environment
    const response = await fetch(
      `${judge0Url.replace(/\/$/, '')}/submissions?base64_encoded=false&wait=true`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageIds[language],
          stdin: input,
          cpu_time_limit: 3,
          memory_limit: 128000
        }),
        signal: AbortSignal.timeout(20000)
      }
    );

    if (!response.ok) {
      console.error('Judge0 HTTP error:', response.status);

      return res.status(502).json({
        error: 'The code execution service is unavailable.'
      });
    }

    const result = await response.json();

    return res.json({
      output: result.stdout || '',
      error:
        result.stderr ||
        result.compile_output ||
        result.message ||
        '',
      status: result.status?.description || 'Unknown',
      time: result.time || null
    });
  } catch (error) {
    console.error('Code runner error:', error.message);

    return res.status(502).json({
      error: 'Execution failed or timed out. Please try again.'
    });
  }
});

// --------------------------------------------------
// 4. Socket.IO collaboration server
// --------------------------------------------------

const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST']
  }
});

// In-memory rooms
const rooms = new Map();

const roomFor = (id) => {
  if (!rooms.has(id)) {
    rooms.set(id, {
      code: '// Start collaborating!\n',
      users: [],
      messages: []
    });
  }

  return rooms.get(id);
};

// --------------------------------------------------
// 5. Real-time collaboration events
// --------------------------------------------------

io.on('connection', (socket) => {
  // Join a collaboration room
  socket.on('join-room', ({ roomId, name } = {}) => {
    if (
      typeof roomId !== 'string' ||
      !roomId.trim()
    ) {
      return socket.emit(
        'room-error',
        'A valid room ID is required.'
      );
    }

    const id = roomId.trim().toUpperCase();

    // Leave the previous room, if any
    if (socket.data.roomId) {
      const previousId = socket.data.roomId;
      const previousRoom = rooms.get(previousId);

      socket.leave(previousId);

      if (previousRoom) {
        previousRoom.users = previousRoom.users.filter(
          (user) => user.id !== socket.id
        );

        io.to(previousId).emit(
          'users-update',
          previousRoom.users
        );

        if (
          previousRoom.users.length === 0 &&
          previousRoom.messages.length === 0
        ) {
          rooms.delete(previousId);
        }
      }
    }

    socket.data.roomId = id;
    socket.data.name = String(name || 'Developer').slice(0, 24);

    const room = roomFor(id);

    socket.join(id);

    room.users = room.users.filter(
      (user) => user.id !== socket.id
    );

    room.users.push({
      id: socket.id,
      name: socket.data.name
    });

    // Send existing room state to the joining user
    socket.emit('room-state', {
      code: room.code,
      users: room.users,
      messages: room.messages
    });

    // Update participant list for everyone in the room
    io.to(id).emit('users-update', room.users);
  });

  // Shared code editor updates
  socket.on('code-update', ({ roomId, code } = {}) => {
    if (
      roomId !== socket.data.roomId ||
      typeof code !== 'string' ||
      code.length > 200000
    ) {
      return;
    }

    const room = roomFor(roomId);
    room.code = code;

    // Broadcast to other users in the room
    socket.to(roomId).emit('code-update', {
      code,
      from: socket.id
    });
  });

  // Room chat messages
  socket.on('chat-message', ({ roomId, name, text } = {}) => {
    if (
      roomId !== socket.data.roomId ||
      typeof text !== 'string' ||
      !text.trim()
    ) {
      return;
    }

    const room = roomFor(roomId);

    const msg = {
      id: `${Date.now()}-${socket.id}`,
      name: String(name || socket.data.name).slice(0, 24),
      text: text.trim().slice(0, 1000),
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    room.messages.push(msg);
    room.messages = room.messages.slice(-100);

    io.to(roomId).emit('chat-message', msg);
  });

  // Handle disconnected users
  socket.on('disconnect', () => {
    const id = socket.data.roomId;

    if (!id || !rooms.has(id)) {
      return;
    }

    const room = rooms.get(id);

    room.users = room.users.filter(
      (user) => user.id !== socket.id
    );

    io.to(id).emit('users-update', room.users);

    if (
      room.users.length === 0 &&
      room.messages.length === 0
    ) {
      rooms.delete(id);
    }
  });
});

// --------------------------------------------------
// 6. Start the server
// --------------------------------------------------

server.listen(PORT, () => {
  console.log(`CodeSync server listening on port ${PORT}`);
});