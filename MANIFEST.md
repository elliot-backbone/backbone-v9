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
- `.backbone/config.js` — Project config

## CLI
```
node .backbone/cli.js status
node .backbone/cli.js qa
node .backbone/cli.js deploy
node .backbone/cli.js pull
node .backbone/cli.js handover
node .backbone/cli.js review
node .backbone/cli.js instructions
```

## QA
All commits require `qa/qa_gate.js` to pass (6 gates).
