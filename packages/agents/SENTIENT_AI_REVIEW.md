# Sentient AI Review

This note reviews `packages/agents/agents/sentientAI.ts` together with the voice UI in `packages/user-fe`, because the biggest voice UX issue is shaped by both sides.

Scope:
- No runtime code was changed.
- This is a diagnosis plus solution options only.
- Main files reviewed:
  - `packages/agents/agents/sentientAI.ts`
  - `packages/agents/agents/router.ts`
  - `packages/agents/routes/voice.ts`
  - `packages/agents/lib/speech/stt.ts`
  - `packages/agents/lib/speech/tts.ts`
  - `packages/agents/lib/prompts/sentientAI.ts`
  - `packages/agents/lib/memory/sessionMemory.ts`
  - `packages/user-fe/components/dashboard/DashboardAIChatHub.tsx`
  - `packages/user-fe/lib/utils/wav-recorder.ts`
  - `packages/user-fe/app/api/agents/voice/route.ts`

## Executive Summary

There are really two different problems here:

1. "It keeps listening even after I stopped talking"
   - This is primarily a `user-fe` behavior, not an `agents` bug.
   - The frontend voice mode is intentionally designed as a continuous loop: listen -> send -> play response -> auto-start listening again.
   - That loop lives in `packages/user-fe/components/dashboard/DashboardAIChatHub.tsx`.

2. "It takes too long and the output quality is poor"
   - This is strongly tied to `packages/agents/agents/sentientAI.ts` and the overall voice pipeline.
   - The current architecture is expensive:
     - frontend records raw WAV
     - Next.js proxy base64-encodes it
     - agents service transcribes it
     - Sentient AI runs a ReAct agent with many tools
     - TTS runs after the model finishes
     - only then does the user get the final result

So the short version is:

- Problem 1 is mostly `user-fe`.
- Problem 2 and the overall weak experience are a mix of `user-fe` voice transport choices and `agents` orchestration overhead.

## Current Voice Flow

Actual voice turn flow today:

1. `packages/user-fe/components/dashboard/DashboardAIChatHub.tsx:352-364`
   - frontend starts a new `WavRecorder`
2. `packages/user-fe/components/dashboard/DashboardAIChatHub.tsx:317-346`
   - silence detection runs in the browser
3. `packages/user-fe/components/dashboard/DashboardAIChatHub.tsx:372-421`
   - frontend stops recording and posts `FormData` to `/api/agents/voice`
4. `packages/user-fe/app/api/agents/voice/route.ts:28-50`
   - Next proxy converts audio blob to base64 JSON and forwards it to the agents service
5. `packages/agents/routes/voice.ts:72-104`
   - backend runs STT -> agent -> TTS in sequence
6. `packages/user-fe/components/dashboard/DashboardAIChatHub.tsx:487-514`
   - frontend plays TTS
7. `packages/user-fe/components/dashboard/DashboardAIChatHub.tsx:498-505`
   - when playback ends, recording starts again automatically if voice mode is still on

This means the current product is behaving more like a persistent voice-call loop than a one-shot push-to-talk interaction.

## Problem 1: "It keeps listening even after I stopped talking"

## Root cause in `user-fe`

This behavior is not coming from `packages/agents/agents/sentientAI.ts`.

The key cause is the frontend auto-restart loop:

- `packages/user-fe/components/dashboard/DashboardAIChatHub.tsx:498-505`
  - after TTS playback ends, the app automatically calls `startRecording()` again
- `packages/user-fe/components/dashboard/DashboardAIChatHub.tsx:511-513`
  - if there is no audio response, it still starts recording again
- `packages/user-fe/components/dashboard/DashboardAIChatHub.tsx:528-530`
  - after a voice error, it retries recording after 1 second if voice mode is still on
- `packages/user-fe/components/dashboard/DashboardAIChatHub.tsx:383-387`
  - even when the captured blob is too short, it immediately starts recording again

So if the user expects:

- "I speak once, it stops, then waits for me"

but the product is built as:

- "stay in continuous voice mode until the user ends the call"

then the UX will feel broken even if the code is doing exactly what it was written to do.

## Why the silence detection may still feel bad

The silence detector is simple:

