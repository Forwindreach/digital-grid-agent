#!/usr/bin/env python3
"""
md2pdf — Markdown to PDF converter with Chinese font support.

Usage:
    md2pdf [paths...]                  # convert .md files in given paths
    md2pdf                             # convert all .md in current directory
    md2pdf -o ./out docs/              # output to a specific directory
    md2pdf -f /path/to/font.ttf doc.md # specify a font manually

Python API:
    from md2pdf import convert_file, convert, detect_cjk_font
    convert_file("doc.md", "doc.pdf")
    convert(["a.md", "b.md"], output_dir="./pdfs")
"""

from __future__ import annotations

import argparse
import contextlib
import io
import logging
import os
import re
import sys
from pathlib import Path
from typing import List, Optional, Sequence

# ---------------------------------------------------------------------------
# Dependencies (fail early with helpful messages)
# ---------------------------------------------------------------------------
try:
    from markdown_it import MarkdownIt
except ImportError:
    sys.exit(
        "Missing dependency: markdown-it-py\n"
        "  Install with: pip install markdown-it-py"
    )

try:
    from fpdf import FPDF, TextStyle
except ImportError:
    sys.exit(
        "Missing dependency: fpdf2\n"
        "  Install with: pip install fpdf2"
    )

# ---------------------------------------------------------------------------
# Logging & noise suppression
# ---------------------------------------------------------------------------
log = logging.getLogger("md2pdf")

# fpdf2 uses fonttools for font subsetting, which is extremely verbose.
# Suppress all of it unless MD2PDF_DEBUG is set.
for _name in ("fpdf", "fontTools", "fontTools.subset", "fontTools.ttLib", "PIL"):
    logging.getLogger(_name).setLevel(logging.ERROR)


# ---------------------------------------------------------------------------
# Cross-platform CJK font detection
# ---------------------------------------------------------------------------

FONT_CANDIDATES: dict[str, list[str]] = {
    "darwin": [
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/System/Library/Fonts/Supplemental/Songti.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/System/Library/Fonts/PingFang.ttc",
    ],
    "linux": [
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
        "/usr/share/fonts/truetype/arphic/uming.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJKsc-VF.otf",
    ],
    "win32": [
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simsun.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/mingliu.ttc",
    ],
}

# Internal name used when registering the font with fpdf2
_FPDF_FONT_NAME = "CJK"


def detect_cjk_font() -> Optional[str]:
    """Return the first available CJK font path for the current platform, or None."""
    candidates = FONT_CANDIDATES.get(sys.platform, [])
    for path in candidates:
        if os.path.isfile(path):
            return path
    return None


# ---------------------------------------------------------------------------
# Markdown → clean HTML
# ---------------------------------------------------------------------------

_md_parser = MarkdownIt()


def md_to_clean_html(text: str) -> str:
    """Render Markdown to HTML and clean it for fpdf2's write_html()."""
    html = _md_parser.render(text)

    # fpdf2 does not support <thead> / <tbody> — strip tags, keep content
    html = re.sub(r"</?thead>", "", html)
    html = re.sub(r"</?tbody>", "", html)

    # <pre><code> → <pre>  (otherwise <code> defaults to Courier which lacks CJK glyphs)
    html = re.sub(r"<pre><code>", "<pre>", html)
    html = re.sub(r"</code></pre>", "</pre>", html)

    # Add table borders
    html = html.replace("<table>", '<table border="1">')

    return html


# ---------------------------------------------------------------------------
# Single-file conversion
# ---------------------------------------------------------------------------

def convert_file(
    src: str | Path,
    dst: str | Path | None = None,
    font_path: str | None = None,
    title: str | None = None,
) -> Path:
    """Convert a single Markdown file to PDF.

    Args:
        src: Path to the .md source file.
        dst: Destination .pdf path.  If None, same stem as *src*.
        font_path: Path to a .ttf/.ttc/.otf font with CJK coverage.
                   Auto-detected when omitted.
        title: Optional document title shown in the PDF header.
               Defaults to the source file stem.

    Returns:
        The resolved destination ``Path``.

    Raises:
        FileNotFoundError: if *src* does not exist or no CJK font is available.
    """
    src = Path(src).resolve()
    if not src.is_file():
        raise FileNotFoundError(f"Source file not found: {src}")

    # Resolve font
    font = font_path or detect_cjk_font()
    if not font:
        raise FileNotFoundError(
            "No CJK font found.  Install one (e.g. fonts-wqy-zenhei on Linux) "
            "or pass --font /path/to/font.ttf"
        )
    if not os.path.isfile(font):
        raise FileNotFoundError(f"Font file not found: {font}")

    # Destination
    dst = Path(dst) if dst else src.with_suffix(".pdf")
    dst = dst.resolve()

    title = title or src.stem.replace("_", " ")

    # Read & convert (suppress fonttools debug noise on stderr)
    content = src.read_text(encoding="utf-8")
    html_body = md_to_clean_html(content)

    full_html = f"<h1>{title}</h1><hr>{html_body}"

    pdf = FPDF()
    pdf.add_font(_FPDF_FONT_NAME, style="", fname=font)
    pdf.add_font(_FPDF_FONT_NAME, style="B", fname=font)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_left_margin(25)
    pdf.set_right_margin(25)
    pdf.add_page()

    _debug = os.environ.get("MD2PDF_DEBUG", "")
    _stderr_ctx = contextlib.nullcontext() if _debug else contextlib.redirect_stderr(io.StringIO())
    with _stderr_ctx:
        pdf.write_html(
            full_html,
            font_family=_FPDF_FONT_NAME,
            tag_styles={
                "pre": TextStyle(font_family=_FPDF_FONT_NAME, font_size_pt=10),
                "code": TextStyle(font_family=_FPDF_FONT_NAME, font_size_pt=10),
            },
        )
        pdf.output(str(dst))
    return dst


