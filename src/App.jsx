
import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import {
  Code2,
  Copy,
  Users,
  MessageCircle,
  Play,
  ChevronDown,
  LogIn,
  Wifi,
  Sparkles,
  LoaderCircle,
  Terminal,
  X
} from 'lucide-react';
import './App.css';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

const starter = `// Welcome to CodeSync!
// Share this room ID with a teammate to code together.

function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("world"));
`;

const makeId = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

const runnableLanguages = ['javascript', 'python', 'java', 'cpp'];

const languages = [
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'html',
  'css',
  'json',
  'sql'
];

export default function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [name, setName] = useState('Developer');
  const [joined, setJoined] = useState(false);
  const [code, setCode] = useState(starter);
  const [language, setLanguage] = useState('javascript');
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [chat, setChat] = useState(false);
  const [notice, setNotice] = useState(
    'Create a room or join with an ID to start collaborating.'
  );

  const [stdin, setStdin] = useState('');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [outputOpen, setOutputOpen] = useState(true);

  const editorRef = useRef(null);
  const chatEnd = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const s = io(SERVER_URL, { autoConnect: false });

    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    s.on(
      'room-state',
      ({ code: nextCode, users: nextUsers, messages: nextMessages }) => {
        if (typeof nextCode === 'string') {
          setCode(nextCode);
        }

        setUsers(nextUsers || []);
        setMessages(nextMessages || []);
      }
    );

    s.on('code-update', ({ code: nextCode, from }) => {
      if (from !== s.id && typeof nextCode === 'string') {
        setCode(nextCode);
      }
    });

    s.on('users-update', setUsers);

    s.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    s.on('room-error', (msg) => setNotice(msg));

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chat]);

  const initials = name.trim().slice(0, 2).toUpperCase() || 'D';

  const joinRoom = (id) => {
    const clean = (id || roomInput || makeId()).trim().toUpperCase();

    if (!clean) return;

    const s = socketRef.current;

    if (!s) {
      setNotice('Socket is not ready. Please try again.');
      return;
    }

    if (!s.connected) {
      s.connect();
    }

    setRoom(clean);
    setRoomInput(clean);
    setJoined(true);
    setNotice('Connecting to workspace…');

    s.emit('join-room', {
      roomId: clean,
      name: name.trim() || 'Developer'
    });
  };

  const changeCode = (value) => {
    const next = value ?? '';
    setCode(next);

    if (joined) {
      socketRef.current?.emit('code-update', {
        roomId: room,
        code: next
      });
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();

    if (!draft.trim() || !joined) return;

    socketRef.current?.emit('chat-message', {
      roomId: room,
      name: name.trim() || 'Developer',
      text: draft.trim()
    });

    setDraft('');
  };

  const copyRoom = async () => {
    try {
      await navigator.clipboard.writeText(room);
      setNotice('Room ID copied. Share it with your teammate.');
    } catch {
      setNotice(`Room ID: ${room}`);
    }
  };

  const runCode = async () => {
    if (running) return;

    if (!runnableLanguages.includes(language)) {
      setNotice(
        `Running ${language} is not enabled. Choose JavaScript, Python, Java, or C++.`
      );
      return;
    }

    if (!code.trim()) {
      setNotice('Add some code before running.');
      return;
    }

    setRunning(true);
    setOutputOpen(true);
    setRunResult(null);
    setNotice('Sending code to the execution service…');

    try {
      const response = await fetch(`${SERVER_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, input: stdin })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || data.message || `Execution request failed (${response.status})`
        );
      }

      // Accept both the backend's "output" and Judge0-style "stdout".
      const stdout = data.stdout ?? data.output ?? data.result ?? '';
      const stderr = data.stderr ?? '';
      const compileOutput = data.compile_output ?? '';

      setRunResult({
        stdout: typeof stdout === 'string' ? stdout : JSON.stringify(stdout, null, 2),
        stderr: typeof stderr === 'string' ? stderr : JSON.stringify(stderr, null, 2),
        compile_output: typeof compileOutput === 'string'
          ? compileOutput
          : JSON.stringify(compileOutput, null, 2),
        status: data.status ?? null,
        time: data.time ?? null,
        memory: data.memory ?? null,
        error: data.error ?? ''
      });

      setNotice('Execution finished.');
    } catch (error) {
      setRunResult({
        stdout: '',
        stderr: '',
        compile_output: '',
        status: null,
        time: null,
        memory: null,
        error: error instanceof Error ? error.message : 'Could not run the code.'
      });
      setNotice(
        'Code execution failed. Check the browser Network response and confirm the backend is running.'
      );
    } finally {
      setRunning(false);
    }
  };

  const resultStatus =
    runResult?.status?.description ||
    (runResult?.error ? 'Error' : 'Completed');

  const fileExtension =
    language === 'javascript'
      ? 'js'
      : language === 'typescript'
        ? 'ts'
        : language === 'python'
          ? 'py'
          : language;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Code2 size={21} />
          </div>

          <span>
            Code<span className="brand-accent">Sync</span>
          </span>

          <span className="top-badge">BETA</span>
        </div>

        <div className="top-center">
          <span
            className={`status-dot ${connected ? 'online' : ''}`}
          />

          {connected ? 'Server connected' : 'Local workspace'}
        </div>

        <div className="top-actions">
          <button
            className="icon-button"
            title="Toggle chat"
            onClick={() => setChat((prev) => !prev)}
          >
            <MessageCircle size={17} />
          </button>

          <div className="avatar">{initials}</div>
          <span className="user-name">{name}</span>
        </div>
      </header>

      <main className="main">
        {!joined ? (
          <section className="welcome">
            <div className="welcome-icon">
              <Sparkles size={25} />
            </div>

            <div className="eyebrow">
              COLLABORATE IN REAL TIME
            </div>

            <h1>
              Code together.
              <br />
              <span>Build something great.</span>
            </h1>

            <p className="welcome-copy">
              A shared coding room for teams, interviews, pair
              programming, and learning.
            </p>

            <div className="join-card">
              <label>Your display name</label>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Siddhesh"
                maxLength={24}
              />

              <label>Room ID</label>

              <input
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="Enter room ID or create one"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    joinRoom(roomInput);
                  }
                }}
              />

              <div className="join-actions">
                <button
                  className="primary-button"
                  onClick={() => joinRoom(makeId())}
                >
                  <Sparkles size={16} />
                  Create new room
                </button>

                <button
                  className="secondary-button"
                  onClick={() => joinRoom(roomInput)}
                  disabled={!roomInput.trim()}
                >
                  <LogIn size={16} />
                  Join room
                </button>
              </div>
            </div>

            <div className="feature-row">
              <span>
                <Users size={15} />
                Multi-user rooms
              </span>

              <span>
                <Wifi size={15} />
                Live synchronization
              </span>

              <span>
                <Code2 size={15} />
                Syntax highlighting
              </span>
            </div>
          </section>
        ) : (
          <section className="workspace">
            <aside className="sidebar">
              <div className="side-heading">
                EXPLORER <span>•••</span>
              </div>

              <div className="project-label">
                <ChevronDown size={14} />
                CODESYNC ROOM
              </div>

              <div className="file active">
                <Code2 size={15} />
                main.{fileExtension}
              </div>

              <div className="side-bottom">
                <div className="side-heading">ROOM DETAILS</div>

                <div className="room-code">
                  {room}

                  <button
                    onClick={copyRoom}
                    title="Copy room ID"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                <p>Share this ID so others can join.</p>

                <div className="side-heading people-title">
                  PARTICIPANTS
                  <span className="count">{users.length}</span>
                </div>

                {users.map((u, i) => (
                  <div className="person" key={u.id || i}>
                    <div
                      className={`mini-avatar color-${i % 4}`}
                    >
                      {(u.name || 'D').slice(0, 1).toUpperCase()}
                    </div>

                    <span>
                      {u.name}
                      {u.id === socket?.id ? ' (you)' : ''}
                    </span>

                    <i />
                  </div>
                ))}
              </div>
            </aside>

            <div className="editor-area">
              <div className="editor-toolbar">
                <div className="tab">
                  <Code2 size={14} />
                  main.{fileExtension}
                </div>

                <div className="toolbar-right">
                  <select
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      setRunResult(null);
                    }}
                    aria-label="Programming language"
                  >
                    {languages.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>

                  <button
                    className="run-button"
                    onClick={runCode}
                    disabled={running}
                  >
                    {running ? (
                      <LoaderCircle
                        size={14}
                        className="run-spinner"
                      />
                    ) : (
                      <Play size={14} fill="currentColor" />
                    )}

                    {running ? 'Running…' : 'Run'}
                  </button>
                </div>
              </div>

              <div className="editor-wrap">
                <Editor
                  height="100%"
                  language={language}
                  value={code}
                  onChange={changeCode}
                  onMount={(editor) => {
                    editorRef.current = editor;
                  }}
                  theme="vs-dark"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    padding: { top: 18 },
                    wordWrap: 'on',
                    fontFamily: 'JetBrains Mono, Consolas, monospace',
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    smoothScrolling: true
                  }}
                />
              </div>

              <section
                className={`run-output ${
                  outputOpen ? 'expanded' : 'collapsed'
                }`}
              >
                <div className="run-output-header">
                  <button
                    className="output-title"
                    onClick={() =>
                      setOutputOpen((open) => !open)
                    }
                    aria-expanded={outputOpen}
                  >
                    <Terminal size={15} />
                    <span>OUTPUT</span>

                    {runResult && (
                      <span className="output-status">
                        {resultStatus}
                      </span>
                    )}

                    <ChevronDown
                      size={15}
                      className={
                        outputOpen ? '' : 'chevron-closed'
                      }
                    />
                  </button>

                  <div className="output-actions">
                    <span>
                      {runResult?.time
                        ? `${runResult.time}s`
                        : ''}
                    </span>

                    <button
                      className="icon-button"
                      title="Clear output"
                      onClick={() => setRunResult(null)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {outputOpen && (
                  <div className="run-output-content">
                    <label
                      className="stdin-label"
                      htmlFor="stdin-input"
                    >
                      Standard input (optional)
                    </label>

                    <textarea
                      id="stdin-input"
                      className="stdin-input"
                      value={stdin}
                      onChange={(e) => setStdin(e.target.value)}
                      placeholder="Enter input for your program, if needed…"
                      rows={2}
                    />

                    {!runResult && (
                      <div className="output-empty">
                        <Terminal size={17} />
                        <span>
                          Run your code to see the output here.
                        </span>
                      </div>
                    )}

                    {runResult && (
                      <div className="output-result">
                        {runResult.stdout && (
                          <pre className="output-stdout">
                            {runResult.stdout}
                          </pre>
                        )}

                        {runResult.compile_output && (
                          <>
                            <div className="output-label">
                              Compile output
                            </div>
                            <pre className="output-error">
                              {runResult.compile_output}
                            </pre>
                          </>
                        )}

                        {runResult.stderr && (
                          <>
                            <div className="output-label">
                              Errors
                            </div>
                            <pre className="output-error">
                              {runResult.stderr}
                            </pre>
                          </>
                        )}

                        {runResult.error && (
                          <pre className="output-error">
                            {runResult.error}
                          </pre>
                        )}

                        {!runResult.stdout &&
                          !runResult.compile_output &&
                          !runResult.stderr &&
                          !runResult.error && (
                            <div className="output-empty">
                              Program finished with no output.
                            </div>
                          )}

                        {runResult.memory != null && (
                          <div className="output-meta">
                            Memory: {runResult.memory} KB
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>

              <div className="bottom-bar">
                <span>
                  <span
                    className={`tiny-dot ${
                      connected ? 'online' : ''
                    }`}
                  />
                  {connected
                    ? 'Live sync active'
                    : 'Connecting…'}
                </span>

                <span>{language.toUpperCase()}</span>
                <span>UTF-8</span>

                <span>
                  Ln{' '}
                  {editorRef.current?.getPosition()?.lineNumber ||
                    1}
                  , Col{' '}
                  {editorRef.current?.getPosition()?.column || 1}
                </span>
              </div>
            </div>

            {chat && (
              <aside className="chat-panel">
                <div className="chat-header">
                  <div>
                    <MessageCircle size={16} />
                    <b>Room chat</b>
                  </div>

                  <button
                    className="icon-button"
                    onClick={() => setChat(false)}
                    title="Close chat"
                  >
                    ×
                  </button>
                </div>

                <div className="chat-messages">
                  {messages.map((m, i) => (
                    <div
                      className="message"
                      key={m.id || i}
                    >
                      <div className="message-avatar">
                        {(m.name || 'D')
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>

                      <div>
                        <div className="message-meta">
                          <b>{m.name}</b>
                          <time>{m.time || ''}</time>
                        </div>

                        <p>{m.text}</p>
                      </div>
                    </div>
                  ))}

                  {!messages.length && (
                    <div className="empty-chat">
                      No messages yet.
                      <br />
                      Say hello to your team!
                    </div>
                  )}

                  <div ref={chatEnd} />
                </div>

                <form
                  className="chat-form"
                  onSubmit={sendMessage}
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Message your team…"
                  />

                  <button
                    className="send-button"
                    disabled={!draft.trim()}
                    type="submit"
                  >
                    ↗
                  </button>
                </form>
              </aside>
            )}
          </section>
        )}

        <div className="notice">
          <span className="notice-dot" />
          {notice}
        </div>
      </main>
    </div>
  );
}