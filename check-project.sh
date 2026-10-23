#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
for file in manifest.json content.js styles.css README.md PRODUCAO.md demo-claims.json background.js; do
  test -s "$file" || { echo "Arquivo ausente ou vazio: $file"; exit 1; }
done
python3 -m json.tool manifest.json >/dev/null
python3 -m json.tool demo-claims.json >/dev/null
for size in 16 48 128; do test -s "icons/icon${size}.png" || exit 1; done
node --check background.js
echo "TruthMeter AI protótipo: estrutura válida"
