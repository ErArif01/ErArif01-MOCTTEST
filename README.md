# Mock Test Portal (Django + React)

Features: email-OTP registration, email login, admin-defined tests (name, time, negative marking, subject-wise
question counts), random question paper per attempt, instructions page, server-side timer + auto-submit,
early submit, full result (score, %, correct/incorrect/unattempted, accuracy, section-wise, answer review), CSV question upload.

## 1. Run locally
```bash
cd backend
python -m venv venv && source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser                       # your admin login (email as username)
python manage.py runserver                             # http://127.0.0.1:8000

cd ../frontend                                         # new terminal
npm install
npm run dev                                            # http://localhost:5173
```
OTP emails print in the backend terminal until you set email variables (below).

## 2. Add questions and create a test
1. Login with the superuser account on the site -> top bar "Upload questions" -> upload CSV
   (`subject,question,a,b,c,d,correct,explanation`). `frontend/public/sample_questions.csv` has 50 ready questions
   with subjects Computer, English, Reasoning, Aptitude, GK. (Or: `python manage.py import_questions file.csv`)
2. Open `/admin/` -> Tests -> Add: name, duration, marks per question, negative marks, extra instructions,
   then in "Test sections" add subject + number of questions (e.g. Computer 50, English 10, Reasoning 10, Aptitude 15, GK 15).
   Make as many tests as you like. Each attempt gets a fresh random paper as per these counts.
   Keep at least that many questions per subject in the bank.

## 3. Go live (single server: Django serves React)
```bash
cd frontend && npm install && npm run build            # creates frontend/dist
cd ../backend
export DEBUG=0 SECRET_KEY='long-random-string' ALLOWED_HOSTS='yourdomain.com'
export CSRF_TRUSTED_ORIGINS='https://yourdomain.com'
export EMAIL_HOST_USER='you@gmail.com' EMAIL_HOST_PASSWORD='gmail-app-password'   # real OTP emails
python manage.py migrate && python manage.py collectstatic --noinput
gunicorn config.wsgi --bind 0.0.0.0:8000
```
Put nginx (or Render/Railway/PythonAnywhere) in front with HTTPS. Gmail needs 2-step verification + an "App password".
For many simultaneous users switch `DATABASES` in `config/settings.py` to PostgreSQL.
