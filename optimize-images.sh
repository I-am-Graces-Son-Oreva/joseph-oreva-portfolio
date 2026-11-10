#!/bin/zsh
# Run from this website folder on macOS to regenerate full-resolution web copies.
# Originals are read only; output is staged and checked before replacing web copies.
set -eu
cd "${0:A:h}"
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
for source in IMG_0886.JPG IMG_0168.JPG IMG_3160.HEIC IMG_1195.HEIC IMG_4794.HEIC IMG_6395.jpg IMG_7201.jpg IMG_1838.JPG; do
  name="${source:r}.jpg"
  sips -s format jpeg -s formatOptions 80 -Z 1800 "images/$source" --out "$stage/$name"
done
print 'Review the generated images before copying them into images/web:'
open "$stage"
printf 'Press Enter only if all eight images look correct: '
read -r response
cp "$stage/"*.jpg images/web/
