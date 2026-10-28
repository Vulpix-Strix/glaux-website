#!/bin/sh
# Runs Glaux's own documentation validation. The website never reimplements it.
set -eu
exec node "$(dirname "$0")/check-glaux-docs.ts"
