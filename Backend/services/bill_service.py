# Service: bill_service.py
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.sale import Sale
from models.bill_settings import BillSettings
from models.bill import Bill
from datetime import datetime

async def generate_bill_html(sale: Sale, db: AsyncSession) -> str:
    # 1. Fetch store's BillSettings
    stmt = select(BillSettings).where(BillSettings.store_id == sale.store_id)
    res = await db.execute(stmt)
    settings = res.scalar_one_or_none()
    
    # Resolve fallback default settings using Store details if available
    store = sale.store
    store_name = store.store_name if store else "Optical Store"
    store_email = store.email if store else ""
    store_phone = store.phone if store else ""
    store_address = ""
    if store:
        store_address = f"{store.address}, {store.city}, {store.state} - {store.pincode}"
    store_gst = store.gst_number if store else ""

    header_text = (settings.header_text if settings and settings.header_text else None) or store_name
    sub_header_text = (settings.sub_header_text if settings and settings.sub_header_text else None) or "Tax Invoice / Receipt"
    address = (settings.address if settings and settings.address else None) or store_address
    contact_email = (settings.contact_email if settings and settings.contact_email else None) or store_email
    contact_phone = (settings.contact_phone if settings and settings.contact_phone else None) or store_phone
    gst_number = (settings.gst_number if settings and settings.gst_number else None) or store_gst
    
    show_prescription = settings.show_prescription if settings is not None else True
    show_gst = settings.show_gst if settings is not None else True
    theme_color = (settings.theme_color if settings and settings.theme_color else None) or "#0A0F1F"
    footer_text = (settings.footer_text if settings and settings.footer_text else None) or "Thank you for your business!"
    logo = settings.logo if settings else None
    qr_code = settings.qr_code if settings else None

    # 2. Get customer details
    cust_name = "Walk-in Customer"
    cust_phone = "—"
    cust_address = "—"
    cust_email = ""
    if sale.customer:
        cust_name = f"{sale.customer.first_name} {sale.customer.last_name or ''}".strip()
        cust_phone = sale.customer.phone or "—"
        parts = [sale.customer.address, sale.customer.city]
        cust_address = ", ".join([p for p in parts if p]).strip() or "—"
        cust_email = sale.customer.email or ""

    # Get payments details
    payments_list = sale.payments or []
    payment_method_str = "CASH"
    if payments_list:
        methods = list(set(p.payment_method.value for p in payments_list))
        # Format payment method nicely
        formatted_methods = []
        for m in methods:
            if m == "BANK_TRANSFER":
                formatted_methods.append("Bank Transfer")
            elif m == "LOYALTY_POINTS":
                formatted_methods.append("Loyalty Points")
            else:
                formatted_methods.append(m.title() if hasattr(m, 'title') else str(m))
        payment_method_str = ", ".join(formatted_methods)

    # Outstanding due amount
    remaining_due = sale.due_amount or Decimal("0.00")
    
    # Prescription matrix
    prescription_html = ""
    if show_prescription and sale.prescription:
        p = sale.prescription
        lens_type = p.lens_type or "—"
        frame_pref = p.frame_preference or "—"
        doc_name = p.doctor_name or "—"
        
        right_eye_html = ""
        if p.sph_right or p.cyl_right or p.axis_right:
            right_eye_html = f"""
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); flex: 1; min-width: 120px;">
                <p style="font-size: 8px; font-weight: 800; color: #3b82f6; text-transform: uppercase; margin: 0 0 4px 0; display: flex; align-items: center; gap: 4px;">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background-color: #3b82f6; display: inline-block;"></span> Right Eye (OD)
                </p>
                <div style="display: flex; justify-content: space-between; gap: 4px; font-size: 9px; color: #64748b; font-weight: 600;">
                    <div>SPH: <span style="font-weight: 700; color: #1e293b;">{p.sph_right or '—'}</span></div>
                    <div>CYL: <span style="font-weight: 700; color: #1e293b;">{p.cyl_right or '—'}</span></div>
                    <div>AXIS: <span style="font-weight: 700; color: #1e293b;">{p.axis_right or '—'}</span></div>
                </div>
            </div>
            """
            
        left_eye_html = ""
        if p.sph_left or p.cyl_left or p.axis_left:
            left_eye_html = f"""
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); flex: 1; min-width: 120px;">
                <p style="font-size: 8px; font-weight: 800; color: #10b981; text-transform: uppercase; margin: 0 0 4px 0; display: flex; align-items: center; gap: 4px;">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background-color: #10b981; display: inline-block;"></span> Left Eye (OS)
                </p>
                <div style="display: flex; justify-content: space-between; gap: 4px; font-size: 9px; color: #64748b; font-weight: 600;">
                    <div>SPH: <span style="font-weight: 700; color: #1e293b;">{p.sph_left or '—'}</span></div>
                    <div>CYL: <span style="font-weight: 700; color: #1e293b;">{p.cyl_left or '—'}</span></div>
                    <div>AXIS: <span style="font-weight: 700; color: #1e293b;">{p.axis_left or '—'}</span></div>
                </div>
            </div>
            """
            
        prescription_html = f"""
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-top: 12px; box-sizing: border-box;">
            <h3 style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; display: flex; align-items: center; gap: 6px;">
                Lens & Prescription Details
            </h3>
            <div style="display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 10px; margin-bottom: 8px; font-weight: 600; color: #475569;">
                <div>Lens Type: <span style="color: #0f172a; font-weight: 700;">{lens_type}</span></div>
                <div>Frame Pref: <span style="color: #0f172a; font-weight: 700;">{frame_pref}</span></div>
                <div>Doctor Name: <span style="color: #0f172a; font-weight: 700;">{doc_name}</span></div>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                {right_eye_html}
                {left_eye_html}
            </div>
        </div>
        """

    # Build items table rows
    item_rows = ""
    for item in sale.items:
        snap = item.product_snapshot
        p_name = snap.name if snap else (item.product.name if item.product else "Optical Item")
        p_brand = snap.brand_name if snap else (item.product.brand.name if (item.product and item.product.brand) else "—")
        selected_color = getattr(item, "selected_color", "") or ""
        selected_size = getattr(item, "selected_size", "") or ""
        
        color_size_str = ""
        if p_brand != "—":
            color_size_str += f"{p_brand}"
        if selected_color:
            color_size_str += f" · Color: {selected_color}"
        if selected_size:
            color_size_str += f" · Size: {selected_size}"
            
        item_rows += f"""
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 12px; text-align: left; vertical-align: top;">
                <p style="font-weight: 700; color: #0f172a; margin: 0; font-size: 11px;">{p_name}</p>
                <p style="font-size: 9px; color: #94a3b8; margin: 2px 0 0 0; font-weight: 600;">{color_size_str}</p>
            </td>
            <td style="padding: 10px 12px; text-align: center; font-family: monospace; font-weight: 600; vertical-align: top; font-size: 11px;">{item.quantity}</td>
            <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-weight: 600; vertical-align: top; font-size: 11px;">₹{item.unit_price:,.2f}</td>
            <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a; vertical-align: top; font-size: 11px;">₹{item.line_total:,.2f}</td>
        </tr>
        """

    # QR Code section
    qr_html = ""
    if qr_code:
        qr_html = f"""
        <div style="text-align: left; background-color: #ffffff; border: 1px solid #e2e8f0; padding: 6px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; width: 80px; flex-shrink: 0; box-sizing: border-box;">
            <img src="{qr_code}" alt="Scan to Pay" style="width: 64px; height: 64px; object-fit: contain;" />
            <span style="font-size: 6px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; text-align: center; margin-top: 4px;">Scan to Pay</span>
        </div>
        """

    # Logo section
    logo_html = ""
    if logo:
        logo_html = f'<img src="{logo}" alt="Logo" style="max-height: 40px; max-width: 180px; margin-bottom: 6px; object-fit: contain; display: block;" />'
    else:
        logo_html = """
        <div style="height: 28px; width: 28px; border-radius: 6px; background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
            <svg style="width: 14px; height: 14px; color: #10b981; fill: none; stroke: currentColor; stroke-width: 2;" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
        </div>
        """

    # GST details
    gst_section = ""
    if show_gst and gst_number:
        gst_section = f'<p style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 2px 0 0 0;">GSTIN: {gst_number}</p>'

    # GST calc row
    gst_calc_row = ""
    if show_gst and getattr(sale, "tax_amount", 0) > 0:
        gst_calc_row = f"""
        <div style="display: flex; justify-content: space-between; align-items: center; color: #64748b; margin-bottom: 4px;">
            <span>GST (Tax)</span>
            <span style="font-family: monospace; font-weight: 700;">+ ₹{sale.tax_amount:,.2f}</span>
        </div>
        """

    discount_row = ""
    if getattr(sale, "discount_amount", 0) > 0:
        discount_row = f"""
        <div style="display: flex; justify-content: space-between; align-items: center; color: #ef4444; margin-bottom: 4px;">
            <span>Discounts Applied</span>
            <span style="font-family: monospace; font-weight: 700;">- ₹{sale.discount_amount:,.2f}</span>
        </div>
        """

    date_str = sale.sale_date.strftime("%d %b %Y") if isinstance(sale.sale_date, datetime) or hasattr(sale.sale_date, "strftime") else str(sale.sale_date)

    # Main inner layout styled matching CompletedStep receipt style
    html = f"""
<div class="bill-content-inner" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; border-top: 6px solid {theme_color}; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05); padding: 24px; max-width: 100%; box-sizing: border-box;">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 200px;">
            {logo_html}
            <h2 style="font-size: 15px; font-weight: 900; color: #0f172a; margin: 0; tracking: -0.02em; line-height: 1.2;">{header_text}</h2>
            <p style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 3px 0 0 0;">{sub_header_text}</p>
            <p style="font-size: 9px; color: #64748b; font-weight: 600; margin: 6px 0 0 0; line-height: 1.3; max-w: 240px;">{address}</p>
            <p style="font-size: 8px; color: #94a3b8; font-weight: 600; margin: 4px 0 0 0;">Phone: {contact_phone} &middot; Email: {contact_email}</p>
            {gst_section}
        </div>
        <div style="text-align: right; flex-shrink: 0;">
            <p style="font-size: 10px; font-family: monospace; font-weight: 700; color: #1e293b; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 8px; display: inline-block; margin: 0; line-height: 1;">
                {sale.invoice_number}
            </p>
            <p style="font-size: 9px; color: #94a3b8; font-weight: 700; margin: 6px 0 0 0;">
                Date: {date_str}
            </p>
        </div>
    </div>

    <!-- Customer Details -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; border-bottom: 1px solid #e2e8f0; padding: 16px 0;">
        <div>
            <h3 style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0; display: flex; align-items: center; gap: 4px;">
                Customer Details
            </h3>
            <div style="font-size: 10px; font-weight: 600; color: #475569; line-height: 1.4;">
                <p style="font-weight: 700; color: #0f172a; font-size: 11px; margin: 0 0 2px 0;">{cust_name}</p>
                <p style="margin: 0 0 2px 0;">Phone: {cust_phone}</p>
                {f'<p style="margin: 0 0 2px 0;">Email: {cust_email}</p>' if cust_email else ''}
                <p style="margin: 0;">Address: {cust_address}</p>
            </div>
        </div>
        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; justify-content: flex-start;">
            <h3 style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0; width: 100%;">
                Payment Details
            </h3>
            <div style="font-size: 10px; font-weight: 600; color: #475569; line-height: 1.4; width: 100%;">
                <p style="font-weight: 700; color: #0f172a; margin: 0 0 2px 0;">Paid via: <span style="color: {theme_color}; font-weight: 900;">{payment_method_str}</span></p>
                <p style="margin: 0 0 2px 0;">Outstanding: ₹{remaining_due:,.2f}</p>
                <p style="margin: 0;">Status: <span style="background-color: {theme_color}10; color: {theme_color}; border: 1px solid {theme_color}30; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 800; display: inline-block;">{sale.status.value if hasattr(sale.status, 'value') else str(sale.status)}</span></p>
            </div>
        </div>
    </div>

    <!-- Prescription details -->
    {prescription_html}

    <!-- Items table -->
    <div style="padding-top: 16px;">
        <h3 style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">Items Particulars</h3>
        <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 8px;">
                        <th style="padding: 8px 12px; text-align: left;">Product Description</th>
                        <th style="padding: 8px 12px; text-align: center; width: 40px;">Qty</th>
                        <th style="padding: 8px 12px; text-align: right; width: 80px;">Price</th>
                        <th style="padding: 8px 12px; text-align: right; width: 80px;">Total</th>
                    </tr>
                </thead>
                <tbody style="color: #334155;">
                    {item_rows}
                </tbody>
            </table>
        </div>
    </div>

    <!-- Totals & QR Code -->
    <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-top: 16px; flex-wrap: wrap;">
        <!-- QR Code -->
        {qr_html}
        
        <!-- Calculations -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 180px; max-width: 240px; margin-left: auto; font-size: 10px; font-weight: 600; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; color: #64748b; margin-bottom: 4px;">
                <span>Subtotal</span>
                <span style="font-family: monospace; font-weight: 700;">₹{sale.subtotal:,.2f}</span>
            </div>
            {discount_row}
            {gst_calc_row}
            <div style="display: flex; justify-content: space-between; align-items: center; color: #0f172a; font-weight: 800; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 2px;">
                <span>Final Total</span>
                <span style="font-family: monospace; font-size: 11px; font-weight: 900; color: #0f172a;">₹{sale.total_amount:,.2f}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; color: #10b981; font-weight: 800;">
                <span>Amount Paid</span>
                <span style="font-family: monospace; font-weight: 700;">₹{sale.paid_amount:,.2f}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; color: #d97706; font-weight: 800;">
                <span>Balance Due</span>
                <span style="font-family: monospace; font-weight: 700;">₹{remaining_due:,.2f}</span>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; font-size: 8px; font-weight: 700; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 16px; font-style: italic; letter-spacing: 0.02em;">
        {footer_text}
    </div>
</div>
"""
    return html

async def update_bill_for_sale(db: AsyncSession, sale_id: int) -> Bill:
    stmt = (
        select(Sale)
        .options(
            selectinload(Sale.items),
            selectinload(Sale.payments),
            selectinload(Sale.store),
            selectinload(Sale.customer),
            selectinload(Sale.prescription),
        )
        .where(Sale.id == sale_id)
    )
    res = await db.execute(stmt)
    sale = res.scalar_one_or_none()
    if not sale:
        return None
        
    html = await generate_bill_html(sale, db)
    
    # Check if Bill already exists for this sale
    bill_stmt = select(Bill).where(Bill.sale_id == sale_id)
    bill_res = await db.execute(bill_stmt)
    bill = bill_res.scalar_one_or_none()
    
    if bill:
        bill.html_content = html
    else:
        bill = Bill(
            sale_id=sale_id,
            bill_number=sale.invoice_number,
            html_content=html
        )
        db.add(bill)
        
    await db.commit()
    await db.refresh(bill)
    return bill
