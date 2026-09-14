# Service: bill_service.py
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.sale import Sale, SaleStatus
from models.bill import Bill
from models.bill_settings import BillSettings
from models.loyalty_transaction import LoyaltyTransaction, LoyaltyTransactionType
from models.repair import Repair
from models.repair_bill import RepairBill
from models.purchase_order import PurchaseOrder
from models.purchase_order_item import PurchaseOrderItem
from models.purchase_order_invoice import PurchaseOrderInvoice
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

    # 2. Get customer details – bill is addressed to the billing account if set, else the buyer
    bill_cust = getattr(sale, "billing_account_customer", None) or sale.customer
    cust_name = "Walk-in Customer"
    cust_phone = "—"
    cust_address = "—"
    cust_email = ""
    if bill_cust:
        cust_name = f"{bill_cust.first_name} {bill_cust.last_name or ''}".strip()
        cust_phone = bill_cust.phone or "—"
        parts = [bill_cust.address, bill_cust.city]
        cust_address = ", ".join([p for p in parts if p]).strip() or "—"
        cust_email = bill_cust.email or ""

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
    has_deadstock_items = False
    for item in sale.items:
        snap = item.product_snapshot
        p_name = snap.name if snap else (item.product.name if item.product else "Optical Item")
        p_brand = snap.brand_name if snap else (item.product.brand.name if (item.product and item.product.brand) else "—")
        selected_color = getattr(item, "selected_color", "") or ""
        selected_size = getattr(item, "selected_size", "") or ""
        
        is_deadstock = getattr(item, "deadstock_item_id", None) is not None
        if is_deadstock:
            has_deadstock_items = True

        color_size_str = ""
        if p_brand != "—":
            color_size_str += f"{p_brand}"
        if selected_color:
            color_size_str += f" · Color: {selected_color}"
        if selected_size:
            color_size_str += f" · Size: {selected_size}"
        if is_deadstock:
            color_size_str += " · <span style='color: #d97706; font-weight: 800;'>Exchanged Deadstock Item</span>"
            
        deadstock_badge = ""
        if is_deadstock:
            deadstock_badge = " <span style='background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 1px 5px; border-radius: 4px; font-size: 8px; font-weight: 800;'>DEADSTOCK</span>"

        proc_badge = ""
        proc_type = getattr(item, "processing_type", None)
        if proc_type == "DIRECT":
            proc_badge = " <span style='background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 1px 5px; border-radius: 4px; font-size: 8px; font-weight: 800;'>⚡ DIRECT</span>"
        elif proc_type == "ORDER":
            proc_badge = " <span style='background-color: #faf5ff; color: #7e22ce; border: 1px solid #e9d5ff; padding: 1px 5px; border-radius: 4px; font-size: 8px; font-weight: 800;'>📋 LAB ORDER</span>"

        item_rows += f"""
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 12px; text-align: left; vertical-align: top;">
                <p style="font-weight: 700; color: #0f172a; margin: 0; font-size: 11px;">{p_name}{deadstock_badge}{proc_badge}</p>
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

    # Outstanding due amount
    if getattr(sale, "status", None) == SaleStatus.COMPLETED or (getattr(sale, "due_amount", None) is not None and sale.due_amount <= 0):
        remaining_due = Decimal("0.00")
    else:
        remaining_due = sale.due_amount or Decimal("0.00")

    # Fetch loyalty discount from LoyaltyTransaction table
    loyalty_discount = Decimal("0.00")
    if sale.id:
        txn_stmt = select(LoyaltyTransaction).where(
            LoyaltyTransaction.sale_id == sale.id,
            LoyaltyTransaction.type == LoyaltyTransactionType.REDEEMED
        )
        txn_res = await db.execute(txn_stmt)
        txns = txn_res.scalars().all()
        for t in txns:
            if t.rupee_value:
                loyalty_discount += Decimal(str(t.rupee_value))

    total_discount_in_db = Decimal(str(getattr(sale, "discount_amount", 0) or 0))
    direct_discount = max(Decimal("0.00"), total_discount_in_db - loyalty_discount)

    direct_discount_row = ""
    if direct_discount > 0:
        direct_discount_row = f"""
        <div style="display: flex; justify-content: space-between; align-items: center; color: #ef4444; margin-bottom: 4px;">
            <span>Direct Discount</span>
            <span style="font-family: monospace; font-weight: 700;">- ₹{direct_discount:,.2f}</span>
        </div>
        """

    loyalty_discount_row = ""
    if loyalty_discount > 0:
        loyalty_discount_row = f"""
        <div style="display: flex; justify-content: space-between; align-items: center; color: #ef4444; margin-bottom: 4px;">
            <span>Loyalty Points Discount</span>
            <span style="font-family: monospace; font-weight: 700;">- ₹{loyalty_discount:,.2f}</span>
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
                <span>Subtotal (Before GST)</span>
                <span style="font-family: monospace; font-weight: 700;">₹{sale.subtotal:,.2f}</span>
            </div>
            {direct_discount_row}
            {loyalty_discount_row}
            {gst_calc_row}
            <div style="display: flex; justify-content: space-between; align-items: center; color: #0f172a; font-weight: 800; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 2px;">
                <span>Final Total (Incl. GST)</span>
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

