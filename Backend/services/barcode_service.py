"""
Barcode Label PDF Service
=========================
Generates A4 PDFs containing 1D Code 128 barcode labels for product units.
Each label row shows: sequence number, unit SKU text, and a scannable barcode.
"""

import os
import io
import tempfile
from datetime import datetime, timezone
from typing import List, Optional

import barcode
from barcode.writer import ImageWriter
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    Image as RLImage,
    PageBreak,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER


# ── Constants ─────────────────────────────────────────────────────────────────
PAGE_WIDTH, PAGE_HEIGHT = A4  # 210mm x 297mm
BARCODE_WIDTH_MM = 60
BARCODE_HEIGHT_MM = 15
LABELS_PER_PAGE = 20


def _generate_barcode_image(data: str) -> io.BytesIO:
    """Generate a Code 128 barcode PNG image in-memory for the given string."""
    code128 = barcode.get("code128", data, writer=ImageWriter())
    buf = io.BytesIO()
    code128.write(
        buf,
        options={
            "module_width": 0.3,
            "module_height": 8.0,
            "font_size": 0,          # no text under barcode (we show it in a separate column)
            "text_distance": 1,
            "quiet_zone": 2,
            "write_text": False,
        },
    )
    buf.seek(0)
    return buf


def _build_styles():
    """Create custom paragraph styles for the PDF."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        "HeaderTitle",
        parent=styles["Heading1"],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=2 * mm,
    ))
    styles.add(ParagraphStyle(
        "HeaderMeta",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=1 * mm,
    ))
    styles.add(ParagraphStyle(
        "CellText",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1e293b"),
    ))
    styles.add(ParagraphStyle(
        "SeqText",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748b"),
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        "SKUText",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        fontName="Courier-Bold",
        textColor=colors.HexColor("#0f172a"),
    ))

    return styles


def generate_barcode_pdf(
    units: List[dict],
    product_name: str = "",
    product_sku: str = "",
    batch_labels: Optional[List[str]] = None,
    store_name: str = "",
) -> str:
    """
    Generate an A4 PDF with barcode labels for the given units.

    Args:
        units: List of dicts with at least {"unit_sku": "..."}.
        product_name: Name of the product.
        product_sku: Base SKU of the product.
        batch_labels: List of batch label strings, e.g. ["#9", "#10"].
        store_name: Name of the store / warehouse.

    Returns:
        Absolute path to the generated temporary PDF file.
    """
    if not units:
        raise ValueError("No units provided for barcode generation")

    # Create temporary file
    tmp = tempfile.NamedTemporaryFile(
        delete=False, suffix=".pdf", prefix="barcodes_"
    )
    tmp_path = tmp.name
    tmp.close()

    styles = _build_styles()

    doc = SimpleDocTemplate(
        tmp_path,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    elements = []

    # ── Header Section ────────────────────────────────────────────────────────
    now_str = datetime.now().strftime("%b %d, %Y  %I:%M %p")
    batch_str = ", ".join(batch_labels) if batch_labels else "All"

    elements.append(Paragraph(
        f"Barcode Labels — {product_name}",
        styles["HeaderTitle"],
    ))
    elements.append(Paragraph(
        f"Product SKU: <b>{product_sku}</b> &nbsp;|&nbsp; "
        f"Batch: <b>{batch_str}</b> &nbsp;|&nbsp; "
        f"Store: <b>{store_name}</b>",
        styles["HeaderMeta"],
    ))
    elements.append(Paragraph(
        f"Generated: {now_str} &nbsp;|&nbsp; Total Units: <b>{len(units)}</b>",
        styles["HeaderMeta"],
    ))
    elements.append(Spacer(1, 6 * mm))

    # ── Table Header ──────────────────────────────────────────────────────────
    col_widths = [12 * mm, 50 * mm, 110 * mm]

    header_row = [
        Paragraph("<b>#</b>", styles["SeqText"]),
        Paragraph("<b>Unit SKU</b>", styles["CellText"]),
        Paragraph("<b>Barcode</b>", styles["CellText"]),
    ]

    table_data = [header_row]

    # ── Generate barcode rows ─────────────────────────────────────────────────
    for idx, unit in enumerate(units, start=1):
        sku = unit.get("unit_sku", "UNKNOWN")

        # Generate barcode image
        barcode_buf = _generate_barcode_image(sku)
        barcode_img = RLImage(
            barcode_buf,
            width=BARCODE_WIDTH_MM * mm,
            height=BARCODE_HEIGHT_MM * mm,
        )

        row = [
            Paragraph(str(idx), styles["SeqText"]),
            Paragraph(sku, styles["SKUText"]),
            barcode_img,
        ]
        table_data.append(row)

    # ── Build table ───────────────────────────────────────────────────────────
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#334155")),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 6),

        # Data rows
        ("TOPPADDING", (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),

        # Grid lines
        ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#cbd5e1")),
        ("LINEBELOW", (0, 1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),

        # Alternating row colors
        *[
            ("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f8fafc"))
            for i in range(2, len(table_data), 2)
        ],
    ]))

    elements.append(table)

    # ── Build PDF ─────────────────────────────────────────────────────────────
    doc.build(elements)

    return tmp_path
