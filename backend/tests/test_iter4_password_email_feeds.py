"""Iteration 4 tests:
- PUT /api/auth/password (change password)
- PUT /api/auth/email (change email)
- GET /api/feeds/mlbb-videos
- GET /api/feeds/mlbb-instagram
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://voltage-victory.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


def _register(email, password, name="Iter4 Tester"):
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name}, timeout=30)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    return s


def _login(session, email, password):
    r = session.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    return r


@pytest.fixture(scope="module")
def test_user():
    email = f"test_iter4_{uuid.uuid4().hex[:10]}@example.com"
    password = "InitialPass1!"
    session = _register(email, password)
    yield {"email": email, "password": password, "session": session}


class TestChangePassword:
    def test_password_wrong_current(self, test_user):
        s = test_user["session"]
        r = s.put(f"{API}/auth/password",
                  json={"current_password": "WRONG_PASSWORD", "new_password": "NewPass1!"}, timeout=30)
        assert r.status_code == 401

    def test_password_too_short(self, test_user):
        s = test_user["session"]
        r = s.put(f"{API}/auth/password",
                  json={"current_password": test_user["password"], "new_password": "abc"}, timeout=30)
        assert r.status_code == 400

    def test_password_change_success_and_login(self, test_user):
        s = test_user["session"]
        new_pw = "ChangedPass1!"
        r = s.put(f"{API}/auth/password",
                  json={"current_password": test_user["password"], "new_password": new_pw}, timeout=30)
        assert r.status_code == 200, r.text
        # Cookie refreshed
        assert "access_token" in s.cookies.get_dict()

        # Old password fails on a fresh session
        fresh = requests.Session()
        old_login = _login(fresh, test_user["email"], test_user["password"])
        assert old_login.status_code == 401

        # New password works
        new_login = _login(fresh, test_user["email"], new_pw)
        assert new_login.status_code == 200
        test_user["password"] = new_pw


class TestChangeEmail:
    def test_email_wrong_current_password(self, test_user):
        s = test_user["session"]
        new_email = f"new_{uuid.uuid4().hex[:8]}@example.com"
        r = s.put(f"{API}/auth/email",
                  json={"current_password": "WRONG", "new_email": new_email}, timeout=30)
        assert r.status_code == 401

    def test_email_same_as_current_rejected(self, test_user):
        s = test_user["session"]
        r = s.put(f"{API}/auth/email",
                  json={"current_password": test_user["password"], "new_email": test_user["email"]}, timeout=30)
        assert r.status_code == 400

    def test_email_already_in_use(self, test_user):
        s = test_user["session"]
        # Owner email is guaranteed seeded
        r = s.put(f"{API}/auth/email",
                  json={"current_password": test_user["password"], "new_email": "owner@necrolink.com"}, timeout=30)
        assert r.status_code == 400

    def test_email_change_success_and_login(self, test_user):
        s = test_user["session"]
        new_email = f"changed_{uuid.uuid4().hex[:8]}@example.com"
        r = s.put(f"{API}/auth/email",
                  json={"current_password": test_user["password"], "new_email": new_email}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("email") == new_email

        # Can login with new email and same password
        fresh = requests.Session()
        login_r = _login(fresh, new_email, test_user["password"])
        assert login_r.status_code == 200
        test_user["email"] = new_email


class TestFeeds:
    def test_mlbb_videos_returns_array(self):
        r = requests.get(f"{API}/feeds/mlbb-videos", timeout=60)
        assert r.status_code == 200
        data = r.json()
        assert "videos" in data
        assert isinstance(data["videos"], list)
        assert len(data["videos"]) >= 1, f"Expected at least 1 video, got {len(data['videos'])}. Response: {data}"
        v = data["videos"][0]
        for field in ("video_id", "title", "thumbnail", "url", "published"):
            assert field in v, f"Missing {field} in video: {v}"
            assert v[field], f"Empty {field}"
        assert "fetched_at" in data

    def test_mlbb_videos_cached(self):
        r1 = requests.get(f"{API}/feeds/mlbb-videos", timeout=60)
        assert r1.status_code == 200
        t1 = r1.json().get("fetched_at")
        time.sleep(1)
        r2 = requests.get(f"{API}/feeds/mlbb-videos", timeout=60)
        assert r2.status_code == 200
        t2 = r2.json().get("fetched_at")
        assert t1 == t2, f"Cache not working: {t1} vs {t2}"

    def test_mlbb_instagram(self):
        r = requests.get(f"{API}/feeds/mlbb-instagram", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data.get("profile_url") == "https://www.instagram.com/mlbb_cis/"
        assert data.get("handle") == "@mlbb_cis"
