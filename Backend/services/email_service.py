import os
import base64
import logging
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx
from core.config import settings

logger = logging.getLogger("email_service")

# Path to template
TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "otp_email.html"


async def get_gmail_access_token() -> str | None:
    """Exchange refresh_token for a fresh OAuth2 access_token via Google token endpoint."""
    if not settings.GMAIL_CLIENT_ID or not settings.GMAIL_REFRESH_TOKEN:
        return None

    url = "https://oauth2.googleapis.com/token"
    payload = {
        "client_id": settings.GMAIL_CLIENT_ID,
        "client_secret": settings.GMAIL_CLIENT_SECRET,
        "refresh_token": settings.GMAIL_REFRESH_TOKEN,
        "grant_type": "refresh_token",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, data=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("access_token")
            else:
                logger.error(f"Failed to refresh Gmail OAuth token: {resp.status_code} - {resp.text}")
                return None
    except Exception as e:
        logger.error(f"Error fetching Gmail access token: {e}")
        return None


async def send_otp_email(recipient_email: str, otp_code: str) -> bool:
    """Send OTP email using Gmail OAuth2 API or log to dev output if unconfigured."""
    # 1. Load HTML Template
    if TEMPLATE_PATH.exists():
        html_content = TEMPLATE_PATH.read_text(encoding="utf-8").replace("{{ OTP_CODE }}", otp_code)
    else:
        html_content = f"<h2>Your ClearSight ERP Verification Code is: {otp_code}</h2>"

    # 2. Get Access Token
    access_token = await get_gmail_access_token()

    if not access_token:
        # Dev fallback / Mock Mode log
        print(f"\n==================================================")
        print(f"  [GMAIL SERVICE MOCK / DEV FALLBACK]")
        print(f"  Recipient: {recipient_email}")
        print(f"  OTP Verification Code: >>> {otp_code} <<<")
        print(f"==================================================\n")
        logger.info(f"[DEV MOCK] Sent OTP code {otp_code} to {recipient_email}")
        return True

    # 3. Build MIME Message
    sender_email = settings.GMAIL_USER or "noreply@clearsight.in"
    message = MIMEMultipart("alternative")
    message["Subject"] = f"{otp_code} is your ClearSight ERP verification code"
    message["From"] = f"ClearSight ERP <{sender_email}>"
    message["To"] = recipient_email

    # Attach HTML
    part_html = MIMEText(html_content, "html")
    message.attach(part_html)

    # 4. Encode raw base64url message
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    # 5. Post to Gmail API v1
    gmail_send_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    body = {"raw": raw_message}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(gmail_send_url, headers=headers, json=body)
            if res.status_code in (200, 201):
                logger.info(f"Successfully sent OTP email to {recipient_email} via Gmail API")
                return True
            else:
                logger.error(f"Gmail API error: {res.status_code} - {res.text}")
                return False
    except Exception as e:
        logger.error(f"Failed to send email via Gmail API: {e}")
        return False


LOYALTY_TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "loyalty_otp_email.html"


async def send_loyalty_otp_email(
    recipient_email: str,
    recipient_name: str,
    points_to_redeem: int,
    remaining_points: int,
    requested_by: str,
    otp_code: str,
) -> bool:
    """Send loyalty points redemption authorization OTP email."""
    if LOYALTY_TEMPLATE_PATH.exists():
        html_content = (
            LOYALTY_TEMPLATE_PATH.read_text(encoding="utf-8")
            .replace("{{ RECIPIENT_NAME }}", recipient_name)
            .replace("{{ POINTS_TO_REDEEM }}", f"{points_to_redeem:,}")
            .replace("{{ REMAINING_POINTS }}", f"{remaining_points:,}")
            .replace("{{ REQUESTED_BY }}", requested_by)
            .replace("{{ OTP_CODE }}", otp_code)
        )
    else:
        html_content = f"<h2>Authorization Code: {otp_code}</h2><p>Requesting to redeem {points_to_redeem} loyalty points from your account.</p>"

    access_token = await get_gmail_access_token()

    if not access_token:
        print(f"\n==================================================")
        print(f"  [GMAIL SERVICE MOCK - LOYALTY REDEMPTION OTP]")
        print(f"  Recipient: {recipient_email} ({recipient_name})")
        print(f"  Points Being Redeemed: {points_to_redeem} pts")
        print(f"  Remaining Points: {remaining_points} pts")
        print(f"  Requested By: {requested_by}")
        print(f"  Loyalty OTP Code: >>> {otp_code} <<<")
        print(f"==================================================\n")
        logger.info(f"[DEV MOCK] Sent Loyalty OTP code {otp_code} to {recipient_email}")
        return True

    sender_email = settings.GMAIL_USER or "noreply@clearsight.in"
    message = MIMEMultipart("alternative")
    message["Subject"] = f"Authorization Required: {points_to_redeem} Loyalty Points Redemption Request ({otp_code})"
    message["From"] = f"ClearSight ERP <{sender_email}>"
    message["To"] = recipient_email

    part_html = MIMEText(html_content, "html")
    message.attach(part_html)

    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    gmail_send_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    body = {"raw": raw_message}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(gmail_send_url, headers=headers, json=body)
            if res.status_code in (200, 201):
                logger.info(f"Successfully sent Loyalty OTP email to {recipient_email} via Gmail API")
                return True
            else:
                logger.error(f"Gmail API error: {res.status_code} - {res.text}")
                return False
    except Exception as e:
        logger.error(f"Failed to send loyalty OTP email via Gmail API: {e}")
        return False