# ---------------------------------------------------------------------------
# Batch conversion
# ---------------------------------------------------------------------------

def _collect_md_files(
    paths: Sequence[str | Path],
    recursive: bool,
) -> list[Path]:
    """Expand a list of paths into a flat, de-duplicated list of .md files."""
    md_files: list[Path] = []
    seen: set[str] = set()

    for raw in paths:
        p = Path(raw).resolve()
        if p.is_file():
            if p.suffix.lower() == ".md" and str(p) not in seen:
                md_files.append(p)
                seen.add(str(p))
        elif p.is_dir():
            pattern = "**/*.md" if recursive else "*.md"
            for f in sorted(p.glob(pattern)):
                if str(f) not in seen:
                    md_files.append(f)
                    seen.add(str(f))
        else:
            log.warning("Path does not exist, skipping: %s", raw)

    return md_files


def convert(
    paths: Sequence[str | Path] | None = None,
    output_dir: str | Path | None = None,
    font_path: str | None = None,
    recursive: bool = False,
    remove_source: bool = False,
) -> list[Path]:
    """Batch-convert Markdown files to PDF.

    Args:
        paths: Files or directories to scan for ``.md``.  Defaults to ``["."]``.
        output_dir: Where to write PDFs.  Defaults to the source file's directory.
        font_path: CJK font path (auto-detected if omitted).
        recursive: Recurse into subdirectories.
        remove_source: Delete each ``.md`` after successful conversion.

    Returns:
        List of generated PDF ``Path`` objects.
    """
    paths = list(paths) if paths else [Path.cwd()]
    md_files = _collect_md_files(paths, recursive)

    if not md_files:
        log.warning("No .md files found.")
        return []

    font = font_path or detect_cjk_font()
    out_dir = Path(output_dir).resolve() if output_dir else None
    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)

    results: list[Path] = []
    for src in md_files:
        dst = (out_dir / src.with_suffix(".pdf").name) if out_dir else src.with_suffix(".pdf")
        log.info("Converting: %s  →  %s", src.name, dst.name)
        try:
            convert_file(src, dst, font_path=font)
            results.append(dst)
            if remove_source:
                src.unlink()
                log.info("  Removed source: %s", src.name)
        except Exception as exc:
            log.error("  Failed: %s — %s", src.name, exc)

    return results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="md2pdf",
        description="Convert Markdown files to PDF with automatic Chinese font detection.",
    )
    p.add_argument(
        "paths",
        nargs="*",
        metavar="PATH",
        help="Markdown files or directories containing .md files (default: current directory).",
    )
    p.add_argument(
        "-o", "--output",
        default=None,
        metavar="DIR",
        help="Output directory for generated PDFs (default: same as source file).",
    )
    p.add_argument(
        "-f", "--font",
        default=None,
        metavar="PATH",
        help="Path to a CJK-capable .ttf/.ttc/.otf font (default: auto-detect).",
    )
    p.add_argument(
        "-r", "--recursive",
        action="store_true",
        help="Recursively search directories for .md files.",
    )
    p.add_argument(
        "--remove-source",
        action="store_true",
        help="Delete original .md files after successful conversion.",
    )
    p.add_argument(
        "--version",
        action="version",
        version="md2pdf 1.0.0",
    )
    p.add_argument(
        "-q", "--quiet",
        action="store_true",
        help="Suppress progress output.",
    )
    return p


def main(argv: Sequence[str] | None = None) -> int:
    """CLI entry point.  Returns 0 on success, 1 on error."""
    parser = _build_parser()
    args = parser.parse_args(argv)

    # Setup logging
    logging.basicConfig(
        level=logging.WARNING if args.quiet else logging.INFO,
        format="%(message)s",
    )

    # Default paths
    paths = args.paths if args.paths else ["."]

    # Font check
    font = args.font or detect_cjk_font()
    if not font:
        print(
            "No CJK font found on this system.\n"
            "Please install a Chinese font or use --font to specify one manually.\n"
            "\n"
            "  macOS: fonts are pre-installed (STHeiti, Songti, PingFang).\n"
            "  Linux: sudo apt install fonts-wqy-zenhei\n"
            "  Windows: fonts are pre-installed (Microsoft YaHei, SimSun).\n"
            "\n"
            "If a font IS installed, pass it explicitly:\n"
            "  md2pdf --font /path/to/your/font.ttf doc.md",
            file=sys.stderr,
        )
        return 1

    results = convert(
        paths=paths,
        output_dir=args.output,
        font_path=font,
        recursive=args.recursive,
        remove_source=args.remove_source,
    )

    if results:
        print(f"\nDone — {len(results)} PDF(s) generated.")
    return 0


# ---------------------------------------------------------------------------
# __main__ support (python -m md2pdf or python md2pdf.py)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    sys.exit(main())
