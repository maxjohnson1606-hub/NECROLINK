"""Backend API tests for NECROLINK MLBB clan website - iteration 2.
Covers events, registrations, news, products, orders, stats, upload, auth.
"""
import io
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@necrolink.com"
ADMIN_PASSWORD = "Necrolink2024!"
LEGACY_ADMIN_EMAIL = "admin@darknet.com"
LEGACY_ADMIN_PASSWORD = "DarkNet2024!"


# ============ Fixtures ============
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def anon():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ============ Auth: NECROLINK + Legacy ============
class TestAuth:
    def test_login_necrolink_admin(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["email"] == ADMIN_EMAIL
        assert body["role"] == "admin"
        assert "access_token" in s.cookies

    def test_login_legacy_admin(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": LEGACY_ADMIN_EMAIL, "password": LEGACY_ADMIN_PASSWORD})
        assert r.status_code == 200, f"Legacy admin must still work: {r.text}"
        body = r.json()
        assert body["email"] == LEGACY_ADMIN_EMAIL
        assert body["role"] == "admin"


# ============ Events ============
class TestEvents:
    created_id = None

    def test_get_events_list(self, anon):
        r = anon.get(f"{API}/events")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 3, f"Expected 3+ seeded events, got {len(data)}"
        for e in data:
            assert "id" in e
            assert "_id" not in e
            assert "title" in e
            assert "category" in e
            assert "event_date" in e
            assert "status" in e

    def test_filter_events_upcoming(self, anon):
        r = anon.get(f"{API}/events", params={"status": "upcoming"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for e in data:
            assert e["status"] == "upcoming"

    def test_create_event_admin(self, admin_session):
        payload = {
            "title": f"TEST_Event_{int(time.time())}",
            "description": "Test event description",
            "category": "Friday Night Clash",
            "event_date": "2026-06-15T20:00:00+00:00",
            "location": "Online",
            "status": "upcoming",
            "max_participants": 50,
            "prize_pool": "500 Diamonds",
            "banner_url": "https://example.com/banner.jpg"
        }
        r = admin_session.post(f"{API}/events", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "id" in body
        TestEvents.created_id = body["id"]
        # Verify via GET
        g = admin_session.get(f"{API}/events/{TestEvents.created_id}")
        assert g.status_code == 200
        ev = g.json()
        assert ev["title"] == payload["title"]
        assert ev["banner_url"] == payload["banner_url"]

    def test_create_event_unauth(self):
        r = requests.post(f"{API}/events", json={
            "title": "Hack", "description": "x", "category": "Y",
            "event_date": "2026-01-01T00:00:00+00:00"
        })
        assert r.status_code in (401, 403)

    def test_update_event(self, admin_session):
        if not TestEvents.created_id:
            pytest.skip("No event created")
        payload = {
            "title": f"TEST_Event_Updated_{int(time.time())}",
            "description": "Updated description",
            "category": "Friday Night Clash",
            "event_date": "2026-06-20T20:00:00+00:00",
            "location": "Online HQ",
            "status": "ongoing",
            "max_participants": 100,
            "prize_pool": "1000 Diamonds"
        }
        r = admin_session.put(f"{API}/events/{TestEvents.created_id}", json=payload)
        assert r.status_code == 200, r.text
        g = admin_session.get(f"{API}/events/{TestEvents.created_id}")
        assert g.json()["status"] == "ongoing"
        assert g.json()["location"] == "Online HQ"


# ============ Event Registrations ============
class TestEventRegistrations:
    reg_id = None
    test_event_id = None

    def test_create_registration_event_not_exist(self, anon):
        r = anon.post(f"{API}/event-registrations", json={
            "event_id": "507f1f77bcf86cd799439011",
            "name": "X", "email": "x@x.com", "game_name": "X"
        })
        assert r.status_code == 404

    def test_create_registration_public(self, anon, admin_session):
        # Get any event id
        events = admin_session.get(f"{API}/events").json()
        assert events
        TestEventRegistrations.test_event_id = events[0]["id"]
        r = anon.post(f"{API}/event-registrations", json={
            "event_id": TestEventRegistrations.test_event_id,
            "name": "TEST_Registrant",
            "email": f"TEST_reg_{int(time.time())}@necrolink.com",
            "game_name": f"TEST_GN_{int(time.time())}",
            "discord_username": "reg#1234",
            "notes": "Excited to join"
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert "id" in body
        TestEventRegistrations.reg_id = body["id"]

    def test_get_registrations_unauth(self):
        r = requests.get(f"{API}/event-registrations")
        assert r.status_code in (401, 403)

    def test_get_registrations_admin(self, admin_session):
        r = admin_session.get(f"{API}/event-registrations")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if TestEventRegistrations.reg_id:
            ids = [x["id"] for x in data]
            assert TestEventRegistrations.reg_id in ids

    def test_update_registration_status(self, admin_session):
        if not TestEventRegistrations.reg_id:
            pytest.skip("No reg created")
        r = admin_session.patch(
            f"{API}/event-registrations/{TestEventRegistrations.reg_id}/status",
            params={"status": "approved"}
        )
        assert r.status_code == 200


# ============ Event delete cascades registrations ============
class TestEventDeleteCascade:
    def test_delete_event_removes_registrations(self, admin_session):
        # Create event
        ev_resp = admin_session.post(f"{API}/events", json={
            "title": f"TEST_DeletableEvent_{int(time.time())}",
            "description": "x", "category": "Test",
            "event_date": "2026-07-01T00:00:00+00:00",
            "status": "upcoming"
        })
        assert ev_resp.status_code == 200
        ev_id = ev_resp.json()["id"]
        # Create reg
        reg_resp = requests.post(f"{API}/event-registrations", json={
            "event_id": ev_id, "name": "X",
            "email": f"TEST_cascade_{int(time.time())}@x.com", "game_name": "Xy"
        })
        assert reg_resp.status_code == 200
        # Delete event
        d = admin_session.delete(f"{API}/events/{ev_id}")
        assert d.status_code == 200
        # Verify registrations cleared - filter by event_id
        regs = admin_session.get(f"{API}/event-registrations", params={"event_id": ev_id}).json()
        assert all(r.get("event_id") != ev_id for r in regs)


# ============ News ============
class TestNews:
    created_id = None

    def test_get_news_public(self, anon):
        r = anon.get(f"{API}/news")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # All should be published
        for n in data:
            assert n.get("is_published") is True
            assert "id" in n
            assert "_id" not in n
        # Pinned first
        if len(data) >= 2:
            pinned_idx = [i for i, n in enumerate(data) if n.get("is_pinned")]
            non_pinned_idx = [i for i, n in enumerate(data) if not n.get("is_pinned")]
            if pinned_idx and non_pinned_idx:
                assert max(pinned_idx) < min(non_pinned_idx), "Pinned must come first"

    def test_filter_news_category(self, anon):
        r = anon.get(f"{API}/news", params={"category": "events"})
        assert r.status_code == 200
        for n in r.json():
            assert n["category"] == "events"

    def test_create_news_admin(self, admin_session):
        payload = {
            "title": f"TEST_News_{int(time.time())}",
            "content": "Test content",
            "category": "patch_notes",
            "is_pinned": True,
            "is_published": True,
            "image_url": "https://example.com/n.jpg"
        }
        r = admin_session.post(f"{API}/news", json=payload)
        assert r.status_code == 200, r.text
        TestNews.created_id = r.json()["id"]

    def test_create_news_unauth(self):
        r = requests.post(f"{API}/news", json={
            "title": "X", "content": "Y", "category": "patch_notes"
        })
        assert r.status_code in (401, 403)

    def test_update_news(self, admin_session):
        if not TestNews.created_id:
            pytest.skip()
        r = admin_session.put(f"{API}/news/{TestNews.created_id}", json={
            "title": "TEST_News_Updated",
            "content": "Updated",
            "category": "patch_notes",
            "is_pinned": False,
            "is_published": True
        })
        assert r.status_code == 200

    def test_delete_news(self, admin_session):
        if not TestNews.created_id:
            pytest.skip()
        r = admin_session.delete(f"{API}/news/{TestNews.created_id}")
        assert r.status_code == 200


# ============ Products ============
class TestProducts:
    created_id = None

    def test_get_products(self, anon):
        r = anon.get(f"{API}/products")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 4
        for p in data:
            assert "id" in p and "_id" not in p
            assert p.get("is_active") is True
            assert "section" in p and "price" in p

    def test_filter_products_section(self, anon):
        r = anon.get(f"{API}/products", params={"section": "merchandise"})
        assert r.status_code == 200
        for p in r.json():
            assert p["section"] == "merchandise"

        r2 = anon.get(f"{API}/products", params={"section": "topup"})
        assert r2.status_code == 200
        for p in r2.json():
            assert p["section"] == "topup"

    def test_filter_products_category(self, anon):
        r = anon.get(f"{API}/products", params={"category": "jersey"})
        assert r.status_code == 200
        for p in r.json():
            assert p["category"] == "jersey"

    def test_create_product_admin(self, admin_session):
        payload = {
            "name": f"TEST_Product_{int(time.time())}",
            "description": "Test merch",
            "price": 29.99,
            "category": "tshirt",
            "section": "merchandise",
            "image_url": "https://example.com/p.jpg",
            "is_active": True,
            "stock": 10
        }
        r = admin_session.post(f"{API}/products", json=payload)
        assert r.status_code == 200, r.text
        TestProducts.created_id = r.json()["id"]

    def test_create_product_unauth(self):
        r = requests.post(f"{API}/products", json={
            "name": "X", "description": "Y", "price": 1.0,
            "category": "tshirt", "section": "merchandise"
        })
        assert r.status_code in (401, 403)

    def test_update_product(self, admin_session):
        if not TestProducts.created_id:
            pytest.skip()
        r = admin_session.put(f"{API}/products/{TestProducts.created_id}", json={
            "name": "TEST_Product_Updated",
            "description": "y",
            "price": 39.99,
            "category": "tshirt",
            "section": "merchandise",
            "is_active": True,
            "stock": 5
        })
        assert r.status_code == 200


# ============ Orders ============
class TestOrders:
    order_id = None
    product_id = None

    def test_create_order_public(self, anon, admin_session):
        # Get a merchandise product
        prods = admin_session.get(f"{API}/products", params={"section": "merchandise"}).json()
        assert prods
        TestOrders.product_id = prods[0]["id"]
        expected_price = prods[0]["price"]
        expected_name = prods[0]["name"]

        r = anon.post(f"{API}/orders", json={
            "product_id": TestOrders.product_id,
            "quantity": 2,
            "customer_name": "TEST_Customer",
            "customer_email": f"TEST_cust_{int(time.time())}@necrolink.com",
            "customer_phone": "+12345"
        })
        assert r.status_code == 200, r.text
        TestOrders.order_id = r.json()["id"]

        # Verify total_price + product_name via admin GET
        orders = admin_session.get(f"{API}/orders").json()
        o = next((x for x in orders if x["id"] == TestOrders.order_id), None)
        assert o is not None
        assert o["product_name"] == expected_name
        assert o["total_price"] == expected_price * 2
        assert o["status"] == "pending"

    def test_create_order_topup_with_game_ids(self, anon, admin_session):
        prods = admin_session.get(f"{API}/products", params={"section": "topup"}).json()
        assert prods
        pid = prods[0]["id"]
        r = anon.post(f"{API}/orders", json={
            "product_id": pid,
            "quantity": 1,
            "customer_name": "TEST_TopupCustomer",
            "customer_email": f"TEST_top_{int(time.time())}@necrolink.com",
            "game_id": "1234567",
            "server_id": "8888"
        })
        assert r.status_code == 200

    def test_get_orders_unauth(self):
        r = requests.get(f"{API}/orders")
        assert r.status_code in (401, 403)

    def test_update_order_status(self, admin_session):
        if not TestOrders.order_id:
            pytest.skip()
        r = admin_session.patch(
            f"{API}/orders/{TestOrders.order_id}/status",
            params={"status": "completed"}
        )
        assert r.status_code == 200


# ============ Stats ============
class TestStats:
    def test_stats_unauth(self):
        r = requests.get(f"{API}/stats")
        assert r.status_code in (401, 403)

    def test_stats_admin(self, admin_session):
        r = admin_session.get(f"{API}/stats")
        assert r.status_code == 200
        s = r.json()
        for key in [
            "members", "events", "news_articles", "products",
            "orders", "event_registrations", "pending_applications"
        ]:
            assert key in s, f"Missing key {key} in stats"
            assert isinstance(s[key], int)


# ============ Upload ============
class TestUpload:
    def test_upload_unauth(self):
        r = requests.post(f"{API}/upload",
                          files={"file": ("test.png", b"fakepng", "image/png")})
        assert r.status_code in (401, 403)

    def test_upload_admin_image(self, admin_session):
        # Tiny valid 1x1 PNG
        png_bytes = bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489"
            "0000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
        )
        # Note: requests.Session uses Content-Type: application/json header set in fixture;
        # need to override for multipart.
        s = requests.Session()
        s.cookies.update(admin_session.cookies)
        r = s.post(f"{API}/upload",
                   files={"file": ("t.png", png_bytes, "image/png")})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "url" in body and "path" in body
        # Try to download it
        url_path = body["url"]
        full = f"{BASE_URL}{url_path}"
        d = requests.get(full)
        assert d.status_code == 200
        assert d.headers.get("Content-Type", "").startswith("image/")

    def test_upload_reject_nonimage(self, admin_session):
        s = requests.Session()
        s.cookies.update(admin_session.cookies)
        r = s.post(f"{API}/upload",
                   files={"file": ("t.txt", b"hello", "text/plain")})
        assert r.status_code == 400
