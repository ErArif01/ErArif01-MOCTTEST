# Exam Crack Study Point (Django + React)

## What is inside
- Home page: categories (Railways, SSC, Banking, UPSSSC ...), hourly quiz, featured quizzes, news, vacancies.
- Exam cards: Category -> Exam (RRB ALP, Group D, CGL ...). Every exam has its OWN question bank, subjects, tests and syllabus.
  Exam page tabs: All tests, Free, Paid, Previous papers, Sectional, My attempts, Syllabus.
- Tests: free or paid (Razorpay), random paper from that exam's bank, timer, negative marking, result with review.
- Quizzes: automatic hourly quiz (same for everyone) + admin-made quizzes shown on the home page. One attempt each, instant result, rank.
- News: results, admit cards, form guides, test solutions - with image, uploaded video or YouTube link.
- Vacancies: posts, vacancies per post, dates, qualification, apply/notification links.
- Admin panel (/manage): overview, users (block/unblock), results, exams, tests, questions, quizzes, news, vacancies, payments.
- Register/forgot-password by email OTP, change password for logged-in users.

## Update an existing install
1. Copy the folders over your project (keep `.env`, `venv`, `db.sqlite3`).
2. `cd backend && pip install -r requirements.txt && python manage.py migrate`
   (your old questions and tests move into a "General / General Practice" exam automatically)
3. `cd frontend && npm install && npm run build`
4. `git push` -> Render redeploys and migrates by itself.

## First-time setup in the admin panel
1. Exams tab: add a category, then exams (posts) inside it, with syllabus.
2. Questions tab: choose the exam, upload a CSV (`subject,question,a,b,c,d,correct,explanation`).
3. Tests tab: New test -> exam, type, free/paid + price, negative marking, subjects and counts.
4. Quizzes tab: switch the hourly quiz on, or create quizzes and put them on the home page.
5. News and Vacancies tabs: post updates and jobs.

## Razorpay (paid tests)
Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (start with test keys). Recommended: in the Razorpay dashboard add a webhook
`https://YOUR-SITE/api/payments/webhook/` for `payment.captured` and `order.paid`, and set RAZORPAY_WEBHOOK_SECRET to the same secret.

## Uploaded images and videos
Default storage is `backend/media`. On Render free the disk is wiped on every deploy/restart, so set the S3_* variables
(Cloudflare R2, AWS S3 or Supabase Storage) or use YouTube links for videos. Limits: image 5 MB, video 30 MB.
