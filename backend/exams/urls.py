from django.urls import path
from . import views as v

urlpatterns = [
    path("auth/send-otp/", v.send_otp),
    path("auth/register/", v.register),
    path("auth/login/", v.login),
    path("auth/me/", v.me),
    path("tests/", v.tests),
    path("tests/<int:pk>/", v.test_detail),
    path("tests/<int:pk>/start/", v.start),
    path("attempts/", v.history),
    path("attempts/<int:pk>/save/", v.save),
    path("attempts/<int:pk>/submit/", v.submit),
    path("attempts/<int:pk>/result/", v.result),
    path("admin/upload-questions/", v.upload_questions),
    path("admin/stats/", v.stats),
]
