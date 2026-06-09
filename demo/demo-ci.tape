Output demo.gif

Set FontSize 13
Set Width 100
Set Height 36
Set Theme "Catppuccin Mocha"
Set Padding 16
Set Margin 8
Set MarginFill "#1e1e2e"
Set BorderRadius 12
Set Framerate 24

Sleep 500ms

Type "# EU AI Act compliance — classify any AI system in seconds"
Enter
Sleep 800ms

Type "# ── 1. Recruitment AI → high-risk? ─────────────────────────────────"
Enter
Sleep 400ms

Type `node -e "import('./dist/classifier.js').then(({KeywordClassifier})=>new KeywordClassifier().classify('An AI that screens and ranks job applicants CVs for recruitment and promotion decisions').then(h=>import('./dist/engine.js').then(({renderClassification})=>console.log(renderClassification(h)))))"`
Enter
Sleep 4000ms

Type "# ── 2. Social scoring → prohibited? ────────────────────────────────"
Enter
Sleep 400ms

Type `node -e "import('./dist/classifier.js').then(({KeywordClassifier})=>new KeywordClassifier().classify('A government social scoring system that rates citizens for trustworthiness').then(h=>import('./dist/engine.js').then(({renderClassification})=>console.log(renderClassification(h)))))"`
Enter
Sleep 4000ms

Type "# ── 3. Customer chatbot → limited risk? ─────────────────────────────"
Enter
Sleep 400ms

Type `node -e "import('./dist/classifier.js').then(({KeywordClassifier})=>new KeywordClassifier().classify('A customer support chatbot that interacts directly with users').then(h=>import('./dist/engine.js').then(({renderClassification})=>console.log(renderClassification(h)))))"`
Enter
Sleep 4000ms

Type "# ── 4. Scan this repo for compliance artifacts ───────────────────────"
Enter
Sleep 400ms

Type `node -e "import('./dist/engine.js').then(({scanRepo})=>console.log(scanRepo(['LICENSE','README.md','CONTRIBUTING.md','rules/ruleset.json','src/engine.ts'])))"`
Enter
Sleep 3000ms

Sleep 1500ms
