"""
Email Service
Sends emails via Resend API when configured, otherwise logs to console.
This ensures the app works in development without a real email service.
"""
import httpx
from typing import List, Optional
from app.config import get_settings
from bs4 import BeautifulSoup


async def send_email(
    to_emails: List[str],
    subject: str,
    html_body: str,
    from_name: str = "Vigilo Safety Alert",
    from_email: str = "onboarding@resend.dev",
) -> bool:
    """
    Send an email. If RESEND_API_KEY is configured, sends via Resend API.
    Otherwise, logs the email to the console for development.
    Returns True if sent/logged successfully.
    """
    settings = get_settings()

    if not to_emails:
        print("EMAIL SERVICE: No recipients specified, skipping.")
        return False

    # Filter out empty strings
    to_emails = [e for e in to_emails if e and e.strip()]
    if not to_emails:
        print("EMAIL SERVICE: All recipients were empty, skipping.")
        return False

    if settings.resend_api_key:
        # Real email via Resend API
        try:
            async with httpx.AsyncClient() as client:
                # Auto-generate plain text fallback for spam filters
                soup = BeautifulSoup(html_body, 'html.parser')
                text_body = soup.get_text(separator='\n\n', strip=True)
                
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {settings.resend_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": f"{from_name} <{from_email}>",
                        "to": to_emails,
                        "subject": subject,
                        "html": html_body,
                        "text": text_body,
                    },
                    timeout=10.0,
                )
                if response.status_code in (200, 201):
                    print(f"EMAIL SENT via Resend to {to_emails}: {subject}")
                    return True
                else:
                    print(f"EMAIL ERROR: Resend returned {response.status_code}: {response.text}")
                    return False
        except Exception as e:
            print(f"EMAIL ERROR: Failed to send via Resend: {e}")
            return False
    else:
        # Development mode — log the email
        print("=" * 60)
        print(f"📧 EMAIL (dev mode — no RESEND_API_KEY set)")
        print(f"   To:      {', '.join(to_emails)}")
        print(f"   Subject: {subject}")
        print(f"   Body:    {html_body[:300]}...")
        print("=" * 60)
        return True


def build_sos_alert_email(
    user_name: str,
    latitude: Optional[float],
    longitude: Optional[float],
) -> dict:
    """Build the HTML email content for an SOS alert."""
    map_link = ""
    if latitude and longitude:
        map_link = f"https://www.google.com/maps?q={latitude},{longitude}"

    html = f"""
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2563eb; border-radius: 12px; padding: 24px; text-align: left; color: white;">
            <h1 style="margin: 0 0 8px 0; font-size: 22px;">Security Alert: Assistance Required</h1>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">{user_name} has triggered an emergency alert.</p>
        </div>

        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-top: 16px;">
            <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a;">Location Information</h2>
            {f'<p style="margin: 0 0 8px 0; color: #475569;">Coordinates: {latitude}, {longitude}</p>' if latitude else '<p style="color: #475569;">Location unavailable</p>'}
            {f'<a href="{map_link}" style="display: inline-block; margin-top: 8px; padding: 8px 16px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">View on Google Maps</a>' if map_link else ''}
        </div>

        <div style="border-left: 4px solid #ef4444; background: #fff1f2; padding: 16px; margin-top: 16px;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">This is an automated safety alert from Vigilo. Please check on {user_name} immediately.</p>
        </div>

        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            Sent by Vigilo Desktop App — CrimeSafe AI Platform
        </p>
    </div>
    """
    return {
        "subject": f"Urgent: Security Alert from {user_name}",
        "html": html,
    }


def build_sos_resolved_email(user_name: str) -> dict:
    """Build the email for when an SOS is resolved."""
    html = f"""
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #059669; border-radius: 12px; padding: 24px; text-align: left; color: white;">
            <h1 style="margin: 0 0 8px 0; font-size: 20px;">Safety Status Update</h1>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">The alert has been resolved.</p>
        </div>

        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin-top: 16px;">
            <p style="margin: 0; color: #166534; font-size: 14px;">{user_name} has marked their emergency as resolved. They are safe. No further action is needed.</p>
        </div>

        <p style="margin-top: 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            Sent by Vigilo Desktop App — CrimeSafe AI Platform
        </p>
    </div>
    """
    return {
        "subject": f"Status Update: {user_name} is safe",
        "html": html,
    }
