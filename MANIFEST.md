# Backbone V9

## Repo
https://github.com/elliot-backbone/backbone-v9

## Deploy
https://backbone-v9.vercel.app

## Structure
```
raw/        Input data
derive/     Derived calculations
predict/    Forward predictions
decide/     Action ranking
runtime/    Execution engine
qa/         Quality gates
ui/         Frontend (Next.js)
.backbone/  CLI tools
```

## Entry Points
- `runtime/main.js` — Core engine
- `qa/qa_gate.js` — QA validation
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
All commits require `qa/qa_gate.js` to pass (6 gates).