- `packages/user-fe/components/dashboard/DashboardAIChatHub.tsx:317-346`
  - RMS threshold-based silence detection
- constants:
  - `SILENCE_THRESHOLD = 0.01`
  - `SILENCE_DURATION_MS = 2000`

Possible UX problems:

1. Two seconds may feel too long.
2. RMS threshold may be too low or too high depending on the device mic and ambient noise.
3. It does not appear to gate on "speech has actually started" before listening for silence.
4. There is no explicit max utterance length.
5. The user-facing label says "Listening..." while the overall mode is still active, which can feel like the app never really ended the previous turn.

## What this means

The issue is not "agents keeps listening."

A more accurate diagnosis is:

- the `user-fe` voice UX is implemented as continuous auto-resuming voice mode
- the silence detector is minimal
- the UI language makes the mode feel like live listening instead of turn-based processing

## Best solution directions for Problem 1

### Option A: Change the interaction model

Decide explicitly whether voice should be:

1. Push-to-talk
2. One-turn auto-stop
3. Continuous hands-free conversation

Right now the implementation is closest to option 3, but many users clearly expect option 1 or 2.

### Option B: If continuous mode stays, make it obvious

If the current behavior is intentional, the UI should say so clearly:

- "Voice call is active"
- "Waiting for you to speak again"
- "Tap End Voice Chat to stop auto-listening"

That would be much clearer than a repeated "Listening..." state.

### Option C: Tighten silence detection

If you keep auto-stop:

- require a brief speech-start event before silence countdown begins
- reduce silence duration
- add a max utterance cap
- ignore low-volume startup noise

### Option D: Stop auto-restarting on every path

The current UX is especially aggressive because it restarts after:

- success
- no audio response
- too-short audio
- errors

That makes the system feel unstoppable.

## Problem 2: "It is taking way too much time to give output"

This is where both frontend and backend are contributing.

## Frontend-side latency causes

### 1. Raw WAV recording is heavy

`packages/user-fe/lib/utils/wav-recorder.ts:23-69`

The recorder:

- captures PCM audio
- encodes full WAV in the browser
- uses 44.1kHz mono PCM

This creates relatively large payloads compared to compressed voice formats like WebM/Opus.

### 2. The Next.js proxy base64-encodes audio

`packages/user-fe/app/api/agents/voice/route.ts:28-50`

The proxy:

- reads the uploaded file
- converts it to base64
- wraps it in JSON
- forwards it to the agents service

This adds:

- extra memory work
- extra serialization
- larger payload size

Base64 typically inflates payload size by roughly one third, which is not ideal for voice.

## Backend-side latency causes

### 1. Fully sequential voice pipeline

`packages/agents/routes/voice.ts:72-104`

The pipeline is:

1. transcribe
2. run agent
3. synthesize speech
4. return final payload

That guarantees slow perceived response time.

### 2. ReAct agent overhead on every turn

`packages/agents/agents/sentientAI.ts:98-115`

Sentient AI:

- binds tools per request
- creates a new ReAct agent per request
- sends prompt + history + user message
- waits for a full final result

This is expensive for simple turns.

### 3. Large tool surface

`packages/agents/agents/sentientAI.ts:74-92`

The model sees a broad tool menu every time. That often slows decision-making and hurts output quality.

### 4. Full history is always passed in

- `packages/agents/agents/router.ts:78-82`
- `packages/agents/lib/memory/sessionMemory.ts:10-12`

History can grow to 50 messages. Longer prompt context increases latency and usually makes multi-step behavior less stable.

### 5. TTS blocks the answer

`packages/agents/routes/voice.ts:98-104`

Even once the text answer is ready, the user still waits for TTS generation.

## Best solution directions for latency

### Option A: Stream text

This is one of the best improvements.

The repo already has an SSE example:

- `packages/agents/routes/report.ts:14-25`

For voice/chat, a better flow would be:

1. transcript becomes available
2. text starts streaming immediately
3. TTS is generated after the first sentence or after final text

### Option B: Return text first, TTS second

If streaming is too much work right now:

1. return transcript + text immediately
2. let TTS be a second request or a background task

This is much simpler and will still improve responsiveness.

### Option C: Avoid base64 JSON for voice transport

Better transport choices:

