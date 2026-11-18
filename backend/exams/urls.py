from django.urls import path
from . import admin_api as a
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
    # admin panel
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
]
