# Mock Test Portal (Django + React) - v2

## New in v2
- **Admin panel** at `/manage` (staff only): overview, users (search, block/unblock, make admin, set password, delete),
  every user's tests and full result with answer review, all results with filters, tests (create/edit/hide/delete),
  question bank (CSV upload, add/edit/delete, search).
- **Blocked users** are logged out immediately and cannot log in again until unblocked.
- **Forgot password** with email OTP (`/forgot`). OTP is used ONLY for registration and password reset.
- **Logged-in users** change their password at `/account` with the current password (no OTP).
- Exam options alignment fixed; layout is responsive (phone, tablet, desktop).

## Update an existing install
1. Copy these folders over your project (keep your `.env`, `venv`, `db.sqlite3`).
2. `cd backend && pip install -r requirements.txt && python manage.py migrate`   (adds 2 small fields)
3. `cd frontend && npm install && npm run build`
4. Commit and `git push` -> Render redeploys (build.sh runs migrate automatically).

## Local run
Backend: `python manage.py runserver`   Frontend: `npm run dev`   (see backend/.env.example for variables)

## Notes
- Admin = a user with is_staff. Create the first one with ADMIN_* env vars (see build.sh) or `createsuperuser`.
- "Deleting" a question only hides it, so old results keep working. A test with attempts can only be hidden.
- Password reset reply is the same for unknown emails (no account enumeration).