async def generate_exchange_bill_html(exchange, db: AsyncSession) -> str:
    # 1. Fetch store's BillSettings
    stmt = select(BillSettings).where(BillSettings.store_id == exchange.store_id)
    res = await db.execute(stmt)
    settings = res.scalar_one_or_none()
    
    # Resolve fallback default settings using Store details if available
    store = exchange.store
    store_name = store.store_name if store else "Optical Store"
    store_email = store.email if store else ""
    store_phone = store.phone if store else ""
    store_address = ""
    if store:
        store_address = f"{store.address}, {store.city}, {store.state} - {store.pincode}"
    store_gst = store.gst_number if store else ""

    header_text = (settings.header_text if settings and settings.header_text else None) or store_name
    sub_header_text = "Inventory Exchange Receipt"
    address = (settings.address if settings and settings.address else None) or store_address
    contact_email = (settings.contact_email if settings and settings.contact_email else None) or store_email
    contact_phone = (settings.contact_phone if settings and settings.contact_phone else None) or store_phone
    gst_number = (settings.gst_number if settings and settings.gst_number else None) or store_gst
    
    theme_color = (settings.theme_color if settings and settings.theme_color else None) or "#3b82f6"  # blue/indigo for exchanges
    footer_text = (settings.footer_text if settings and settings.footer_text else None) or "Thank you for shopping with us!"
    logo = settings.logo if settings else None

    # 2. Get customer details
    cust_name = "Walk-in Customer"
    cust_phone = "—"
    cust_address = "—"
    cust_email = ""
    if exchange.customer:
        cust_name = f"{exchange.customer.first_name} {exchange.customer.last_name or ''}".strip()
        cust_phone = exchange.customer.phone or "—"
        parts = [exchange.customer.address, exchange.customer.city]
        cust_address = ", ".join([p for p in parts if p]).strip() or "—"
        cust_email = exchange.customer.email or ""

    # Original returned item details
    orig_item = exchange.original_sale_item
    orig_snap = orig_item.product_snapshot if orig_item else None
    orig_prod_name = orig_snap.name if orig_snap else (orig_item.product.name if (orig_item and orig_item.product) else "Optical Item")
    orig_prod_sku = orig_snap.sku if orig_snap else (orig_item.product.sku if (orig_item and orig_item.product) else "N/A")
    orig_invoice = exchange.original_sale.invoice_number if exchange.original_sale else "N/A"
    orig_value = exchange.original_item_value

    # Build new replacement items rows
    item_rows = ""
    new_sale = exchange.new_sale
    if new_sale and new_sale.items:
        for item in new_sale.items:
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

    # Logo section
    logo_html = ""
    if logo:
        logo_html = f'<img src="{logo}" alt="Logo" style="max-height: 40px; max-width: 180px; margin-bottom: 6px; object-fit: contain; display: block;" />'
    else:
        logo_html = """
        <div style="height: 28px; width: 28px; border-radius: 6px; background-color: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
            <svg style="width: 14px; height: 14px; color: #3b82f6; fill: none; stroke: currentColor; stroke-width: 2;" viewBox="0 0 24 24">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
        </div>
        """

    # GST details
    gst_section = ""
    if gst_number:
        gst_section = f'<p style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 2px 0 0 0;">GSTIN: {gst_number}</p>'

    date_str = exchange.exchange_date.strftime("%d %b %Y") if isinstance(exchange.exchange_date, datetime) or hasattr(exchange.exchange_date, "strftime") else str(exchange.exchange_date)

    # Main inner layout styled matching exchange receipt style
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
                {exchange.exchange_number}
            </p>
            <p style="font-size: 9px; color: #94a3b8; font-weight: 700; margin: 6px 0 0 0;">
                Date: {date_str}
            </p>
        </div>
    </div>

    <!-- Customer Details -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; border-bottom: 1px solid #e2e8f0; padding: 16px 0;">
        <div>
            <h3 style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0;">
                Customer Details
            </h3>
            <div style="font-size: 10px; font-weight: 600; color: #475569; line-height: 1.4;">
                <p style="font-weight: 700; color: #0f172a; font-size: 11px; margin: 0 0 2px 0;">{cust_name}</p>
                <p style="margin: 0 0 2px 0;">Phone: {cust_phone}</p>
                {f'<p style="margin: 0 0 2px 0;">Email: {cust_email}</p>' if cust_email else ''}
                <p style="margin: 0;">Address: {cust_address}</p>
            </div>
        </div>
        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
            <h3 style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0; width: 100%;">
                Exchange Reference
            </h3>
            <div style="font-size: 10px; font-weight: 600; color: #475569; line-height: 1.4; width: 100%;">
                <p style="margin: 0 0 2px 0;">Original Invoice: <span style="font-weight: 700; color: #0f172a;">{orig_invoice}</span></p>
                <p style="margin: 0 0 2px 0;">Replacement Invoice: <span style="font-weight: 700; color: #0f172a;">{new_sale.invoice_number if new_sale else '—'}</span></p>
                <p style="margin: 0;">Status: <span style="background-color: {theme_color}10; color: {theme_color}; border: 1px solid {theme_color}30; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 800; display: inline-block;">{exchange.status.value}</span></p>
            </div>
        </div>
    </div>

    <!-- Original Returned Item Panel -->
    <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 12px; margin-top: 16px;">
        <h3 style="font-size: 8px; font-weight: 800; color: #ef4444; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0; display: flex; align-items: center; gap: 4px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background-color: #ef4444; display: inline-block;"></span> Returned Item (From Original Purchase)
        </h3>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 600; color: #475569;">
            <div>
                <p style="font-weight: 700; color: #0f172a; margin: 0;">{orig_prod_name}</p>
                <p style="font-size: 8px; color: #94a3b8; margin: 2px 0 0 0;">SKU: {orig_prod_sku}</p>
            </div>
            <div style="text-align: right;">
                <p style="font-size: 8px; color: #94a3b8; margin: 0 0 2px 0;">Exchange Credit Value</p>
                <p style="font-family: monospace; font-weight: 800; color: #ef4444; margin: 0; font-size: 11px;">₹{orig_value:,.2f}</p>
            </div>
        </div>
    </div>

    <!-- Replacement Items Particulars -->
    <div style="padding-top: 16px;">
        <h3 style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">Replacement Items Particulars</h3>
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

    <!-- Totals -->
    <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 4px; width: 100%; max-width: 240px; font-size: 10px; font-weight: 600; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; color: #64748b; margin-bottom: 4px;">
                <span>New Items Subtotal</span>
                <span style="font-family: monospace; font-weight: 700;">₹{exchange.new_items_total:,.2f}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; color: #ef4444; margin-bottom: 4px;">
                <span>Exchange Credit</span>
                <span style="font-family: monospace; font-weight: 700;">- ₹{exchange.exchange_credit:,.2f}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; color: #0f172a; font-weight: 800; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 2px;">
                <span>Additional Paid</span>
                <span style="font-family: monospace; font-size: 11px; font-weight: 900; color: #0f172a;">₹{exchange.additional_payment:,.2f}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; color: #10b981; font-weight: 800;">
                <span>Amount Paid</span>
                <span style="font-family: monospace; font-weight: 700;">₹{exchange.additional_payment:,.2f}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; color: #64748b; font-weight: 800;">
                <span>Balance Due</span>
                <span style="font-family: monospace; font-weight: 700;">₹0.00</span>
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


