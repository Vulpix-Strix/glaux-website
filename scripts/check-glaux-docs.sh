#!/bin/sh
# Runs Glaux's own documentation validation. The website never reimplements it.
set -e
GLAUX_DIR="${GLAUX_DIR:-$(cd "$(dirname "$0")/../../glaux" && pwd)}"
cd "$GLAUX_DIR"
exec mise run docs-check
