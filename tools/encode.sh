#!/bin/zsh
# Encode WAV masters to lossless FLAC for the site (bit depth and sample rate kept).
# usage: tools/encode.sh <out-dir> <file.wav>...
# Output names are slugs: "June 11 2026 #2.wav" -> june-11-2026-2.flac
set -e
out=$1; shift
mkdir -p "$out"
for f in "$@"; do
  slug=$(basename "$f" .wav | tr 'A-Z' 'a-z' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g')
  afconvert -f flac -d flac "$f" "$out/$slug.flac"
  echo "$slug.flac"
done
