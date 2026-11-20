from django.urls import path
from django.urls import include
from . import admin_api as a
from . import portal_views as pv
from .admin_crud import router
from . import views as v

urlpatterns = [
    # auth
    path("auth/send-otp/", v.send_otp),
    path("auth/register/", v.register),
    path("auth/login/", v.login),
    path("auth/me/", v.me),
    path("auth/forgot-password/", v.forgot_password),
    path("auth/reset-password/", v.reset_password),
    path("auth/change-password/", v.change_password),
    # candidate
    path("tests/", v.tests),
    path("tests/<int:pk>/", v.test_detail),
    path("tests/<int:pk>/start/", v.start),
    path("attempts/", v.history),
    path("attempts/<int:pk>/save/", v.save),
    path("attempts/<int:pk>/submit/", v.submit),
    path("attempts/<int:pk>/result/", v.result),
    # public site
    path("config/", pv.site_config),
    path("home/", pv.home),
    path("categories/", pv.categories),
    path("exams/<int:pk>/", pv.exam_detail),
    path("news/", pv.news_list),
    path("news/<int:pk>/", pv.news_detail),
    path("vacancies/", pv.vacancy_list),
    path("vacancies/<int:pk>/", pv.vacancy_detail),
    path("quizzes/", pv.quiz_list),
    path("quizzes/<int:pk>/", pv.quiz_detail),
    path("quizzes/<int:pk>/submit/", pv.quiz_submit),
    path("payments/create-order/", pv.create_order),
    path("payments/verify/", pv.verify_payment),
    path("payments/webhook/", pv.razorpay_webhook),
    path("payments/manual/", pv.manual_payment),
    # admin panel
    path("admin/payments/", a.admin_payments),
    path("admin/payments/<int:pk>/approve/", a.approve_payment),
    path("admin/payments/<int:pk>/reject/", a.reject_payment),
    path("admin/payments/grant/", a.grant_access),
    path("admin/payment-settings/", a.payment_settings),
    path("admin/config/", a.admin_config),
    path("admin/stats/", v.stats),
    path("admin/upload-questions/", v.upload_questions),
    path("admin/overview/", a.overview),
    path("admin/users/", a.users),
    path("admin/users/<int:pk>/", a.user_detail),
    path("admin/users/<int:pk>/block/", a.block_user),
    path("admin/users/<int:pk>/unblock/", a.unblock_user),
    path("admin/users/<int:pk>/set-password/", a.set_user_password),
    path("admin/users/<int:pk>/set-staff/", a.set_user_staff),
    path("admin/attempts/", a.attempts),
    path("admin/attempts/<int:pk>/result/", a.attempt_result),
    path("admin/tests/", a.admin_tests),
    path("admin/tests/<int:pk>/", a.admin_test_detail),
    path("admin/tests/<int:pk>/toggle/", a.toggle_test),
    path("admin/questions/", a.admin_questions),
    path("admin/questions/<int:pk>/", a.admin_question_detail),
    path("admin/", include(router.urls)),
]
