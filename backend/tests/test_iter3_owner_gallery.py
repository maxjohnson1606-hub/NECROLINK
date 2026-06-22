"""Iteration 3 backend tests: Owner role, /api/users, /api/gallery, /api/auth/profile, /api/me/*, Aamon leader.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"

OWNER_EMAIL = "owner@necrolink.com"
OWNER_PASSWORD = "Owner2024!"
ADMIN_EMAIL = "admin@necrolink.com"
ADMIN_PASSWORD = "Necrolink2024!"


def _login(email, password):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture(scope="module")
def owner_session():
    s, body = _login(OWNER_EMAIL, OWNER_PASSWORD)
    assert body["role"] == "owner", f"Expected owner role, got {body}"
    return s


@pytest.fixture(scope="module")
def admin_session():
    s, body = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert body["role"] == "admin"
    return s


@pytest.fixture(scope="module")
def member_session():
    # Register a fresh member (server lowercases email)
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"test_member_{int(time.time())}@necrolink.com"
    password = "MemberPass123!"
    r = s.post(f"{API}/auth/register", json={
        "email": email, "password": password, "name": "TEST Member"
    })
    assert r.status_code == 200, r.text
    return s, email, password


# ============ Owner login ============
class TestOwnerLogin:
    def test_owner_login_role(self):
        s, body = _login(OWNER_EMAIL, OWNER_PASSWORD)
        assert body["role"] == "owner"
        assert body["email"] == OWNER_EMAIL
        assert "access_token" in s.cookies


# ============ Owner-only /api/users ============
class TestUsersEndpoint:
    def test_get_users_owner(self, owner_session):
        r = owner_session.get(f"{API}/users")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        for u in data:
            assert "_id" not in u
            assert "password_hash" not in u
            assert "id" in u and "email" in u and "role" in u

    def test_get_users_admin_forbidden(self, admin_session):
        r = admin_session.get(f"{API}/users")
        assert r.status_code == 403, r.text

    def test_get_users_unauth(self):
        r = requests.get(f"{API}/users")
        assert r.status_code in (401, 403)

    def test_change_role_then_revert(self, owner_session, member_session):
        _, email, _ = member_session
        # find member id
        users = owner_session.get(f"{API}/users").json()
        u = next((x for x in users if x["email"] == email), None)
        assert u is not None, "Member not found"
        uid = u["id"]

        # Promote to admin
        r = owner_session.patch(f"{API}/users/{uid}/role", json={"role": "admin"})
        assert r.status_code == 200, r.text
        users2 = owner_session.get(f"{API}/users").json()
        assert next(x for x in users2 if x["id"] == uid)["role"] == "admin"

        # Revert
        r2 = owner_session.patch(f"{API}/users/{uid}/role", json={"role": "member"})
        assert r2.status_code == 200

    def test_change_own_role_rejected(self, owner_session):
        users = owner_session.get(f"{API}/users").json()
        me = next((x for x in users if x["email"] == OWNER_EMAIL), None)
        assert me is not None
        r = owner_session.patch(f"{API}/users/{me['id']}/role", json={"role": "admin"})
        assert r.status_code == 400, r.text

    def test_change_role_admin_forbidden(self, admin_session, owner_session):
        users = owner_session.get(f"{API}/users").json()
        target = next((x for x in users if x["role"] == "member"), None)
        if not target:
            pytest.skip("No member user available")
        r = admin_session.patch(f"{API}/users/{target['id']}/role", json={"role": "admin"})
        assert r.status_code == 403

    def test_delete_self_rejected(self, owner_session):
        users = owner_session.get(f"{API}/users").json()
        me = next((x for x in users if x["email"] == OWNER_EMAIL), None)
        r = owner_session.delete(f"{API}/users/{me['id']}")
        assert r.status_code == 400

    def test_delete_user_owner(self, owner_session):
        # Create a throwaway user via register, then delete it
        email = f"test_todelete_{int(time.time())}@necrolink.com"
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        reg = s.post(f"{API}/auth/register", json={
            "email": email, "password": "Pass1234!", "name": "ToDelete"
        })
        assert reg.status_code == 200
        users = owner_session.get(f"{API}/users").json()
        target = next(x for x in users if x["email"] == email)
        r = owner_session.delete(f"{API}/users/{target['id']}")
        assert r.status_code == 200, r.text
        # verify gone
        users2 = owner_session.get(f"{API}/users").json()
        assert not any(x["email"] == email for x in users2)


# ============ PATCH /api/auth/profile ============
class TestProfileUpdate:
    def test_member_can_update_own_profile(self, member_session):
        s, email, _ = member_session
        r = s.patch(f"{API}/auth/profile", json={
            "name": "TEST Updated Name",
            "game_name": "TEST_GameName",
            "preferred_role": "Tank",
            "avatar_url": "data:image/png;base64,AAAA",
            "bio": "TEST bio text"
        })
        assert r.status_code == 200, r.text
        me = s.get(f"{API}/auth/me").json()
        assert me["name"] == "TEST Updated Name"
        assert me.get("game_name") == "TEST_GameName"
        assert me.get("preferred_role") == "Tank"
        assert me.get("bio") == "TEST bio text"

    def test_unauth_profile_update_blocked(self):
        r = requests.patch(f"{API}/auth/profile", json={"name": "X"})
        assert r.status_code in (401, 403)


# ============ /api/me/* ============
class TestMeEndpoints:
    def test_me_applications_empty(self, member_session):
        s, _, _ = member_session
        r = s.get(f"{API}/me/applications")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_me_registrations(self, member_session):
        s, email, _ = member_session
        # Create a registration for this email
        events = requests.get(f"{API}/events").json()
        assert events
        ev_id = events[0]["id"]
        reg = requests.post(f"{API}/event-registrations", json={
            "event_id": ev_id, "name": "TEST Member",
            "email": email, "game_name": "TEST_GN"
        })
        assert reg.status_code == 200
        r = s.get(f"{API}/me/registrations")
        assert r.status_code == 200
        data = r.json()
        assert any(x.get("email") == email for x in data)

    def test_me_orders(self, member_session):
        s, email, _ = member_session
        prods = requests.get(f"{API}/products", params={"section": "merchandise"}).json()
        assert prods
        o = requests.post(f"{API}/orders", json={
            "product_id": prods[0]["id"], "quantity": 1,
            "customer_name": "TEST", "customer_email": email
        })
        assert o.status_code == 200
        r = s.get(f"{API}/me/orders")
        assert r.status_code == 200
        data = r.json()
        assert any(x.get("customer_email") == email for x in data)

    def test_me_unauth(self):
        for path in ["/me/applications", "/me/registrations", "/me/orders"]:
            r = requests.get(f"{API}{path}")
            assert r.status_code in (401, 403), f"{path} returned {r.status_code}"


# ============ /api/gallery ============
class TestGallery:
    created_id = None

    def test_get_gallery_public(self):
        r = requests.get(f"{API}/gallery")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 3, f"Expected 3+ seeded gallery items, got {len(data)}"
        for g in data:
            assert "_id" not in g
            assert "id" in g and "title" in g and "image_url" in g and "category" in g

    def test_filter_gallery_by_category(self):
        r = requests.get(f"{API}/gallery", params={"category": "match"})
        assert r.status_code == 200
        for g in r.json():
            assert g["category"] == "match"

    def test_create_gallery_admin(self, admin_session):
        r = admin_session.post(f"{API}/gallery", json={
            "title": f"TEST_Gallery_{int(time.time())}",
            "image_url": "https://example.com/img.jpg",
            "category": "match",
            "description": "Test"
        })
        assert r.status_code == 200, r.text
        TestGallery.created_id = r.json()["id"]

    def test_create_gallery_unauth(self):
        r = requests.post(f"{API}/gallery", json={
            "title": "X", "image_url": "https://example.com/x.jpg", "category": "match"
        })
        assert r.status_code in (401, 403)

    def test_delete_gallery_admin(self, admin_session):
        if not TestGallery.created_id:
            pytest.skip()
        r = admin_session.delete(f"{API}/gallery/{TestGallery.created_id}")
        assert r.status_code == 200

    def test_create_gallery_owner(self, owner_session):
        # Owner should also be able to manage gallery
        r = owner_session.post(f"{API}/gallery", json={
            "title": f"TEST_GalleryOwner_{int(time.time())}",
            "image_url": "https://example.com/o.jpg",
            "category": "mvp"
        })
        assert r.status_code == 200, r.text
        gid = r.json()["id"]
        d = owner_session.delete(f"{API}/gallery/{gid}")
        assert d.status_code == 200


# ============ Aamon leader seed ============
class TestAamonLeader:
    def test_aamon_is_leader(self):
        r = requests.get(f"{API}/members")
        assert r.status_code == 200
        members = r.json()
        # Leader is identified by is_leader=true or rank=Leader
        leaders = [m for m in members if m.get("is_leader") or str(m.get("rank", "")).lower() == "leader"]
        assert leaders, "No leader role found"
        aamon = next((m for m in leaders if "aamon" in m.get("game_name", "").lower() or "aamon" in m.get("name", "").lower()), None)
        assert aamon is not None, f"Aamon leader not found. Leaders: {[(l.get('game_name'), l.get('name')) for l in leaders]}"
        # Stats verification (support both naming conventions)
        wins = aamon.get("wins")
        mvps = aamon.get("mvps") or aamon.get("mvp_count")
        assert wins == 236, f"Expected 236 wins, got {wins}"
        assert mvps == 68, f"Expected 68 MVPs, got {mvps}"
        ach = aamon.get("achievements") or []
        if isinstance(ach, str):
            ach = [ach]
        assert any("duke of shadows" in str(a).lower() for a in ach), f"Missing 'The Duke of Shadows' achievement: {ach}"

    def test_coleader_phantom_renamed(self):
        members = requests.get(f"{API}/members").json()
        names = [m.get("game_name", "") for m in members]
        assert any("NECROLINK_Phantom" == n for n in names), f"Co-leader IGN not NECROLINK_Phantom: {names}"
        assert not any("DarkNet_Phantom" == n for n in names), f"Old DarkNet_Phantom should not exist: {names}"
