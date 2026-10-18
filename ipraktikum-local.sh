#!/bin/sh
# Operates only on this machine's isolated, already-provisioned test stack.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
config="$root/.local/ipraktikum/compose.json"
if [ ! -f "$config" ]; then
    echo 'Local test stack has not been provisioned on this machine.' >&2
    exit 1
fi
if [ "$#" -eq 0 ]; then set -- ps; fi
exec docker compose -p ipraktikum-local-test -f "$config" "$@"
