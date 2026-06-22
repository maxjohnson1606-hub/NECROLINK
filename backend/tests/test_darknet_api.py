"""Backend API tests for Dark_Net MLBB clan website."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://voltage-victory.preview.emergentagent.com').rstrip('/')
ADMIN_EMAIL = "admin@darknet.com"
ADMIN_PASSWORD = "DarkNet2024!"

API = f"{BASE_URL}/api"


# ============ Fixtures ============
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def anon_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ============ Public Read Endpoints ============
class TestPublicEndpoints:
    def test_get_members(self, anon_session):
        r = anon_session.get(f"{API}/members")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 2
        # Validate fields
        names = [m["game_name"] for m in data]
        assert "DarkNet_Shadow" in names
        assert "DarkNet_Phantom" in names
        for m in data:
            assert "_id" not in m
            assert "name" in m and "role" in m and "rank" in m

    def test_get_announcements(self, anon_session):
        r = anon_session.get(f"{API}/announcements")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 2
        for a in data:
            assert "_id" not in a
            assert "title" in a and "content" in a


# ============ Auth Endpoints ============
class TestAuth:
    def test_login_admin_success(self, anon_session):
        # use new session to verify cookies
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == ADMIN_EMAIL
        assert body["role"] == "admin"
        # Check cookies set
        assert "access_token" in s.cookies
        assert "refresh_token" in s.cookies

    def test_login_invalid(self, anon_session):
        r = anon_session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "WrongPass!"})
        assert r.status_code == 401

    def test_get_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_get_me_authenticated(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL
        assert r.json()["role"] == "admin"

    def test_register_new_user(self):
        s = requests.Session()
        unique_email = f"TEST_user_{int(time.time())}@darknet.com"
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Test User",
            "game_name": f"TEST_Game_{int(time.time())}",
            "preferred_role": "Marksman"
        }
        r = s.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["email"] == unique_email.lower()
        assert body["role"] == "member"
        # Verify auth works via cookies
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == unique_email.lower()

    def test_register_duplicate(self):
        r = requests.post(f"{API}/auth/register", json={
            "email": ADMIN_EMAIL,
            "password": "whatever",
            "name": "Dup"
        })
        assert r.status_code == 400

    def test_logout(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert "access_token" in s.cookies
        r2 = s.post(f"{API}/auth/logout")
        assert r2.status_code == 200
        # After logout, /me should return 401
        # The server sends delete-cookie headers; requests may still keep cookies cleared
        r3 = s.get(f"{API}/auth/me")
        assert r3.status_code == 401


# ============ Application Endpoints ============
class TestApplications:
    submitted_email = None

    def test_submit_application(self, anon_session):
        unique = int(time.time())
        email = f"TEST_applicant_{unique}@darknet.com"
        TestApplications.submitted_email = email
        payload = {
            "name": "TEST Applicant",
            "email": email,
            "game_name": f"TEST_Applicant_{unique}",
            "preferred_role": "Mage",
            "experience": "2 years competitive",
            "discord_username": "test#1234",
            "reason": "I want to climb to Mythic."
        }
        r = anon_session.post(f"{API}/applications", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "id" in body
        assert body["status"] == "pending"

    def test_get_applications_unauth(self):
        r = requests.get(f"{API}/applications")
        assert r.status_code in (401, 403)

    def test_get_applications_admin(self, admin_session):
        r = admin_session.get(f"{API}/applications")
        assert r.status_code == 200
        apps = r.json()
        assert isinstance(apps, list)
        # Verify our submitted app exists
        if TestApplications.submitted_email:
            emails = [a.get("email") for a in apps]
            assert TestApplications.submitted_email.lower() in emails

    def test_update_application_status(self, admin_session):
        if not TestApplications.submitted_email:
            pytest.skip("No application created")
        email = TestApplications.submitted_email.lower()
        r = admin_session.patch(f"{API}/applications/{email}/status", params={"status": "approved"})
        assert r.status_code == 200


# ============ Announcement Endpoints ============
class TestAnnouncementsAuth:
    created_title = None

    def test_create_announcement_unauth(self):
        r = requests.post(f"{API}/announcements", json={
            "title": "Hack attempt", "content": "Should be blocked", "type": "general"
        })
        assert r.status_code in (401, 403)

    def test_create_announcement_admin(self, admin_session):
        title = f"TEST_Announcement_{int(time.time())}"
        TestAnnouncementsAuth.created_title = title
        r = admin_session.post(f"{API}/announcements", json={
            "title": title,
            "content": "Test content for announcement.",
            "type": "general"
        })
        assert r.status_code == 200, r.text
        # Verify it appears in GET
        r2 = requests.get(f"{API}/announcements")
        assert r2.status_code == 200
        titles = [a["title"] for a in r2.json()]
        assert title in titles

    def test_delete_announcement_admin(self, admin_session):
        if not TestAnnouncementsAuth.created_title:
            pytest.skip("No announcement created")
        r = admin_session.delete(f"{API}/announcements/{TestAnnouncementsAuth.created_title}")
        assert r.status_code == 200


# ============ Member Admin Endpoints ============
class TestMembersAdmin:
    created_game_name = None

    def test_create_member_unauth(self):
        r = requests.post(f"{API}/members", json={
            "name": "X", "game_name": "TEST_X", "role": "Tank"
        })
        assert r.status_code in (401, 403)

    def test_create_member_admin(self, admin_session):
        gn = f"TEST_Member_{int(time.time())}"
        TestMembersAdmin.created_game_name = gn
        payload = {
            "name": "TEST Member",
            "game_name": gn,
            "role": "Fighter",
            "rank": "Member",
            "achievements": ["TestAch"],
            "wins": 10,
            "mvp_count": 1
        }
        r = admin_session.post(f"{API}/members", json=payload)
        assert r.status_code == 200, r.text
        # Confirm via GET
        r2 = requests.get(f"{API}/members")
        names = [m["game_name"] for m in r2.json()]
        assert gn in names

    def test_delete_member_admin(self, admin_session):
        if not TestMembersAdmin.created_game_name:
            pytest.skip("No member created")
        r = admin_session.delete(f"{API}/members/{TestMembersAdmin.created_game_name}")
        assert r.status_code == 200
