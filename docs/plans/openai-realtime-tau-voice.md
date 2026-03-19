# OpenAI Realtime Tau-Style Voice Eval Plan

## Goal

Build a local, eval-focused voice simulation harness in promptfoo that is inspired by Tau-Bench, targets OpenAI realtime audio models, stores useful artifacts for debugging and grading, and works entirely inside this repository.

## Success Criteria

- Local simulated-user turns run in-process without Promptfoo's remote generation service.
- OpenAI realtime provider accepts audio input envelopes and returns normalized audio, transcript, tool-call, and timing artifacts.
- A Tau-style voice eval provider can run multi-turn voice interactions against a target provider.
- Eval outputs can be graded with existing assertions, especially `llm-rubric`, trajectory assertions, and trace assertions.
- Examples, tests, and docs cover the main workflow.
- End-to-end QA runs against real OpenAI APIs using a local `.env` file outside this repository.

## Scope

### Phase 1: Foundation

- [x] Refactor simulated-user provider plumbing so local providers can generate user turns.
- [x] Align the OpenAI realtime provider with current audio input/output handling.
- [x] Define a reusable voice trajectory metadata shape for multi-turn evals.

### Phase 2: Harness

- [x] Add a Tau-style voice eval provider that orchestrates simulated user text, TTS, realtime target calls, transcripts, and stop conditions.
- [x] Persist normalized artifacts in `metadata.messages` and `metadata.voiceTurns`.
- [x] Emit trace spans and useful metadata for assertions and debugging.

### Phase 3: Grading

- [x] Ensure the final provider response works with `llm-rubric`.
- [x] Ensure trajectory and trace assertions can evaluate the voice run.
- [x] Add helper metadata that makes transcript- and trace-aware grading straightforward.

### Phase 4: Validation

- [x] Add unit tests for local simulation and realtime artifact normalization.
- [ ] Add example configs for OpenAI realtime voice evals.
- [ ] Run lint, format, targeted tests, and at least one end-to-end eval using a local API key source.

## Implementation Notes

- Start with half-duplex turn-taking rather than full-duplex orchestration.
- Reuse promptfoo tracing, eval UI, and assertion infrastructure instead of building parallel systems.
- Preserve backward compatibility where practical, especially around existing simulated-user configs.
- Keep raw audio/transcript payloads out of git history and plan updates.

## Progress Log

### 2026-03-19

- Created feature branch `feature/openai-realtime-tau-voice`.
- Completed repo, Promptfoo, pc, Tau-Bench, and OpenAI docs scan.
- Identified main gaps: simulated-user is remote-bound, realtime provider needs protocol alignment, and the voice eval harness needs a local Tau-style orchestrator.
- Added shared Tau simulator prompt helpers in `src/providers/tauShared.ts`.
- Updated `promptfoo:simulated-user` to support a nested local `userProvider` while preserving the remote hosted default.
- Added registry support for resolving nested providers in simulated-user configs.
- Added and passed targeted tests for local simulated-user execution.
- Updated `src/providers/openai/realtime.ts` to accept `audio_input` envelopes, normalize current realtime output audio/transcript events, support persistent conversation IDs, and capture richer metadata for transcripts, audio, tools, and event counts.
- Added and passed targeted realtime provider tests for audio input envelopes, output alias normalization, persistent function callbacks, and existing connection behavior.
- Added `openai:speech:*` as a local TTS provider backed by OpenAI's `/audio/speech` endpoint, with promptfoo audio normalization and tracing.
- Added `promptfoo:tau-voice`, a local Tau-style voice harness that runs simulated user generation, TTS, realtime target calls, and transcript assembly inside promptfoo.
- Removed per-run mutation of shared realtime provider instructions by passing target instructions through per-call prompt context instead.
- Extended realtime voice metadata to carry session IDs, input/output transcripts, tool-call details, event counts, and voice-turn latency breakdowns.
- Added and passed targeted tests for the new OpenAI speech provider and Tau voice harness.
