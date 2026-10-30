import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DB_DIRECTORY = join(ROOT, "data");
const DB_PATH = join(DB_DIRECTORY, "leaderboard.sqlite");
const MAX_BODY_BYTES = 2048;
const MAX_SCORE = 100000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 120;
const rateBuckets = new Map();
const STATIC_FILES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ["/questions.js", ["questions.js", "text/javascript; charset=utf-8"]],
  ["/game.js", ["game.js", "text/javascript; charset=utf-8"]]
]);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

await mkdir(DB_DIRECTORY, { recursive: true });
const database = new DatabaseSync(DB_PATH);
database.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS leaderboard (
    student_number TEXT PRIMARY KEY
      CHECK (student_number GLOB '[0-9][0-9][0-9][0-9]'),
    best_score INTEGER NOT NULL CHECK (best_score >= 0 AND best_score <= ${MAX_SCORE}),
    questions_completed INTEGER NOT NULL CHECK (questions_completed >= 0 AND questions_completed <= 9),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const listScores = database.prepare(`
  SELECT student_number AS studentNumber, best_score AS score
  FROM leaderboard
  ORDER BY best_score DESC, updated_at ASC, student_number ASC
  LIMIT 10
`);
const saveBestScore = database.prepare(`
  INSERT INTO leaderboard (student_number, best_score, questions_completed)
  VALUES (?, ?, ?)
  ON CONFLICT(student_number) DO UPDATE SET
    best_score = excluded.best_score,
    questions_completed = excluded.questions_completed,
    updated_at = CURRENT_TIMESTAMP
  WHERE excluded.best_score > leaderboard.best_score
`);

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  if (!request.headers["content-type"]?.startsWith("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json.");
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) throw new HttpError(413, "Request body is too large.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

function checkRateLimit(request) {
  const now = Date.now();
  const key = request.socket.remoteAddress || "unknown";
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    if (rateBuckets.size > 2000) {
      for (const [address, entry] of rateBuckets) {
        if (now - entry.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(address);
      }
    }
    return;
  }
  if (bucket.count >= RATE_LIMIT) throw new HttpError(429, "Too many score submissions. Try again later.");
  bucket.count += 1;
}

function validateScore(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpError(400, "A JSON object is required.");
  }
  if (typeof payload.studentNumber !== "string" || !/^\d{4}$/.test(payload.studentNumber)) {
    throw new HttpError(400, "Student number must contain exactly 4 digits.");
  }
  if (!Number.isSafeInteger(payload.score) || payload.score < 0 || payload.score > MAX_SCORE) {
    throw new HttpError(400, `Score must be a whole number between 0 and ${MAX_SCORE}.`);
  }
  if (!Number.isInteger(payload.questionsCompleted) ||
      payload.questionsCompleted < 0 || payload.questionsCompleted > 9) {
    throw new HttpError(400, "Completed question count must be between 0 and 9.");
  }
}

async function handleRequest(request, response) {
  const url = new URL(request.url, "http://localhost");
  if (request.method === "GET" && url.pathname === "/api/leaderboard") {
    const entries = listScores.all().map((entry, index) => ({ rank: index + 1, ...entry }));
    sendJson(response, 200, { entries });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/scores") {
    checkRateLimit(request);
    const payload = await readJsonBody(request);
    validateScore(payload);
    saveBestScore.run(payload.studentNumber, payload.score, payload.questionsCompleted);
    const entries = listScores.all().map((entry, index) => ({ rank: index + 1, ...entry }));
    sendJson(response, 200, { entries });
    return;
  }

  if (request.method === "GET" && STATIC_FILES.has(url.pathname)) {
    const [fileName, contentType] = STATIC_FILES.get(url.pathname);
    const contents = await readFile(join(ROOT, fileName));
    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    });
    response.end(contents);
    return;
  }

  sendJson(response, 404, { error: "Not found." });
}

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    if (response.headersSent) {
      response.destroy(error);
      return;
    }
    if (error instanceof HttpError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    console.error("Request failed:", error);
    sendJson(response, 500, { error: "The server could not complete the request." });
  });
});

server.listen(port, process.env.HOST || "0.0.0.0", () => {
  console.log(`Factor Miner listening on port ${port}.`);
});
