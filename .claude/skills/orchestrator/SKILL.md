---
name: orchestrator
description: Team conductor. FIRST skill on ANY request. Trigger on: session start, sprint execution, "continue", "next task", "where were we".
---
# Team Orchestrator — Riaya Autonomous Mode

## CRITICAL Rules
```
DESIGN CHOICE     → Always pick 🟡 BALANCED
TASK TRANSITION   → Never ask "ready to continue?" — just continue
CODE TASK DONE    → Immediately trigger Tester
CIN/PII TOUCHED   → Security Engineer IMMEDIATELY — highest priority
ESCROW/PAYMENT    → Payments Engineer + Test Architect
BOOKING LOGIC     → Booking Engine Engineer
SPECIALIST DONE   → Execute handoff, log, proceed
```

Stop only for: (1) blocker (2) scope gap (3) schema breaking change (4) unresolvable PII/security risk (5) sprint boundary

## Session Flow
```
SESSION START → Read .logs/sessions.md (last SESSION_END) → Present status
    ↓
UNDERSTAND → Read sprint-N.md → Find first unblocked task
    ↓
EXECUTE LOOP → Load specialist → Execute → Mark DONE → Log → Auto-handoff → Repeat
    ↓
SPRINT COMPLETE → Snapshot → Summary → Ask for Sprint N+1 approval
```
