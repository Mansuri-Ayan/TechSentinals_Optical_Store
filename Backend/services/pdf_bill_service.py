# Service: pdf_bill_service.py
import io
from decimal import Decimal
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

from models.repair import Repair
from models.purchase_order import PurchaseOrder
from models.purchase_order_item import PurchaseOrderItem
from models.bill_settings import BillSettings


def _hex_to_color(hex_str: str, default=colors.HexColor("#0A0F1F")):
    if not hex_str:
        return default
    try:
        return colors.HexColor(hex_str)
    except Exception:
        return default


async def generate_repair_pdf(repair: Repair, db: AsyncSession) -> bytes:
    """Generate printable PDF binary for a Repair Bill (Temporary or Final)."""
    # Fetch BillSettings
    stmt = select(BillSettings).where(BillSettings.store_id == repair.store_id)
    res = await db.execute(stmt)
    settings = res.scalar_one_or_none()

    store = repair.store
    store_name = (settings.header_text if settings and settings.header_text else None) or (store.store_name if store else "Optical Store")
    store_address = (settings.address if settings and settings.address else None) or (f"{store.address}, {store.city}, {store.state} - {store.pincode}" if store else "")
    store_phone = (settings.contact_phone if settings and settings.contact_phone else None) or (store.phone if store else "")
    store_email = (settings.contact_email if settings and settings.contact_email else None) or (store.email if store else "")
    store_gst = (settings.gst_number if settings and settings.gst_number else None) or (store.gst_number if store else "")
    theme_hex = (settings.theme_color if settings and settings.theme_color else None) or "#d97706"
    footer_msg = (settings.footer_text if settings and settings.footer_text else None) or "Thank you for trusting us with your repair!"

    theme_color = _hex_to_color(theme_hex, colors.HexColor("#d97706"))

    # Financial calculations
    cost = Decimal(str(repair.final_cost if repair.final_cost is not None else repair.estimated_cost or 0))
    if repair.is_warranty:
        cost = Decimal("0.00")
    advance_paid = Decimal(str(repair.advance_paid or 0))
    due_amount = max(Decimal("0.00"), cost - advance_paid)
    is_final = (due_amount <= Decimal("0.00"))

    # Customer info
    cust_name = repair.customer_name or "Walk-in Customer"
    cust_phone = "—"
    cust_email = ""
    if repair.customer:
        cust_name = f"{repair.customer.first_name} {repair.customer.last_name or ''}".strip()
        cust_phone = repair.customer.phone or "—"
        cust_email = repair.customer.email or ""

    repair_type_val = repair.repair_type.value if hasattr(repair.repair_type, "value") else str(repair.repair_type)
    repair_type_label = repair_type_val.replace("_", " ").title()
    rec_date_str = repair.received_date.strftime("%d %b %Y") if hasattr(repair.received_date, "strftime") else str(repair.received_date)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=18,
        textColor=colors.HexColor("#0f172a"),
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#64748b"),
    )
    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )
    bold_style = ParagraphStyle(
        "DocBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0f172a"),
    )
    banner_style = ParagraphStyle(
        "BannerText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#15803d") if is_final else colors.HexColor("#c2410c"),
    )

    elements = []

    # 1. Status Banner
    banner_text = "FINAL REPAIR INVOICE — PAID IN FULL" if is_final else f"TEMPORARY REPAIR INVOICE — OUTSTANDING BALANCE: ₹{due_amount:,.2f}"
    banner_bg = colors.HexColor("#dcfce7") if is_final else colors.HexColor("#fff7ed")
    banner_border = colors.HexColor("#bbf7d0") if is_final else colors.HexColor("#ffedd5")

    banner_table = Table([[Paragraph(banner_text, banner_style)]], colWidths=[535])
    banner_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), banner_bg),
            ("BOX", (0, 0), (-1, -1), 1, banner_border),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ])
    )
    elements.append(banner_table)
    elements.append(Spacer(1, 12))

    # 2. Header (Store info left, Repair info right)
    header_left = [
        Paragraph(f"<b>{store_name}</b>", title_style),
        Paragraph("Repair & Service Bill / Receipt", subtitle_style),
        Paragraph(store_address, body_style),
        Paragraph(f"Phone: {store_phone} | Email: {store_email}", body_style),
    ]
    if store_gst:
        header_left.append(Paragraph(f"<b>GSTIN:</b> {store_gst}", subtitle_style))

    header_right = [
        Paragraph(f"<b>Repair #:</b> {repair.repair_number}", bold_style),
        Paragraph(f"<b>Date Received:</b> {rec_date_str}", body_style),
        Paragraph(f"<b>Status:</b> {repair.status.value}", body_style),
    ]

    header_table = Table([[header_left, header_right]], colWidths=[350, 185])
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ])
    )
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1, color=theme_color, spaceBefore=4, spaceAfter=10))

    # 3. Customer Info
    cust_info = [
        Paragraph("<b>CUSTOMER DETAILS</b>", subtitle_style),
        Paragraph(f"<b>Name:</b> {cust_name}", body_style),
        Paragraph(f"<b>Phone:</b> {cust_phone}", body_style),
    ]
    if cust_email:
        cust_info.append(Paragraph(f"<b>Email:</b> {cust_email}", body_style))

    pay_method = (getattr(repair, "payment_method", None) or "CASH").upper()

    job_info = [
        Paragraph("<b>JOB DETAILS</b>", subtitle_style),
        Paragraph(f"<b>Service Type:</b> {repair_type_label}", body_style),
        Paragraph(f"<b>Warranty Covered:</b> {'Yes (Free)' if repair.is_warranty else 'No'}", body_style),
        Paragraph(f"<b>Payment Method:</b> {pay_method}", body_style),
    ]

    cust_job_table = Table([[cust_info, job_info]], colWidths=[270, 265])
    cust_job_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(cust_job_table)
    elements.append(Spacer(1, 12))

    # 4. Item Particulars Table
    table_data = [
        [
            Paragraph("<b>Service Description</b>", subtitle_style),
            Paragraph("<b>Qty</b>", ParagraphStyle("TC", parent=subtitle_style, alignment=TA_CENTER)),
            Paragraph("<b>Amount</b>", ParagraphStyle("TR", parent=subtitle_style, alignment=TA_RIGHT)),
        ]
    ]

    desc_text = repair.description or "Standard optical repair & servicing job."
    if getattr(repair, "product_unit", None):
        desc_text += f"<br/><font size=8 color='#64748b'>Physical Unit SKU: {repair.product_unit.unit_sku}</font>"

    table_data.append([
        Paragraph(f"<b>{repair_type_label}</b><br/>{desc_text}", body_style),
        Paragraph("1", ParagraphStyle("C", parent=body_style, alignment=TA_CENTER)),
        Paragraph(f"₹{cost:,.2f}", ParagraphStyle("R", parent=bold_style, alignment=TA_RIGHT)),
    ])

    items_table = Table(table_data, colWidths=[355, 60, 120])
    items_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("PADDING", (0, 1), (-1, -1), 8),
        ])
    )
    elements.append(items_table)
    elements.append(Spacer(1, 12))

    # 5. Financial Summary
    summary_data = [
        [Paragraph("<b>Total Repair Cost</b>", body_style), Paragraph(f"₹{cost:,.2f}", ParagraphStyle("R", parent=bold_style, alignment=TA_RIGHT))],
        [Paragraph("<b>Advance Paid</b>", body_style), Paragraph(f"₹{advance_paid:,.2f}", ParagraphStyle("R", parent=bold_style, alignment=TA_RIGHT))],
        [Paragraph("<b>Balance Due</b>", bold_style), Paragraph(f"₹{due_amount:,.2f}", ParagraphStyle("R", parent=bold_style, alignment=TA_RIGHT))],
    ]

    summary_table = Table(summary_data, colWidths=[140, 100])
    summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
            ("PADDING", (0, 0), (-1, -1), 6),
        ])
    )

    right_wrap = Table([[None, summary_table]], colWidths=[295, 240])
    right_wrap.setStyle(TableStyle([("ALIGN", (1, 0), (1, 0), "RIGHT")]))
    elements.append(right_wrap)
    elements.append(Spacer(1, 20))

    # 6. Footer
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0"), spaceBefore=10, spaceAfter=10))
    elements.append(Paragraph(footer_msg, ParagraphStyle("Footer", parent=body_style, fontName="Helvetica-Oblique", alignment=TA_CENTER, textColor=colors.HexColor("#94a3b8"))))

    doc.build(elements)
    return buffer.getvalue()


