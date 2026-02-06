# Backbone V9

## Repo
https://github.com/elliot-backbone/backbone-v9

## Deploy
https://backbone-v9.vercel.app

## Structure
```
packages/core/raw/        Input data
packages/core/derive/     Derived calculations
packages/core/predict/    Forward predictions (issues, preissues, goals)
packages/core/decide/     Action ranking
packages/core/runtime/    Execution engine
packages/core/qa/         Quality gates (9 gates)
ui/                       Frontend (Next.js, imports @backbone/core)
.backbone/                CLI tools
```

## Impact Model
All action upside = Σ (goalWeight × Δprobability)
See docs/IMPACT_MODEL.md for details.

## Entry Points
- `packages/core/runtime/main.js` — Core engine
- `packages/core/qa/qa_gate.js` — QA validation
- `ui/pages/index.js` — UI entry
- `.backbone/cli.js` — CLI tools
- `.backbone/config.js` — Config

## CLI
```
node .backbone/cli.js pull        # Full load
node .backbone/cli.js sync        # Quick refresh
node .backbone/cli.js load <dir>  # Load module
node .backbone/cli.js status      # Check state
node .backbone/cli.js deploy      # Ship it
node .backbone/cli.js handover    # Handover doc
```

## QA
All commits require `packages/core/qa/qa_gate.js` to pass (9 gates).