- stream binary audio through the proxy
- pass multipart through directly
- avoid the file -> base64 -> JSON conversion step

### Option D: Use a compressed voice format

A compressed client format would reduce:

- upload time
- proxy memory pressure
- overall end-to-end latency

### Option E: Add latency tracing

Measure separately:

1. record duration
2. proxy encode duration
3. upload duration
4. STT duration
5. Sentient AI duration
6. TTS duration
7. total voice turn time

Without that, it is easy to optimize the wrong layer.

## Problem 3: "Overall output/performance is poor"

This is mainly an `agents` design issue.

## Why Sentient AI output quality is likely suffering

### 1. One agent is handling too many responsibilities

`packages/agents/lib/prompts/sentientAI.ts:3-45`

The same agent is trying to be:

- general assistant
- civic search tool user
- complaint filing guide
- location-flow controller
- navigation controller
- escalation router

That is a lot for one prompt and one tool menu.

### 2. The prompt pushes aggressive tool usage

`packages/agents/lib/prompts/sentientAI.ts:13-23`

This encourages the model to act immediately and use tools often. That can help autonomy, but it also tends to create:

- unnecessary tool calls
- slower answers
- awkward responses
- poorer conversational judgment

### 3. Output parsing is brittle

`packages/agents/agents/sentientAI.ts:128-175`

The system currently depends on:

- marker strings like `[ESCALATE_TO_HELP_AI]`
- regex cleanup
- scanning tool messages for embedded JSON

That is fragile and hard to optimize safely.

### 4. Complaint flow is prompt-driven instead of state-driven

The prompt tells the model process rules such as when not to re-run location detection, but the backend does not appear to enforce that as structured state. That makes repeated questions and inconsistent flow more likely.

## Better architecture options for Sentient AI

### Option A: Add a fast intent router before the main agent

Most turns do not need a full ReAct loop.

Good fast-path examples:

- track my complaints
- show trending issues
- open profile
- tell me complaint categories
- explain how registration works

These can use:

- a tiny intent classifier
- deterministic tool handlers
- a simple structured response formatter

### Option B: Reserve ReAct for complex turns only

Use the full agent only when a request genuinely needs:

- multi-step reasoning
- ambiguous tool selection
- complaint drafting from partial context

### Option C: Restrict tools by intent

Do not expose the entire toolset on every turn.

For example:

- navigation intent gets navigation tool only
- complaint tracking gets complaint lookup tools only
- knowledge/help gets knowledge tools only

This usually improves both speed and answer quality.

### Option D: Move to structured outputs

Instead of marker parsing, use a schema like:

```json
{
  "text": "I found your recent complaints.",
  "action": "NONE",
  "navigationPath": null,
  "complaintDraft": null,
  "requestLocation": false,
  "escalate": false
}
```

That would make the system much easier to reason about and test.

### Option E: Add explicit complaint state

Track fields like:

- description
- category
- subCategory
- district
- city
- locality
- urgency
- photo attached

Then the model only needs to fill missing fields instead of remembering the entire workflow from prompt text alone.

## Recommended priority order

If the goal is the biggest real improvement with the least wasted effort:

1. Fix the product decision in `user-fe`:
   - should voice mode auto-resume or not?

2. If continuous mode stays, change the UI copy and state handling so users understand that the call is still active.

3. Reduce voice transport cost:
   - compressed audio
   - avoid base64 JSON if possible

4. Stop blocking the user on TTS.

5. Add streaming or at least text-first responses.

6. Replace the "everything goes through ReAct" pattern for common intents.

7. Move Sentient AI actions to structured output + explicit workflow state.

## Final Verdict

After looking at `user-fe`, the first problem becomes much clearer:

- "keeps listening" is mainly caused by the frontend continuous voice-loop design in `DashboardAIChatHub`, not by `sentientAI.ts`

The rest of the bad experience is still very much tied to the current agents stack:

- heavy ReAct orchestration
- large tool surface
- full-history prompting
- synchronous STT -> agent -> TTS pipeline

If I had to summarize the best next move in one line:

Treat voice UX and Sentient AI orchestration as two separate redesign tasks, because right now the frontend is causing the "always listening" feeling while the backend is causing most of the slowness and weak answer quality.
