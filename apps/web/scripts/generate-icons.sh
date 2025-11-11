#!/bin/bash

# PWA用のアイコンを生成するスクリプト
# ImageMagickまたはInkscapeを使用してSVGからPNGを生成

SIZES=(72 96 128 144 152 192 384 512)
INPUT_SVG="public/icons/icon.svg"
OUTPUT_DIR="public/icons"

echo "Generating PWA icons..."

# ImageMagickを使用する場合
if command -v convert &> /dev/null; then
    echo "Using ImageMagick..."
    for size in "${SIZES[@]}"; do
        output_file="${OUTPUT_DIR}/icon-${size}x${size}.png"
        convert -background none -resize ${size}x${size} "${INPUT_SVG}" "${output_file}"
        echo "Generated: ${output_file}"
    done
# Inkscapeを使用する場合
elif command -v inkscape &> /dev/null; then
    echo "Using Inkscape..."
    for size in "${SIZES[@]}"; do
        output_file="${OUTPUT_DIR}/icon-${size}x${size}.png"
        inkscape -w ${size} -h ${size} "${INPUT_SVG}" -o "${output_file}"
        echo "Generated: ${output_file}"
    done
else
    echo "Error: Neither ImageMagick nor Inkscape is installed."
    echo "Please install one of them to generate PNG icons."
    echo ""
    echo "Install ImageMagick:"
    echo "  Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "  macOS: brew install imagemagick"
    echo ""
    echo "Install Inkscape:"
    echo "  Ubuntu/Debian: sudo apt-get install inkscape"
    echo "  macOS: brew install inkscape"
    exit 1
fi

echo "Icon generation complete!"