async def update_bill_for_sale(db: AsyncSession, sale_id: int, commit: bool = True) -> Bill:
    stmt = (
        select(Sale)
        .options(
            selectinload(Sale.items),
            selectinload(Sale.payments),
            selectinload(Sale.store),
            selectinload(Sale.customer),
            selectinload(Sale.billing_account_customer),
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
        
    if commit:
        await db.commit()
        await db.refresh(bill)
    else:
        await db.flush()
    return bill


async def generate_repair_bill_html(repair: Repair, db: AsyncSession) -> str:
    # Fetch store's BillSettings
    stmt = select(BillSettings).where(BillSettings.store_id == repair.store_id)
    res = await db.execute(stmt)
    settings = res.scalar_one_or_none()

    store = repair.store
    store_name = store.store_name if store else "Optical Store"
    store_email = store.email if store else ""
    store_phone = store.phone if store else ""
    store_address = f"{store.address}, {store.city}, {store.state} - {store.pincode}" if store else ""
    store_gst = store.gst_number if store else ""

    header_text = (settings.header_text if settings and settings.header_text else None) or store_name
    sub_header_text = "Repair & Service Bill / Receipt"
    address = (settings.address if settings and settings.address else None) or store_address
    contact_email = (settings.contact_email if settings and settings.contact_email else None) or store_email
    contact_phone = (settings.contact_phone if settings and settings.contact_phone else None) or store_phone
    gst_number = (settings.gst_number if settings and settings.gst_number else None) or store_gst
    theme_color = (settings.theme_color if settings and settings.theme_color else None) or "#d97706"
    footer_text = (settings.footer_text if settings and settings.footer_text else None) or "Thank you for trusting us with your repair!"
    logo = settings.logo if settings else None

    # Customer details
    cust_name = repair.customer_name or "Walk-in Customer"
    cust_phone = "—"
    cust_address = "—"
    cust_email = ""
    if repair.customer:
        cust_name = f"{repair.customer.first_name} {repair.customer.last_name or ''}".strip()
        cust_phone = repair.customer.phone or "—"
        parts = [repair.customer.address, repair.customer.city]
        cust_address = ", ".join([p for p in parts if p]).strip() or "—"
        cust_email = repair.customer.email or ""

    cost = Decimal(str(repair.final_cost if repair.final_cost is not None else repair.estimated_cost or 0))
    if repair.is_warranty:
        cost = Decimal("0.00")

    advance_paid = Decimal(str(repair.advance_paid or 0))
    due_amount = max(Decimal("0.00"), cost - advance_paid)
    is_final = (due_amount <= Decimal("0.00"))

    if is_final:
        banner_text = "FINAL REPAIR INVOICE — PAID IN FULL"
        badge_style = "background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;"
    else:
        banner_text = f"TEMPORARY REPAIR INVOICE — OUTSTANDING BALANCE: ₹{due_amount:,.2f}"
        badge_style = "background-color: #fff7ed; color: #c2410c; border: 1px solid #ffedd5;"

    repair_type_val = repair.repair_type.value if hasattr(repair.repair_type, 'value') else str(repair.repair_type)
    repair_type_label = repair_type_val.replace('_', ' ').title()

    repair_status_val = repair.status.value if hasattr(repair.status, 'value') else str(repair.status)
    repair_status_label = repair_status_val.replace('_', ' ').title()
    pay_method = (getattr(repair, "payment_method", None) or "CASH").upper()

    warranty_badge = ""
    if repair.is_warranty:
        warranty_badge = "<span style='background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: 800;'>WARRANTY COVERED (FREE)</span>"

    rec_date_str = repair.received_date.strftime("%d %b %Y") if hasattr(repair.received_date, "strftime") else str(repair.received_date)

    logo_html = f'<img src="{logo}" alt="Logo" style="max-height: 40px; max-width: 180px; margin-bottom: 6px; object-fit: contain; display: block;" />' if logo else """
        <div style="height: 28px; width: 28px; border-radius: 6px; background-color: rgba(217, 119, 6, 0.1); border: 1px solid rgba(217, 119, 6, 0.25); display: flex; align-items: center; justify-content: center; margin-bottom: 6px;">
            <svg style="width: 14px; height: 14px; color: #d97706; fill: none; stroke: currentColor; stroke-width: 2;" viewBox="0 0 24 24">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
        </div>
    """

    gst_section = f'<p style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 2px 0 0 0;">GSTIN: {gst_number}</p>' if gst_number else ''

    unit_sku_str = getattr(repair.product_unit, "unit_sku", None) if getattr(repair, "product_unit", None) else None

    html = f"""
<div class="bill-content-inner" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; border-top: 6px solid {theme_color}; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05); padding: 24px; max-width: 100%; box-sizing: border-box;">
    <!-- Status Banner -->
    <div style="margin-bottom: 16px; text-align: center;">
        <span style="display: inline-block; padding: 4px 16px; border-radius: 8px; font-size: 11px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; {badge_style}">
            {banner_text}
        </span>
    </div>

    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 200px;">
            {logo_html}
            <h2 style="font-size: 15px; font-weight: 900; color: #0f172a; margin: 0; line-height: 1.2;">{header_text}</h2>
            <p style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 3px 0 0 0;">{sub_header_text}</p>
            <p style="font-size: 9px; color: #64748b; font-weight: 600; margin: 6px 0 0 0; line-height: 1.3;">{address}</p>
            <p style="font-size: 8px; color: #94a3b8; font-weight: 600; margin: 4px 0 0 0;">Phone: {contact_phone} &middot; Email: {contact_email}</p>
            {gst_section}
        </div>
        <div style="text-align: right; flex-shrink: 0;">
            <p style="font-size: 10px; font-family: monospace; font-weight: 700; color: #1e293b; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 8px; display: inline-block; margin: 0; line-height: 1;">
                {repair.repair_number}
            </p>
            <p style="font-size: 9px; color: #94a3b8; font-weight: 700; margin: 6px 0 0 0;">
                Date Received: {rec_date_str}
            </p>
        </div>
    </div>

    <!-- Customer & Status Details -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; border-bottom: 1px solid #e2e8f0; padding: 16px 0;">
        <div>
            <h3 style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0;">Customer Details</h3>
            <div style="font-size: 10px; font-weight: 600; color: #475569; line-height: 1.4;">
                <p style="font-weight: 700; color: #0f172a; font-size: 11px; margin: 0 0 2px 0;">{cust_name}</p>
                <p style="margin: 0 0 2px 0;">Phone: {cust_phone}</p>
                {f'<p style="margin: 0 0 2px 0;">Email: {cust_email}</p>' if cust_email else ''}
                <p style="margin: 0;">Address: {cust_address}</p>
            </div>
        </div>
        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
            <h3 style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0; width: 100%;">Job Status</h3>
            <div style="font-size: 10px; font-weight: 600; color: #475569; line-height: 1.4; width: 100%;">
                <p style="margin: 0 0 4px 0;">Type: <span style="font-weight: 700; color: #0f172a;">{repair_type_label}</span></p>
                <p style="margin: 0 0 4px 0;">Status: <span style="background-color: {theme_color}10; color: {theme_color}; border: 1px solid {theme_color}30; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 800; display: inline-block;">{repair_status_label}</span></p>
                <p style="margin: 0 0 4px 0;">Payment Method: <span style="font-weight: 800; color: #0f172a;">{pay_method}</span></p>
                {f'<div style="margin-top: 4px;">{warranty_badge}</div>' if warranty_badge else ''}
            </div>
        </div>
    </div>

    <!-- Particulars -->
    <div style="padding-top: 16px;">
        <h3 style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">Repair Particulars</h3>
        <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 8px;">
                        <th style="padding: 8px 12px; text-align: left;">Service / Job Description</th>
                        <th style="padding: 8px 12px; text-align: center; width: 40px;">Qty</th>
                        <th style="padding: 8px 12px; text-align: right; width: 100px;">Amount</th>
                    </tr>
                </thead>
                <tbody style="color: #334155;">
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 12px; text-align: left; vertical-align: top;">
                            <p style="font-weight: 700; color: #0f172a; margin: 0; font-size: 11px;">{repair_type_label}</p>
                            <p style="font-size: 9px; color: #64748b; margin: 2px 0 0 0;">{repair.description or 'Standard repair & servicing job.'}</p>
                            {f'<p style="font-size: 8px; color: #94a3b8; margin: 2px 0 0 0;">Unit SKU: {unit_sku_str}</p>' if unit_sku_str else ''}
                        </td>
                        <td style="padding: 10px 12px; text-align: center; font-family: monospace; font-weight: 600; vertical-align: top; font-size: 11px;">1</td>
                        <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a; vertical-align: top; font-size: 11px;">₹{cost:,.2f}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Summary Box -->
    <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 4px; width: 100%; max-width: 240px; font-size: 10px; font-weight: 600; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; color: #0f172a; font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                <span>Total Cost</span>
                <span style="font-family: monospace; font-size: 11px; font-weight: 900; color: #0f172a;">₹{cost:,.2f}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; color: #10b981; font-weight: 800; margin-top: 2px;">
                <span>Advance Paid</span>
                <span style="font-family: monospace; font-weight: 700;">₹{advance_paid:,.2f}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; color: #d97706; font-weight: 800;">
                <span>Balance Due</span>
                <span style="font-family: monospace; font-weight: 700;">₹{due_amount:,.2f}</span>
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


async def update_bill_for_repair(db: AsyncSession, repair_id: int, commit: bool = True) -> RepairBill:
    stmt = (
        select(Repair)
        .options(
            selectinload(Repair.store),
            selectinload(Repair.customer),
            selectinload(Repair.product_unit),
        )
        .where(Repair.id == repair_id)
    )
    res = await db.execute(stmt)
    repair = res.scalar_one_or_none()
    if not repair:
        return None

    html = await generate_repair_bill_html(repair, db)

    bill_stmt = select(RepairBill).where(RepairBill.repair_id == repair_id)
    bill_res = await db.execute(bill_stmt)
    bill = bill_res.scalar_one_or_none()

    if bill:
        bill.html_content = html
    else:
        bill = RepairBill(
            repair_id=repair_id,
            bill_number=repair.repair_number,
            html_content=html,
        )
        db.add(bill)

    if commit:
        await db.commit()
        await db.refresh(bill)
    else:
        await db.flush()
    return bill


async def generate_po_invoice_html(po: PurchaseOrder, db: AsyncSession) -> str:
    store = po.store
    purchaser_name = store.store_name if store else "Central Warehouse (Admin)"
    purchaser_email = store.email if store else ""
    purchaser_phone = store.phone if store else ""
    purchaser_address = f"{store.address}, {store.city}, {store.state} - {store.pincode}" if store else "Main Distribution Warehouse"
    purchaser_gst = store.gst_number if store else ""

    supplier = po.supplier
    supplier_name = getattr(supplier, "company_name", None) or getattr(supplier, "supplier_name", None) or "Supplier"
    supplier_contact = getattr(supplier, "contact_person", "") or ""
    supplier_phone = supplier.phone or "—"
    supplier_email = supplier.email or ""
    supplier_address = supplier.address or "—"
    supplier_gst = getattr(supplier, "gst_number", "") or ""

    is_final = (po.due_amount <= Decimal("0.00"))

    if is_final:
        invoice_title = "FINAL PURCHASE INVOICE"
        badge_style = "background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;"
        badge_text = "FINAL INVOICE — PAID IN FULL"
    else:
        invoice_title = "TEMPORARY PURCHASE INVOICE"
        badge_style = "background-color: #fff7ed; color: #c2410c; border: 1px solid #ffedd5;"
        badge_text = f"TEMPORARY INVOICE — OUTSTANDING BALANCE: ₹{po.due_amount:,.2f}"

    item_rows = ""
    for item in po.items:
        snap = getattr(item, "product_snapshot", None)
        p_name = snap.name if snap else (item.product.name if item.product else "Product")
        p_sku = snap.sku if snap else (item.product.sku if item.product else "N/A")
        p_brand = snap.brand_name if snap else (item.product.brand.name if (item.product and item.product.brand) else "—")

        tax_pct = item.tax_percent or Decimal("0.00")
        disc_pct = item.discount_percent or Decimal("0.00")
        unit_price = item.unit_price or Decimal("0.00")
        qty = item.quantity_ordered or 0
        line_total = item.line_total or Decimal("0.00")

        item_rows += f"""
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 12px; text-align: left; vertical-align: top;">
                <p style="font-weight: 700; color: #0f172a; margin: 0; font-size: 11px;">{p_name}</p>
                <p style="font-size: 9px; color: #94a3b8; margin: 2px 0 0 0; font-weight: 600;">Brand: {p_brand} &middot; SKU: {p_sku}</p>
            </td>
            <td style="padding: 10px 12px; text-align: center; font-family: monospace; font-weight: 600; vertical-align: top; font-size: 11px;">{qty}</td>
            <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-weight: 600; vertical-align: top; font-size: 11px;">₹{unit_price:,.2f}</td>
            <td style="padding: 10px 12px; text-align: center; font-family: monospace; font-weight: 600; vertical-align: top; font-size: 11px;">{tax_pct}%</td>
            <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a; vertical-align: top; font-size: 11px;">₹{line_total:,.2f}</td>
        </tr>
        """

    payment_rows = ""
    payments = po.payments or []
    if payments:
        for p in payments:
            p_date = p.payment_date.strftime("%d %b %Y") if hasattr(p.payment_date, "strftime") else str(p.payment_date)
            pm_val = p.payment_method.value if hasattr(p.payment_method, "value") else str(p.payment_method)
            method = pm_val.replace('_', ' ').title()
            ref = p.reference_number or "—"
            payment_rows += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 10px;">{p_date}</td>
                <td style="padding: 6px 10px;">{method}</td>
                <td style="padding: 6px 10px; font-family: monospace;">{ref}</td>
                <td style="padding: 6px 10px; text-align: right; font-family: monospace; font-weight: 700; color: #10b981;">₹{p.amount:,.2f}</td>
            </tr>
            """
    else:
        payment_rows = """
        <tr>
            <td colspan="4" style="padding: 10px; text-align: center; color: #94a3b8; font-style: italic;">No payment transactions recorded yet.</td>
        </tr>
        """

    order_date_str = po.order_date.strftime("%d %b %Y") if hasattr(po.order_date, "strftime") else str(po.order_date)
    due_date_str = po.due_date.strftime("%d %b %Y") if (po.due_date and hasattr(po.due_date, "strftime")) else (str(po.due_date) if po.due_date else "—")

    theme_color = "#0f172a" if is_final else "#ea580c"
    po_status_str = po.status.value if hasattr(po.status, 'value') else str(po.status)

    html = f"""
<div class="bill-content-inner" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; border-top: 6px solid {theme_color}; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05); padding: 24px; max-width: 100%; box-sizing: border-box;">
    <!-- Status Banner -->
    <div style="margin-bottom: 16px; text-align: center;">
        <span style="display: inline-block; padding: 4px 16px; border-radius: 8px; font-size: 11px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; {badge_style}">
            {badge_text}
        </span>
    </div>

    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 200px;">
            <h2 style="font-size: 16px; font-weight: 900; color: #0f172a; margin: 0; line-height: 1.2;">{purchaser_name}</h2>
            <p style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 3px 0 0 0;">{invoice_title}</p>
            <p style="font-size: 9px; color: #64748b; font-weight: 600; margin: 6px 0 0 0; line-height: 1.3;">{purchaser_address}</p>
            {f'<p style="font-size: 8px; color: #94a3b8; font-weight: 800; margin: 2px 0 0 0;">GSTIN: {purchaser_gst}</p>' if purchaser_gst else ''}
        </div>
        <div style="text-align: right; flex-shrink: 0;">
            <p style="font-size: 10px; font-family: monospace; font-weight: 700; color: #1e293b; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 8px; display: inline-block; margin: 0; line-height: 1;">
                {po.po_number}
            </p>
            {f'<p style="font-size: 9px; color: #64748b; font-weight: 700; margin: 4px 0 0 0;">Supplier Inv: {po.invoice_number}</p>' if po.invoice_number else ''}
            <p style="font-size: 9px; color: #94a3b8; font-weight: 700; margin: 4px 0 0 0;">Date: {order_date_str} &middot; Due Date: {due_date_str}</p>
        </div>
    </div>

    <!-- Supplier Details -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; border-bottom: 1px solid #e2e8f0; padding: 16px 0;">
        <div>
            <h3 style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0;">Supplier Details</h3>
            <div style="font-size: 10px; font-weight: 600; color: #475569; line-height: 1.4;">
                <p style="font-weight: 700; color: #0f172a; font-size: 11px; margin: 0 0 2px 0;">{supplier_name}</p>
                {f'<p style="margin: 0 0 2px 0;">Contact: {supplier_contact}</p>' if supplier_contact else ''}
                <p style="margin: 0 0 2px 0;">Phone: {supplier_phone} &middot; Email: {supplier_email}</p>
                <p style="margin: 0 0 2px 0;">Address: {supplier_address}</p>
                {f'<p style="margin: 0; color: #0f172a; font-weight: 700;">GSTIN: {supplier_gst}</p>' if supplier_gst else ''}
            </div>
        </div>
        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
            <h3 style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0; width: 100%;">Purchase Order Status</h3>
            <div style="font-size: 10px; font-weight: 600; color: #475569; line-height: 1.4; width: 100%;">
                <p style="margin: 0 0 4px 0;">PO Status: <span style="font-weight: 700; color: #0f172a;">{po_status_str}</span></p>
                <p style="margin: 0;">Payment State: <span style="background-color: {theme_color}10; color: {theme_color}; border: 1px solid {theme_color}30; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 800; display: inline-block;">{'FINAL / PAID' if is_final else 'TEMPORARY / UNPAID'}</span></p>
            </div>
        </div>
    </div>

    <!-- Items Table -->
    <div style="padding-top: 16px;">
        <h3 style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">Product Items Purchased</h3>
        <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 8px;">
                        <th style="padding: 8px 12px; text-align: left;">Product Info</th>
                        <th style="padding: 8px 12px; text-align: center; width: 40px;">Qty</th>
                        <th style="padding: 8px 12px; text-align: right; width: 85px;">Cost (Excl. GST)</th>
                        <th style="padding: 8px 12px; text-align: center; width: 50px;">Tax %</th>
                        <th style="padding: 8px 12px; text-align: right; width: 80px;">Total</th>
                    </tr>
                </thead>
                <tbody style="color: #334155;">
                    {item_rows}
                </tbody>
            </table>
        </div>
    </div>

    <!-- Payment Transactions Table & Calculations -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-top: 16px; flex-wrap: wrap;">
        <!-- Payments Breakdown -->
        <div style="flex: 1; min-width: 220px;">
            <h3 style="font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px 0;">Payment History</h3>
            <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
                    <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 7px;">
                            <th style="padding: 6px 10px; text-align: left;">Date</th>
                            <th style="padding: 6px 10px; text-align: left;">Method</th>
                            <th style="padding: 6px 10px; text-align: left;">Ref / UTR</th>
                            <th style="padding: 6px 10px; text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payment_rows}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Financial Calculations Box -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 180px; max-width: 240px; font-size: 10px; font-weight: 600; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; color: #64748b;">
                <span>Subtotal (Before GST)</span>
                <span style="font-family: monospace; font-weight: 700;">₹{po.subtotal:,.2f}</span>
            </div>
            {f'<div style="display: flex; justify-content: space-between; align-items: center; color: #64748b;"><span>GST (Tax)</span><span style="font-family: monospace; font-weight: 700;">+ ₹{po.tax_amount:,.2f}</span></div>' if po.tax_amount > 0 else ''}
            {f'<div style="display: flex; justify-content: space-between; align-items: center; color: #ef4444;"><span>Discount</span><span style="font-family: monospace; font-weight: 700;">- ₹{po.discount_amount:,.2f}</span></div>' if po.discount_amount > 0 else ''}
            <div style="display: flex; justify-content: space-between; align-items: center; color: #0f172a; font-weight: 800; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 2px;">
                <span>Grand Total (Incl. GST)</span>
                <span style="font-family: monospace; font-size: 11px; font-weight: 900; color: #0f172a;">₹{po.total_amount:,.2f}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; color: #10b981; font-weight: 800;">
                <span>Amount Paid</span>
                <span style="font-family: monospace; font-weight: 700;">₹{po.paid_amount:,.2f}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; color: {"#10b981" if is_final else "#c2410c"}; font-weight: 800;">
                <span>Outstanding Balance</span>
                <span style="font-family: monospace; font-weight: 900;">₹{po.due_amount:,.2f}</span>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; font-size: 8px; font-weight: 700; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 16px; font-style: italic; letter-spacing: 0.02em;">
        Optical Store Management System &middot; Supplier Purchase Invoice
    </div>
</div>
"""
    return html


async def update_invoice_for_po(db: AsyncSession, po_id: int, commit: bool = True) -> PurchaseOrderInvoice:
    stmt = (
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.store),
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.product),
            selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.product_snapshot),
            selectinload(PurchaseOrder.payments),
        )
        .where(PurchaseOrder.id == po_id)
    )
    res = await db.execute(stmt)
    po = res.scalar_one_or_none()
    if not po:
        return None

    html = await generate_po_invoice_html(po, db)
    is_final = (po.due_amount <= Decimal("0.00"))
    inv_num = po.invoice_number or po.po_number

    inv_stmt = select(PurchaseOrderInvoice).where(PurchaseOrderInvoice.purchase_order_id == po_id)
    inv_res = await db.execute(inv_stmt)
    inv = inv_res.scalar_one_or_none()

    if inv:
        inv.html_content = html
        inv.is_final = is_final
        inv.invoice_number = inv_num
    else:
        inv = PurchaseOrderInvoice(
            purchase_order_id=po_id,
            invoice_number=inv_num,
            is_final=is_final,
            html_content=html,
        )
        db.add(inv)

    if commit:
        await db.commit()
        await db.refresh(inv)
    else:
        await db.flush()
    return inv