async def generate_po_invoice_pdf(po: PurchaseOrder, db: AsyncSession) -> bytes:
    """Generate printable PDF binary for a Supplier B2B Purchase Invoice (Temporary or Final)."""
    # Fetch BillSettings for store
    stmt = select(BillSettings).where(BillSettings.store_id == po.store_id)
    res = await db.execute(stmt)
    settings = res.scalar_one_or_none()

    store = po.store
    store_name = (settings.header_text if settings and settings.header_text else None) or (store.store_name if store else "Optical Store Management")
    store_address = (settings.address if settings and settings.address else None) or (f"{store.address}, {store.city}, {store.state} - {store.pincode}" if store else "Central Distribution Warehouse")
    store_phone = (settings.contact_phone if settings and settings.contact_phone else None) or (store.phone if store else "")
    store_email = (settings.contact_email if settings and settings.contact_email else None) or (store.email if store else "")
    store_gst = (settings.gst_number if settings and settings.gst_number else None) or (store.gst_number if store else "")
    theme_hex = (settings.theme_color if settings and settings.theme_color else None) or "#0f172a"
    footer_msg = (settings.footer_text if settings and settings.footer_text else None) or "Optical Store Management System · Supplier Purchase Invoice"

    theme_color = _hex_to_color(theme_hex, colors.HexColor("#0f172a"))

    is_final = (po.due_amount <= Decimal("0.00"))

    supplier = po.supplier
    supplier_name = getattr(supplier, "company_name", None) or getattr(supplier, "supplier_name", None) or "Supplier"
    supplier_phone = supplier.phone if supplier else "—"
    supplier_email = supplier.email if supplier else ""
    supplier_address = supplier.address if supplier else "—"
    supplier_gst = getattr(supplier, "gst_number", "") or ""

    order_date_str = po.order_date.strftime("%d %b %Y") if hasattr(po.order_date, "strftime") else str(po.order_date)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#0f172a"),
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#64748b"),
    )
    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )
    bold_style = ParagraphStyle(
        "DocBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0f172a"),
    )
    banner_style = ParagraphStyle(
        "BannerText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#15803d") if is_final else colors.HexColor("#c2410c"),
    )

    elements = []

    # 1. Status Banner
    banner_text = "FINAL PURCHASE INVOICE — PAID IN FULL" if is_final else f"TEMPORARY PURCHASE INVOICE — OUTSTANDING BALANCE: ₹{po.due_amount:,.2f}"
    banner_bg = colors.HexColor("#dcfce7") if is_final else colors.HexColor("#fff7ed")
    banner_border = colors.HexColor("#bbf7d0") if is_final else colors.HexColor("#ffedd5")

    banner_table = Table([[Paragraph(banner_text, banner_style)]], colWidths=[535])
    banner_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), banner_bg),
            ("BOX", (0, 0), (-1, -1), 1, banner_border),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ])
    )
    elements.append(banner_table)
    elements.append(Spacer(1, 12))

    # 2. Header
    header_left = [
        Paragraph(f"<b>{store_name}</b>", title_style),
        Paragraph("B2B Supplier Purchase Invoice", subtitle_style),
        Paragraph(store_address, body_style),
        Paragraph(f"Phone: {store_phone} | Email: {store_email}", body_style),
    ]
    if store_gst:
        header_left.append(Paragraph(f"<b>GSTIN:</b> {store_gst}", subtitle_style))

    header_right = [
        Paragraph(f"<b>PO Number:</b> {po.po_number}", bold_style),
        Paragraph(f"<b>Order Date:</b> {order_date_str}", body_style),
        Paragraph(f"<b>PO Status:</b> {po.status.value}", body_style),
    ]
    if po.invoice_number:
        header_right.append(Paragraph(f"<b>Supplier Ref:</b> {po.invoice_number}", body_style))

    header_table = Table([[header_left, header_right]], colWidths=[350, 185])
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ])
    )
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1, color=theme_color, spaceBefore=4, spaceAfter=10))

    # 3. Supplier Details
    supplier_info = [
        Paragraph("<b>SUPPLIER DETAILS</b>", subtitle_style),
        Paragraph(f"<b>{supplier_name}</b>", bold_style),
        Paragraph(f"Phone: {supplier_phone} | Email: {supplier_email}", body_style),
        Paragraph(f"Address: {supplier_address}", body_style),
    ]
    if supplier_gst:
        supplier_info.append(Paragraph(f"<b>Supplier GSTIN:</b> {supplier_gst}", body_style))

    supp_table = Table([[supplier_info]], colWidths=[535])
    supp_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(supp_table)
    elements.append(Spacer(1, 12))

    # 4. Items Table
    table_data = [
        [
            Paragraph("<b>Product Particulars</b>", subtitle_style),
            Paragraph("<b>Qty</b>", ParagraphStyle("TC", parent=subtitle_style, alignment=TA_CENTER)),
            Paragraph("<b>Cost (Excl. GST)</b>", ParagraphStyle("TR", parent=subtitle_style, alignment=TA_RIGHT)),
            Paragraph("<b>Tax %</b>", ParagraphStyle("TC", parent=subtitle_style, alignment=TA_CENTER)),
            Paragraph("<b>Line Total</b>", ParagraphStyle("TR", parent=subtitle_style, alignment=TA_RIGHT)),
        ]
    ]

    for item in po.items:
        snap = getattr(item, "product_snapshot", None)
        p_name = snap.name if snap else (item.product.name if item.product else "Product")
        p_sku = snap.sku if snap else (item.product.sku if item.product else "N/A")
        p_brand = snap.brand_name if snap else (item.product.brand.name if (item.product and item.product.brand) else "—")

        unit_cost = item.unit_price or Decimal("0.00")
        qty = item.quantity_ordered or 0
        tax_pct = item.tax_percent or Decimal("0.00")
        line_tot = item.line_total or Decimal("0.00")

        table_data.append([
            Paragraph(f"<b>{p_name}</b><br/><font size=8 color='#64748b'>Brand: {p_brand} | SKU: {p_sku}</font>", body_style),
            Paragraph(str(qty), ParagraphStyle("C", parent=body_style, alignment=TA_CENTER)),
            Paragraph(f"₹{unit_cost:,.2f}", ParagraphStyle("R", parent=body_style, alignment=TA_RIGHT)),
            Paragraph(f"{tax_pct}%", ParagraphStyle("C", parent=body_style, alignment=TA_CENTER)),
            Paragraph(f"₹{line_tot:,.2f}", ParagraphStyle("R", parent=bold_style, alignment=TA_RIGHT)),
        ])

    items_table = Table(table_data, colWidths=[245, 45, 75, 50, 120])
    items_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("PADDING", (0, 1), (-1, -1), 6),
        ])
    )
    elements.append(items_table)
    elements.append(Spacer(1, 12))

    # 5. Summary Box
    summary_data = [
        [Paragraph("<b>Subtotal (Before GST)</b>", body_style), Paragraph(f"₹{po.subtotal:,.2f}", ParagraphStyle("R", parent=body_style, alignment=TA_RIGHT))],
    ]
    if po.tax_amount > 0:
        summary_data.append([Paragraph("<b>GST Tax</b>", body_style), Paragraph(f"+ ₹{po.tax_amount:,.2f}", ParagraphStyle("R", parent=body_style, alignment=TA_RIGHT))])
    if po.discount_amount > 0:
        summary_data.append([Paragraph("<b>Discount</b>", body_style), Paragraph(f"- ₹{po.discount_amount:,.2f}", ParagraphStyle("R", parent=body_style, alignment=TA_RIGHT))])

    summary_data.append([Paragraph("<b>Grand Total (Incl. GST)</b>", bold_style), Paragraph(f"₹{po.total_amount:,.2f}", ParagraphStyle("R", parent=bold_style, alignment=TA_RIGHT))])
    summary_data.append([Paragraph("<b>Amount Paid</b>", body_style), Paragraph(f"₹{po.paid_amount:,.2f}", ParagraphStyle("R", parent=body_style, alignment=TA_RIGHT))])
    summary_data.append([Paragraph("<b>Outstanding Balance</b>", bold_style), Paragraph(f"₹{po.due_amount:,.2f}", ParagraphStyle("R", parent=bold_style, alignment=TA_RIGHT))])

    summary_table = Table(summary_data, colWidths=[140, 100])
    summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ])
    )

    right_wrap = Table([[None, summary_table]], colWidths=[295, 240])
    right_wrap.setStyle(TableStyle([("ALIGN", (1, 0), (1, 0), "RIGHT")]))
    elements.append(right_wrap)
    elements.append(Spacer(1, 20))

    # 6. Footer
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0"), spaceBefore=10, spaceAfter=10))
    elements.append(Paragraph(footer_msg, ParagraphStyle("Footer", parent=body_style, fontName="Helvetica-Oblique", alignment=TA_CENTER, textColor=colors.HexColor("#94a3b8"))))

    doc.build(elements)
    return buffer.getvalue()
