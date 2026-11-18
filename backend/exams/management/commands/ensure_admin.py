import os
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create/update the admin user from ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD env vars"

    def handle(self, *args, **opts):
        name = os.environ.get("ADMIN_USERNAME", "").strip()
        pw = os.environ.get("ADMIN_PASSWORD", "")
        email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
        if not (name and pw):
            self.stdout.write("ADMIN_USERNAME / ADMIN_PASSWORD not set - skipping admin creation")
            return
        u, created = User.objects.get_or_create(username=name, defaults={"email": email, "first_name": "Admin"})
        u.email = email or u.email
        u.is_staff = u.is_superuser = True
        u.set_password(pw)
        u.save()
        self.stdout.write(("Created" if created else "Updated") + f" admin user '{name}'")
