#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/.dev.pids"

is_running() {
  local pid="$1"
  if [ -z "${pid}" ]; then
    return 1
  fi
  kill -0 "${pid}" 2>/dev/null
}

start() {
  if [ -f "$PID_FILE" ]; then
    read -r WORKER_PID VITE_PID < "$PID_FILE" || true
    if is_running "${WORKER_PID}" || is_running "${VITE_PID}"; then
      echo "dev is already running (pid file: $PID_FILE)."
      echo "run: npm run dev:stop"
      exit 1
    fi
    rm -f "$PID_FILE"
  fi

  echo "starting worker..."
  (cd "$ROOT_DIR/worker" && npx --no-install wrangler dev) &
  WORKER_PID=$!

  echo "starting vite..."
  (cd "$ROOT_DIR" && npm run dev) &
  VITE_PID=$!

  echo "$WORKER_PID $VITE_PID" > "$PID_FILE"

  cleanup() {
    echo "stopping..."
    if is_running "${VITE_PID}"; then
      kill "${VITE_PID}" 2>/dev/null || true
    fi
    if is_running "${WORKER_PID}"; then
      kill "${WORKER_PID}" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  }

  trap cleanup INT TERM EXIT

  while true; do
    if ! is_running "${WORKER_PID}"; then
      echo "worker exited"
      break
    fi
    if ! is_running "${VITE_PID}"; then
      echo "vite exited"
      break
    fi
    sleep 1
  done
}

stop() {
  if [ ! -f "$PID_FILE" ]; then
    echo "no pid file found: $PID_FILE"
    exit 0
  fi

  read -r WORKER_PID VITE_PID < "$PID_FILE" || true

  if is_running "${VITE_PID}"; then
    kill "${VITE_PID}" 2>/dev/null || true
  fi
  if is_running "${WORKER_PID}"; then
    kill "${WORKER_PID}" 2>/dev/null || true
  fi

  rm -f "$PID_FILE"
  echo "stopped"
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  *)
    echo "usage: $0 [start|stop]"
    exit 1
    ;;
esac
