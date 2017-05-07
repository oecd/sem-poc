#!/bin/sh

ADDR=${1:-127.0.0.1}

cd _build/html
exec python3 -m http.server 8000 --bind $ADDR
