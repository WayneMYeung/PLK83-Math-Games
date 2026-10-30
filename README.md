# PLK83 Factor Miner

Factor Miner is a responsive Canvas game for practicing factorization. Students enter a 4-digit student number, play a 90-second run, and compete for a place on the shared Top 10.

## Run locally

Install Node.js 22.13 or newer, then run:

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000). Do not open `index.html` directly: the game needs the API for its shared leaderboard. The server serves the game and API from the same origin and creates `data/leaderboard.sqlite` on first launch. Back up that file to preserve scores.

Set `PORT` to change the listening port. The server binds to `0.0.0.0` by default so it can be reached from other devices on the network; use `HOST=127.0.0.1` to restrict it to the local computer. In PowerShell, set that option with `$env:HOST = "127.0.0.1"; npm start`.

## Scoring and progression

- Each run lasts 90 seconds and has three lives.
- A run has nine questions: three questions in each of three difficulty tiers (S2–S3, S4, then S5–S6).
- Collect every required factor to clear a question. Correct factors award points; collecting an incorrect factor costs points and a life.
- Correct and incorrect factors use the same appearance. Items keep distinct horizontal lanes, start at randomized heights, and move vertically, so no answer is placed behind another on the same path.
- Vertical movement grows with run progress: early questions move gently, and later questions move faster and over a greater distance.
- Clean rounds build a streak multiplier for the round-clear bonus. A rock resets the streak.
- A student's leaderboard entry is their best score; lower scores never replace it. The Top 10 ranks those best scores.
- Questions are selected randomly without repeats within a run from the tier's question bank in `questions.js`.

Add questions to `QUESTION_BANK` with a unique `id`, `stage` (1–3), `prompt`, complete `factors`, and plausible `distractors`.

## API

- `GET /api/leaderboard` returns `{ "entries": [{ "rank", "studentNumber", "score" }] }`.
- `POST /api/scores` accepts `{ "studentNumber": "4231", "score": 1200, "questionsCompleted": 4 }` and returns the updated Top 10.

The API validates input, limits score submissions by IP, and stores one best score per 4-digit number. The game is client-side, so a determined player can alter a submitted score or impersonate a number; input validation is not authentication or anti-cheat. For a school-wide deployment, restrict access to the intended school network and arrange appropriate approval, backups, and retention for publicly displaying student numbers.
