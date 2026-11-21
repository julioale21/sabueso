#!/usr/bin/env bash
# Builds one PDF per sabueso-<language>.md next to this script (sabueso-es.pdf, later sabueso-en.pdf).
# Usage: bash docs/documentation/build-pdf.sh
# Needs: pandoc and Google Chrome (set CHROME to use another Chromium binary).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

# Print styles: A4, page numbers, a page break before each top-level section.
cat > "$WORK/print.css" <<'EOF'
@page { size: A4; margin: 18mm 16mm 20mm 16mm; @bottom-center { content: counter(page); font-size: 9pt; color: #777; } }
body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1d1c2b; max-width: none; margin: 0; padding: 0; }
header#title-block-header { text-align: center; margin: 75mm 0 20mm; page-break-after: always; }
header#title-block-header .title { font-size: 32pt; margin-bottom: 6mm; }
header#title-block-header .subtitle { font-size: 14pt; color: #5d5b73; }
header#title-block-header .date { font-size: 11pt; color: #5d5b73; margin-top: 10mm; }
nav#TOC { page-break-after: always; font-size: 10.5pt; }
nav#TOC li { margin-top: 4pt; }
h1 { page-break-before: always; font-size: 19pt; border-bottom: 2px solid #5b55c9; padding-bottom: 4pt; margin-top: 0; }
h2 { font-size: 14pt; margin-top: 18pt; page-break-after: avoid; }
h3 { font-size: 11.5pt; page-break-after: avoid; }
p, li { orphans: 3; widows: 3; }
code { font-family: Menlo, "SF Mono", monospace; font-size: 8.8pt; background: #f2f1f8; padding: 0 2px; border-radius: 2px; }
pre { font-family: Menlo, "SF Mono", monospace; font-size: 8.4pt; line-height: 1.35; background: #f6f6fa; border: 1px solid #dddbe9; border-radius: 4px; padding: 6pt 8pt; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; }
pre code { background: none; padding: 0; font-size: inherit; }
table { border-collapse: collapse; width: 100%; font-size: 8.8pt; margin: 6pt 0 10pt; }
th, td { border: 1px solid #dddbe9; padding: 3pt 5pt; vertical-align: top; text-align: left; word-break: break-word; }
th { background: #ecebfb; }
tr { page-break-inside: avoid; }
blockquote { margin: 6pt 0; padding: 4pt 10pt; border-left: 3px solid #5b55c9; background: #f7f7fb; color: #3a3950; }
EOF

# Markdown → HTML → PDF, one language at a time. TeX math is off: $ is the end-of-input symbol.
for source in "$HERE"/sabueso-*.md; do
  language="$(basename "$source" .md)"
  language="${language#sabueso-}"
  (cd "$HERE" && pandoc "sabueso-$language.md" -f gfm-tex_math_dollars+yaml_metadata_block \
    -t html5 -s --toc --toc-depth=1 --embed-resources --css "$WORK/print.css" \
    -o "$WORK/sabueso-$language.html")
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$HERE/sabueso-$language.pdf" "file://$WORK/sabueso-$language.html" 2>/dev/null
  echo "PDF: $HERE/sabueso-$language.pdf"
done
