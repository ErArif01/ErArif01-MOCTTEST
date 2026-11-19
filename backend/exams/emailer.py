import json
import logging
import os
import urllib.error
import urllib.request

from django.core.mail import send_mail

log = logging.getLogger(__name__)


def send_otp_email(to_email, code, purpose="register"):
    """Send the OTP. Uses the Brevo HTTPS API when configured (SMTP ports are blocked on free hosts),
    otherwise falls back to Django's email backend (Gmail SMTP or console)."""
    if purpose == "reset":
        subject = "Password reset OTP"
        text = f"Your password reset OTP is {code}. It is valid for 10 minutes. If you did not request this, ignore this email."
    else:
        subject = "Your verification OTP"
        text = f"Your OTP is {code}. It is valid for 10 minutes. Do not share it with anyone."
    key = os.environ.get("BREVO_API_KEY", "").strip()
    sender = os.environ.get("BREVO_SENDER_EMAIL", "").strip()
    if key and sender:
        body = json.dumps({
            "sender": {"name": os.environ.get("BREVO_SENDER_NAME", "Exam Crack Study Point"), "email": sender},
            "to": [{"email": to_email}],
            "subject": subject,
            "textContent": text,
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://api.brevo.com/v3/smtp/email", data=body, method="POST",
            headers={"api-key": key, "content-type": "application/json", "accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                if r.status not in (200, 201, 202):
                    raise RuntimeError(f"Brevo returned HTTP {r.status}")
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"Brevo HTTP {e.code}: {e.read().decode(errors='ignore')[:300]}") from e
        return
    send_mail(subject, text, None, [to_email], fail_silently=False)
