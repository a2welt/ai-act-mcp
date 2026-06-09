# VHS tape — generates demo.gif
# Install VHS: https://github.com/charmbracelet/vhs
# Run: vhs demo.tape (from the demo/ directory, after npm run build)

Output demo.gif

Set FontSize 14
Set Width 110
Set Height 38
Set Theme "Catppuccin Mocha"
Set Padding 16
Set Margin 8
Set MarginFill "#1e1e2e"
Set BorderRadius 12
Set Framerate 24
Set PlaybackSpeed 1.0

# ── Start ───────────────────────────────────────────────────────────────────
Sleep 500ms

Type "# ai-act-mcp: classify your AI system under the EU AI Act"
Sleep 800ms
Enter
Sleep 400ms

Type "# ─── keyword backend (instant, fully offline) ────────────────────"
Sleep 600ms
Enter
Sleep 200ms

Type "node -e \""
Sleep 200ms
Type "import('./dist/classifier.js').then(({KeywordClassifier})=>"
Sleep 100ms
Type "new KeywordClassifier().classify('An AI that screens job applicants CVs for recruitment').then("
Sleep 100ms
Type "h=>import('./dist/engine.js').then(({renderClassification})=>console.log(renderClassification(h))));\""
Sleep 300ms
Enter
Sleep 2500ms

# ── Local Ollama backend ─────────────────────────────────────────────────────
Sleep 800ms
Type "# ─── local SLM via Ollama (fully offline, semantic) ─────────────────"
Sleep 600ms
Enter
Sleep 200ms

Type "AI_ACT_CLASSIFIER=local node demo/test-local.mjs"
Sleep 400ms
Enter
Sleep 18000ms

# ── Done ─────────────────────────────────────────────────────────────────────
Sleep 1500ms
