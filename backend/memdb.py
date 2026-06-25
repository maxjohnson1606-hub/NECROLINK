"""
In-memory MongoDB replacement for when Atlas is unreachable.
Provides the same async API as Motor/PyMongo so server.py routes work unchanged.
"""
import copy
import re as _re
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt


# ─── Cursor ──────────────────────────────────────────────────────────────────

class _MemCursor:
    def __init__(self, docs):
        self._docs = list(docs)

    def sort(self, keys, direction=None):
        """Support both sort("field", -1) and sort([("field", -1), ...])"""
        if isinstance(keys, str):
            keys = [(keys, direction if direction is not None else 1)]
        for key, direc in reversed(keys):
            self._docs.sort(
                key=lambda d: (_sort_val(d.get(key)),),
                reverse=(direc == -1)
            )
        return self

    def limit(self, n):
        if n and n > 0:
            self._docs = self._docs[:n]
        return self

    def skip(self, n):
        if n and n > 0:
            self._docs = self._docs[n:]
        return self

    async def to_list(self, length=None):
        docs = copy.deepcopy(self._docs)
        if length:
            docs = docs[:length]
        return [_serialize(d) for d in docs]

    def __aiter__(self):
        self._idx = 0
        return self

    async def __anext__(self):
        if self._idx >= len(self._docs):
            raise StopAsyncIteration
        doc = _serialize(copy.deepcopy(self._docs[self._idx]))
        self._idx += 1
        return doc


def _sort_val(v):
    if v is None:
        return (0, '')
    if isinstance(v, bool):
        return (1, int(v))
    if isinstance(v, (int, float)):
        return (1, v)
    if isinstance(v, datetime):
        return (1, v.timestamp())
    return (2, str(v))


def _serialize(obj):
    """Recursively convert ObjectId → str so FastAPI can JSON-encode MemDB docs."""
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(v) for v in obj]
    if isinstance(obj, ObjectId):
        return str(obj)
    return obj


# ─── Collection ──────────────────────────────────────────────────────────────

class _MemCollection:
    def __init__(self, docs=None):
        self._docs = [copy.deepcopy(d) for d in (docs or [])]

    # ── Query matching ────────────────────────────────────────────────────────
    def _match_all(self, query):
        if not query:
            return list(self._docs)
        return [d for d in self._docs if self._matches(d, query)]

    def _matches(self, doc, query):
        for key, val in query.items():
            if key == '$or':
                if not any(self._matches(doc, sub) for sub in val):
                    return False
            elif key == '$and':
                if not all(self._matches(doc, sub) for sub in val):
                    return False
            elif key == '$nor':
                if any(self._matches(doc, sub) for sub in val):
                    return False
            elif isinstance(val, dict):
                dv = doc.get(key)
                if '$regex' in val:
                    flags = _re.IGNORECASE if 'i' in val.get('$options', '') else 0
                    if not (dv and _re.search(val['$regex'], str(dv), flags)):
                        return False
                elif '$in' in val:
                    if dv not in val['$in']:
                        return False
                elif '$nin' in val:
                    if dv in val['$nin']:
                        return False
                elif '$ne' in val:
                    if dv == val['$ne']:
                        return False
                elif '$gt' in val:
                    if not (dv is not None and dv > val['$gt']):
                        return False
                elif '$gte' in val:
                    if not (dv is not None and dv >= val['$gte']):
                        return False
                elif '$lt' in val:
                    if not (dv is not None and dv < val['$lt']):
                        return False
                elif '$lte' in val:
                    if not (dv is not None and dv <= val['$lte']):
                        return False
                elif '$exists' in val:
                    exists = key in doc
                    if val['$exists'] != exists:
                        return False
            else:
                # Handle nested keys like "value.text"
                if '.' in key:
                    parts = key.split('.', 1)
                    nested = doc.get(parts[0])
                    if not isinstance(nested, dict) or nested.get(parts[1]) != val:
                        return False
                elif doc.get(key) != val:
                    return False
        return True

    # ── CRUD ─────────────────────────────────────────────────────────────────
    async def find_one(self, query=None, projection=None, sort=None):
        results = self._match_all(query or {})
        if sort and results:
            if isinstance(sort, list):
                for key, direc in reversed(sort):
                    results.sort(key=lambda d: _sort_val(d.get(key)), reverse=(direc == -1))
            elif isinstance(sort, str):
                results.sort(key=lambda d: _sort_val(d.get(sort)))
        return _serialize(copy.deepcopy(results[0])) if results else None

    def find(self, query=None, projection=None):
        results = self._match_all(query or {})
        return _MemCursor(copy.deepcopy(results))

    async def insert_one(self, doc):
        new_doc = copy.deepcopy(doc)
        if '_id' not in new_doc:
            new_doc['_id'] = ObjectId()
        self._docs.append(new_doc)
        class _R:
            inserted_id = new_doc['_id']
        return _R()

    async def insert_many(self, docs):
        ids = []
        for doc in docs:
            r = await self.insert_one(doc)
            ids.append(r.inserted_id)
        class _R:
            inserted_ids = ids
        return _R()

    async def update_one(self, query, update, upsert=False):
        results = self._match_all(query)
        class _R:
            matched_count = 0
            modified_count = 0
            upserted_id = None
        r = _R()
        if results:
            idx = next(i for i, d in enumerate(self._docs) if d is results[0] or d == results[0])
            r.matched_count = 1
            if '$set' in update:
                self._docs[idx].update(update['$set'])
                r.modified_count = 1
            if '$inc' in update:
                for k, v in update['$inc'].items():
                    self._docs[idx][k] = self._docs[idx].get(k, 0) + v
                r.modified_count = 1
            if '$push' in update:
                for k, v in update['$push'].items():
                    if k not in self._docs[idx]:
                        self._docs[idx][k] = []
                    self._docs[idx][k].append(v)
                r.modified_count = 1
            if '$unset' in update:
                for k in update['$unset']:
                    self._docs[idx].pop(k, None)
                r.modified_count = 1
        elif upsert:
            new_doc = {**query, **update.get('$set', {})}
            res = await self.insert_one(new_doc)
            r.upserted_id = res.inserted_id
        return r

    async def update_many(self, query, update):
        results = self._match_all(query)
        for res in results:
            for i, d in enumerate(self._docs):
                if d is res or d == res:
                    if '$set' in update:
                        self._docs[i].update(update['$set'])
                    if '$inc' in update:
                        for k, v in update['$inc'].items():
                            self._docs[i][k] = self._docs[i].get(k, 0) + v
        class _R:
            matched_count = len(results)
            modified_count = len(results)
        return _R()

    async def delete_one(self, query):
        results = self._match_all(query)
        class _R:
            deleted_count = 0
        r = _R()
        if results:
            try:
                self._docs.remove(results[0])
            except ValueError:
                for i, d in enumerate(self._docs):
                    if d == results[0]:
                        self._docs.pop(i)
                        break
            r.deleted_count = 1
        return r

    async def delete_many(self, query):
        results = self._match_all(query)
        count = 0
        for res in results:
            try:
                self._docs.remove(res)
                count += 1
            except ValueError:
                pass
        class _R:
            deleted_count = count
        return _R()

    async def count_documents(self, query=None):
        return len(self._match_all(query or {}))

    async def distinct(self, field, query=None):
        results = self._match_all(query or {})
        return list(set(d.get(field) for d in results if d.get(field) is not None))

    async def create_index(self, *args, **kwargs):
        pass  # no-op


# ─── Database ─────────────────────────────────────────────────────────────────

class _MemDB:
    def __init__(self, collections: dict):
        self._cols = collections

    def __getattr__(self, name):
        if name.startswith('_'):
            raise AttributeError(name)
        if name not in self._cols:
            self._cols[name] = _MemCollection()
        return self._cols[name]

    def __getitem__(self, name):
        return getattr(self, name)


# ─── Seed Data ────────────────────────────────────────────────────────────────

def _h(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def create_mem_db() -> _MemDB:
    now = datetime.now(timezone.utc)

    # ── Users ─────────────────────────────────────────────────────────────────
    owner_id = ObjectId()
    admin_id = ObjectId()
    users = [
        {
            "_id": owner_id,
            "email": "owner@necrolink.com",
            "password_hash": _h("Owner2024!"),
            "name": "NECROLINK Owner",
            "game_name": "NECROLINK_Owner",
            "preferred_role": "Leader",
            "role": "owner",
            "created_at": now - timedelta(days=365),
        },
        {
            "_id": admin_id,
            "email": "admin@necrolink.com",
            "password_hash": _h("Necrolink2024!"),
            "name": "NECROLINK Admin",
            "game_name": "NECROLINK_Admin",
            "preferred_role": "Admin",
            "role": "admin",
            "created_at": now - timedelta(days=300),
        },
    ]

    # ── Members ───────────────────────────────────────────────────────────────
    members = [
        {
            "_id": ObjectId(), "name": "ShadowReaper", "game_name": "NECROLINK_Aamon",
            "role": "Leader", "rank": "Mythical Glory", "wins": 1248, "losses": 312,
            "mvp_count": 487, "points": 9850, "main_heroes": ["Aamon", "Lancelot", "Gusion"],
            "avatar_url": "/assets/leader.png",
            "bio": "Founder and Leader of NECROLINK. Jungle main. Mythical Glory for 3 consecutive seasons. 72% win rate. Silent, Shadow, Deadly.",
            "mlbb_id": "123456789", "server_id": "5001",
            "achievements": ["Mythical Glory S24", "Mythical Glory S25", "Dark Cup Champion", "Top 3 Global Aamon"],
            "status": "active", "join_date": (now - timedelta(days=365)).isoformat(),
            "created_at": now - timedelta(days=365),
        },
        {
            "_id": ObjectId(), "name": "BlazeTrigger", "game_name": "NECROLINK_Beatrix",
            "role": "Co-Leader", "rank": "Mythic", "wins": 876, "losses": 234,
            "mvp_count": 312, "points": 7200, "main_heroes": ["Beatrix", "Granger", "Lesley"],
            "avatar_url": "/assets/coleader.png",
            "bio": "Co-Leader and Gold Lane specialist. Beatrix main with 71% win rate. Focus. Aim. Dominate.",
            "mlbb_id": "987654321", "server_id": "5001",
            "achievements": ["Mythic S25", "Top 50 Global Beatrix", "MVP of Dark Cup 2025"],
            "status": "active", "join_date": (now - timedelta(days=310)).isoformat(),
            "created_at": now - timedelta(days=310),
        },
        {
            "_id": ObjectId(), "name": "NeonWitch", "game_name": "NECROLINK_Lylia",
            "role": "Officer", "rank": "Legend", "wins": 654, "losses": 198,
            "mvp_count": 201, "points": 5400, "main_heroes": ["Lylia", "Valir", "Pharsa"],
            "avatar_url": "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200",
            "bio": "Mage specialist. NeonWitch makes the battlefield glow.",
            "mlbb_id": "456789123", "server_id": "5001",
            "achievements": ["Legend S25", "Best Mage Award"],
            "status": "active", "join_date": (now - timedelta(days=280)).isoformat(),
            "created_at": now - timedelta(days=280),
        },
        {
            "_id": ObjectId(), "name": "IronTank", "game_name": "NECROLINK_Khufra",
            "role": "Officer", "rank": "Legend", "wins": 723, "losses": 245,
            "mvp_count": 178, "points": 4800, "main_heroes": ["Khufra", "Atlas", "Johnson"],
            "avatar_url": "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=200",
            "bio": "The team's anchor. IronTank never lets the enemy get through.",
            "mlbb_id": "789123456", "server_id": "5001",
            "achievements": ["Legend S24", "Legend S25"],
            "status": "active", "join_date": (now - timedelta(days=250)).isoformat(),
            "created_at": now - timedelta(days=250),
        },
        {
            "_id": ObjectId(), "name": "BlazeMark", "game_name": "NECROLINK_Clint",
            "role": "Veteran", "rank": "Epic", "wins": 512, "losses": 189,
            "mvp_count": 145, "points": 3600, "main_heroes": ["Clint", "Bruno", "Lesley"],
            "avatar_url": "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200",
            "bio": "Marksman main. BlazeMark hits every shot.",
            "mlbb_id": "321654987", "server_id": "5001",
            "achievements": ["Epic S25"],
            "status": "active", "join_date": (now - timedelta(days=220)).isoformat(),
            "created_at": now - timedelta(days=220),
        },
        {
            "_id": ObjectId(), "name": "StealthBlade", "game_name": "NECROLINK_Lancelot",
            "role": "Veteran", "rank": "Epic", "wins": 489, "losses": 201,
            "mvp_count": 132, "points": 3200, "main_heroes": ["Lancelot", "Zilong", "Roger"],
            "avatar_url": "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200",
            "bio": "Fighter/Assassin hybrid. StealthBlade strikes from the shadows.",
            "mlbb_id": "654321789", "server_id": "5001",
            "achievements": ["Epic S24"],
            "status": "active", "join_date": (now - timedelta(days=190)).isoformat(),
            "created_at": now - timedelta(days=190),
        },
        {
            "_id": ObjectId(), "name": "HolySupport", "game_name": "NECROLINK_Estes",
            "role": "Member", "rank": "Grandmaster", "wins": 356, "losses": 178,
            "mvp_count": 89, "points": 2400, "main_heroes": ["Estes", "Angela", "Floryn"],
            "avatar_url": "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=200",
            "bio": "Best support you will ever have. HolySupport keeps the team alive.",
            "mlbb_id": "111222333", "server_id": "5001",
            "achievements": ["Grandmaster S25"],
            "status": "active", "join_date": (now - timedelta(days=160)).isoformat(),
            "created_at": now - timedelta(days=160),
        },
        {
            "_id": ObjectId(), "name": "DragonRider", "game_name": "NECROLINK_Barats",
            "role": "Member", "rank": "Grandmaster", "wins": 298, "losses": 143,
            "mvp_count": 76, "points": 1900, "main_heroes": ["Barats", "Badang", "Fredrinn"],
            "avatar_url": "https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg?auto=compress&cs=tinysrgb&w=200",
            "bio": "Unstoppable with Barats. DragonRider rides into victory every match.",
            "mlbb_id": "444555666", "server_id": "5001",
            "achievements": ["Grandmaster S24"],
            "status": "active", "join_date": (now - timedelta(days=130)).isoformat(),
            "created_at": now - timedelta(days=130),
        },
        {
            "_id": ObjectId(), "name": "VoidWalker", "game_name": "NECROLINK_Selena",
            "role": "Member", "rank": "Master", "wins": 234, "losses": 156,
            "mvp_count": 54, "points": 1500, "main_heroes": ["Selena", "Nana", "Kagura"],
            "avatar_url": "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
            "bio": "Mage/Support flex player. VoidWalker adapts to any team composition.",
            "mlbb_id": "777888999", "server_id": "5001",
            "achievements": ["Master S25"],
            "status": "active", "join_date": (now - timedelta(days=100)).isoformat(),
            "created_at": now - timedelta(days=100),
        },
        {
            "_id": ObjectId(), "name": "ThunderStrike", "game_name": "NECROLINK_Chou",
            "role": "Member", "rank": "Master", "wins": 187, "losses": 123,
            "mvp_count": 43, "points": 1200, "main_heroes": ["Chou", "Yu Zhong", "Paquito"],
            "avatar_url": "https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=200",
            "bio": "Fighter main grinding toward Legend. ThunderStrike hits hard every match.",
            "mlbb_id": "112233445", "server_id": "5001",
            "achievements": [],
            "status": "active", "join_date": (now - timedelta(days=70)).isoformat(),
            "created_at": now - timedelta(days=70),
        },
        {
            "_id": ObjectId(), "name": "ArcaneHunter", "game_name": "NECROLINK_Granger",
            "role": "Recruit", "rank": "Elite", "wins": 89, "losses": 67,
            "mvp_count": 18, "points": 600, "main_heroes": ["Granger", "Wanwan", "Yi Sun-shin"],
            "avatar_url": "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=200",
            "bio": "Rising marksman talent. ArcaneHunter is one to watch.",
            "mlbb_id": "998877665", "server_id": "5001",
            "achievements": [],
            "status": "active", "join_date": (now - timedelta(days=30)).isoformat(),
            "created_at": now - timedelta(days=30),
        },
        {
            "_id": ObjectId(), "name": "FrostByte", "game_name": "NECROLINK_Aurora",
            "role": "Recruit", "rank": "Warrior", "wins": 45, "losses": 41,
            "mvp_count": 9, "points": 300, "main_heroes": ["Aurora", "Eudora", "Cyclops"],
            "avatar_url": "https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=200",
            "bio": "New recruit with huge potential. FrostByte is learning fast.",
            "mlbb_id": "556677889", "server_id": "5001",
            "achievements": [],
            "status": "active", "join_date": (now - timedelta(days=10)).isoformat(),
            "created_at": now - timedelta(days=10),
        },
    ]

    # ── Events ────────────────────────────────────────────────────────────────
    events = [
        {
            "_id": ObjectId(), "title": "NECROLINK Dark Cup 2026",
            "description": "Our flagship monthly tournament. 16 teams battle for the Dark Cup title and 10,000 Diamonds.",
            "category": "NECROLINK Dark Cup",
            "event_date": (now + timedelta(days=14)).isoformat(),
            "location": "Online", "status": "upcoming",
            "max_participants": 64, "prize_pool": "10,000 Diamonds + Champion Title",
            "banner_url": "https://images.pexels.com/photos/9072394/pexels-photo-9072394.jpeg?auto=compress&cs=tinysrgb&w=940",
            "created_at": now - timedelta(days=7),
        },
        {
            "_id": ObjectId(), "title": "Friday Night Clash #48",
            "description": "Weekly Friday custom matches. Join voice chat, make friends, and climb the informal leaderboard.",
            "category": "Friday Night Clash",
            "event_date": (now + timedelta(days=3)).isoformat(),
            "location": "Online", "status": "upcoming",
            "max_participants": 20, "prize_pool": "Bragging Rights",
            "banner_url": "https://images.pexels.com/photos/7862505/pexels-photo-7862505.jpeg?auto=compress&cs=tinysrgb&w=940",
            "created_at": now - timedelta(days=3),
        },
        {
            "_id": ObjectId(), "title": "Sunday Championship",
            "description": "This week's Sunday Championship is live! Best of 3 format, drafting enabled.",
            "category": "Sunday Championship",
            "event_date": now.isoformat(),
            "location": "Online", "status": "ongoing",
            "max_participants": 10, "prize_pool": "500 Diamonds",
            "banner_url": "https://images.pexels.com/photos/17195067/pexels-photo-17195067.jpeg?auto=compress&cs=tinysrgb&w=940",
            "created_at": now - timedelta(days=1),
        },
        {
            "_id": ObjectId(), "title": "Rank Push Night",
            "description": "Duo and trio rank push session. We focus on climbing the ladder together.",
            "category": "Rank Push Night",
            "event_date": (now - timedelta(days=3)).isoformat(),
            "location": "Online", "status": "completed",
            "max_participants": 12, "prize_pool": "None",
            "banner_url": "https://images.pexels.com/photos/7862505/pexels-photo-7862505.jpeg?auto=compress&cs=tinysrgb&w=940",
            "created_at": now - timedelta(days=10),
        },
        {
            "_id": ObjectId(), "title": "Mystery Hero Challenge",
            "description": "Random hero assignment. Win 3 matches in a row with your random hero for the crown.",
            "category": "Mystery Hero Challenge",
            "event_date": (now - timedelta(days=14)).isoformat(),
            "location": "Online", "status": "completed",
            "max_participants": 10, "prize_pool": "200 Diamonds",
            "banner_url": "https://images.pexels.com/photos/17195067/pexels-photo-17195067.jpeg?auto=compress&cs=tinysrgb&w=940",
            "created_at": now - timedelta(days=21),
        },
    ]

    # ── News ──────────────────────────────────────────────────────────────────
    news = [
        {
            "_id": ObjectId(), "title": "NECROLINK Dark Cup 2026 Registration OPEN",
            "content": "Registration is now open for our biggest tournament of the year. 16 teams, 10,000 Diamond prize pool, and the prestigious Dark Cup title. Sign up before spots fill!",
            "category": "events", "is_pinned": True, "is_featured": True, "is_published": True,
            "image_url": "https://images.pexels.com/photos/9072394/pexels-photo-9072394.jpeg?auto=compress&cs=tinysrgb&w=940",
            "source_url": None, "created_at": now - timedelta(days=1),
        },
        {
            "_id": ObjectId(), "title": "Patch 1.9.44 — Cici & Claude Revamps",
            "content": "Patch 1.9.44 drops major balance changes. Cici gets a complete kit rework focusing on crowd control, while Claude receives buffs to his Clone Techniques damage output. Fredrinn, Yin, and Minsitthar also see adjustments.",
            "category": "patch_notes", "is_pinned": False, "is_featured": True, "is_published": True,
            "image_url": "https://images.pexels.com/photos/7862505/pexels-photo-7862505.jpeg?auto=compress&cs=tinysrgb&w=940",
            "source_url": "https://www.mobilelegends.com", "created_at": now - timedelta(days=2),
        },
        {
            "_id": ObjectId(), "title": "New Hero: Zhuxin — The Spirit Dancer",
            "content": "MLBB's newest hero Zhuxin arrives in Patch 1.9.44. She is a Support hero with powerful healing auras and the ability to link allied heroes, sharing damage reduction across the team.",
            "category": "new_heroes", "is_pinned": False, "is_featured": False, "is_published": True,
            "image_url": "https://images.pexels.com/photos/17195067/pexels-photo-17195067.jpeg?auto=compress&cs=tinysrgb&w=940",
            "source_url": "https://www.mobilelegends.com", "created_at": now - timedelta(days=4),
        },
        {
            "_id": ObjectId(), "title": "Kagura 'Spring Blossom' Skin — Limited Time",
            "content": "The new Kagura Spring Blossom skin is now available in the Lucky Box for a limited time. Cherry blossom animations on all skills, unique voice lines and a special recall animation.",
            "category": "new_skins", "is_pinned": False, "is_featured": False, "is_published": True,
            "image_url": "https://images.pexels.com/photos/17195067/pexels-photo-17195067.jpeg?auto=compress&cs=tinysrgb&w=940",
            "source_url": "https://www.mobilelegends.com", "created_at": now - timedelta(days=6),
        },
        {
            "_id": ObjectId(), "title": "M7 World Championship — Group Stage Results",
            "content": "The M7 World Championship Group Stage is complete. Team Liquid, Echo, and RSG advance from Group A while ONIC, Blacklist, and Nexplay lead Group B. Knockout stage begins next week.",
            "category": "mlbb_esports", "is_pinned": False, "is_featured": False, "is_published": True,
            "image_url": "https://images.pexels.com/photos/7862505/pexels-photo-7862505.jpeg?auto=compress&cs=tinysrgb&w=940",
            "source_url": "https://esports.mobilelegends.com", "created_at": now - timedelta(days=7),
        },
        {
            "_id": ObjectId(), "title": "Gusion Hero Revamp — Complete Kit Overhaul",
            "content": "Gusion's long-awaited revamp is here. His Shadowblade Slaughter has been redesigned for smoother combos, while Holy Blade gets enhanced visual effects. The new passive Moonlit Waltz adds a stamina system for advanced play.",
            "category": "hero_revamps", "is_pinned": False, "is_featured": False, "is_published": True,
            "image_url": "https://images.pexels.com/photos/9072394/pexels-photo-9072394.jpeg?auto=compress&cs=tinysrgb&w=940",
            "source_url": "https://www.mobilelegends.com", "created_at": now - timedelta(days=10),
        },
        {
            "_id": ObjectId(), "title": "MLBB x Transformers Collaboration Announced",
            "content": "Mobile Legends: Bang Bang announces an epic collaboration with the Transformers franchise. Six heroes will receive exclusive Transformers-themed skins. Details on the collaboration event revealed at the end of the month.",
            "category": "collaborations", "is_pinned": False, "is_featured": False, "is_published": True,
            "image_url": "https://images.pexels.com/photos/17195067/pexels-photo-17195067.jpeg?auto=compress&cs=tinysrgb&w=940",
            "source_url": "https://www.mobilelegends.com", "created_at": now - timedelta(days=12),
        },
        {
            "_id": ObjectId(), "title": "ShadowReaper Hits #3 Global — NECROLINK Proud",
            "content": "Our clan leader ShadowReaper (NECROLINK_Aamon) has reached #3 on the global leaderboard this season! 487 MVPs, 1248 wins, and Mythical Glory. The entire clan celebrates this incredible achievement.",
            "category": "community_news", "is_pinned": False, "is_featured": False, "is_published": True,
            "image_url": "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=200",
            "source_url": None, "created_at": now - timedelta(days=15),
        },
        {
            "_id": ObjectId(), "title": "Season 32 Grand Finals — Tournament Recap",
            "content": "NECROLINK sent two teams to the Season 32 Grand Finals. Team Necro Alpha finished 2nd, winning 5,000 diamonds and the Finalist title. A proud result for our community.",
            "category": "tournaments", "is_pinned": False, "is_featured": False, "is_published": True,
            "image_url": "https://images.pexels.com/photos/7862505/pexels-photo-7862505.jpeg?auto=compress&cs=tinysrgb&w=940",
            "source_url": None, "created_at": now - timedelta(days=20),
        },
        {
            "_id": ObjectId(), "title": "Game Update 1.9.42 — Roamer System Changes",
            "content": "The Roaming system gets a significant update in 1.9.42. Roamer items now grant a new passive called Roam Bonus activating after 5 assists. Several tank items rebalanced. Jungle respawn timer adjusted.",
            "category": "game_updates", "is_pinned": False, "is_featured": False, "is_published": True,
            "image_url": "https://images.pexels.com/photos/17195067/pexels-photo-17195067.jpeg?auto=compress&cs=tinysrgb&w=940",
            "source_url": "https://www.mobilelegends.com", "created_at": now - timedelta(days=25),
        },
    ]

    # ── Products ──────────────────────────────────────────────────────────────
    products = [
        {
            "_id": ObjectId(), "name": "NECROLINK Jersey 2026",
            "description": "Official NECROLINK clan jersey. Neon purple embroidery, moisture-wicking fabric, available in S/M/L/XL.",
            "price": 49.99, "category": "jersey", "section": "merchandise",
            "is_active": True, "stock": 50,
            "image_url": "https://images.pexels.com/photos/7773546/pexels-photo-7773546.jpeg?auto=compress&cs=tinysrgb&w=400",
            "created_at": now - timedelta(days=60),
        },
        {
            "_id": ObjectId(), "name": "NECROLINK Hoodie",
            "description": "Premium black hoodie with neon purple NECROLINK logo. Fleece-lined, perfect for gaming sessions.",
            "price": 59.99, "category": "hoodie", "section": "merchandise",
            "is_active": True, "stock": 30,
            "image_url": "https://images.pexels.com/photos/7773546/pexels-photo-7773546.jpeg?auto=compress&cs=tinysrgb&w=400",
            "created_at": now - timedelta(days=60),
        },
        {
            "_id": ObjectId(), "name": "Gaming Mousepad XL",
            "description": "900×400mm RGB gaming mousepad with stitched edges and NECROLINK skull art. Non-slip base.",
            "price": 24.99, "category": "mousepad", "section": "merchandise",
            "is_active": True, "stock": 100,
            "image_url": "https://images.pexels.com/photos/7862505/pexels-photo-7862505.jpeg?auto=compress&cs=tinysrgb&w=400",
            "created_at": now - timedelta(days=60),
        },
        {
            "_id": ObjectId(), "name": "NECROLINK Sticker Pack",
            "description": "10x premium die-cut vinyl stickers. NECROLINK skull, heroes, and slogan designs. Waterproof.",
            "price": 4.99, "category": "sticker", "section": "merchandise",
            "is_active": True, "stock": 200,
            "image_url": "https://images.pexels.com/photos/17195067/pexels-photo-17195067.jpeg?auto=compress&cs=tinysrgb&w=400",
            "created_at": now - timedelta(days=60),
        },
        {
            "_id": ObjectId(), "name": "86 Diamonds",
            "description": "Top-up 86 Diamonds instantly to your MLBB account. Fast delivery, secure transaction.",
            "price": 1.99, "category": "diamonds", "section": "topup",
            "is_active": True, "stock": None,
            "image_url": None, "created_at": now - timedelta(days=30),
        },
        {
            "_id": ObjectId(), "name": "172 Diamonds",
            "description": "Top-up 172 Diamonds to your MLBB account. Double the value for ranked pushes.",
            "price": 3.49, "category": "diamonds", "section": "topup",
            "is_active": True, "stock": None,
            "image_url": None, "created_at": now - timedelta(days=30),
        },
        {
            "_id": ObjectId(), "name": "706 Diamonds",
            "description": "Top-up 706 Diamonds — the most popular pack for Event Pass and Starlight purchases.",
            "price": 12.99, "category": "diamonds", "section": "topup",
            "is_active": True, "stock": None,
            "image_url": None, "created_at": now - timedelta(days=30),
        },
        {
            "_id": ObjectId(), "name": "Weekly Diamond Pass",
            "description": "7-day daily Diamond rewards. Includes 50 bonus diamonds on activation day.",
            "price": 1.49, "category": "weekly_pass", "section": "topup",
            "is_active": True, "stock": None,
            "image_url": None, "created_at": now - timedelta(days=30),
        },
        {
            "_id": ObjectId(), "name": "Starlight Membership",
            "description": "30-day Starlight with exclusive skins, weekly missions, and free diamonds.",
            "price": 4.99, "category": "starlight", "section": "topup",
            "is_active": True, "stock": None,
            "image_url": None, "created_at": now - timedelta(days=30),
        },
        {
            "_id": ObjectId(), "name": "Event Pass — Current Season",
            "description": "Access all current season event rewards, exclusive skins, and bonus currency.",
            "price": 7.99, "category": "event_pass", "section": "topup",
            "is_active": True, "stock": None,
            "image_url": None, "created_at": now - timedelta(days=30),
        },
    ]

    # ── Gallery ───────────────────────────────────────────────────────────────
    gallery = [
        {
            "_id": ObjectId(), "title": "Dark Cup 2025 — Champions",
            "description": "NECROLINK team clinches the Dark Cup championship. ShadowReaper carries the final game.",
            "category": "match",
            "image_url": "https://images.pexels.com/photos/7862505/pexels-photo-7862505.jpeg?auto=compress&cs=tinysrgb&w=940",
            "created_at": now - timedelta(days=45),
        },
        {
            "_id": ObjectId(), "title": "ShadowReaper — Triple Kill Aamon",
            "description": "ShadowReaper's legendary Aamon triple kill in the Season 31 finals. 35 kills in one match.",
            "category": "mvp",
            "image_url": "https://images.pexels.com/photos/9072394/pexels-photo-9072394.jpeg?auto=compress&cs=tinysrgb&w=940",
            "created_at": now - timedelta(days=30),
        },
        {
            "_id": ObjectId(), "title": "NECROLINK Team Lineup 2026",
            "description": "The full NECROLINK roster assembled for the 2026 season photo. 12 strong.",
            "category": "team",
            "image_url": "https://images.pexels.com/photos/17195067/pexels-photo-17195067.jpeg?auto=compress&cs=tinysrgb&w=940",
            "created_at": now - timedelta(days=20),
        },
        {
            "_id": ObjectId(), "title": "Friday Night Clash Highlights",
            "description": "Best moments from Friday Night Clash #45. CryptoKnight's Fanny cable dance wins the match.",
            "category": "match",
            "image_url": "https://images.pexels.com/photos/7862505/pexels-photo-7862505.jpeg?auto=compress&cs=tinysrgb&w=940",
            "created_at": now - timedelta(days=12),
        },
        {
            "_id": ObjectId(), "title": "NeonWitch Lylia — 20 Kill Game",
            "description": "NeonWitch drops a legendary 20 kill game with Lylia in ranked. Full damage build, unstoppable.",
            "category": "mvp",
            "image_url": "https://images.pexels.com/photos/9072394/pexels-photo-9072394.jpeg?auto=compress&cs=tinysrgb&w=940",
            "created_at": now - timedelta(days=8),
        },
        {
            "_id": ObjectId(), "title": "New Jerseys Arrived",
            "description": "The NECROLINK 2026 jerseys are here! Looking sharp in neon purple and black.",
            "category": "event",
            "image_url": "https://images.pexels.com/photos/7773546/pexels-photo-7773546.jpeg?auto=compress&cs=tinysrgb&w=940",
            "created_at": now - timedelta(days=3),
        },
    ]

    # ── Announcements ─────────────────────────────────────────────────────────
    announcements = [
        {
            "_id": ObjectId(), "title": "Dark Cup 2026 Registration Open",
            "content": "Sign up now for our biggest event of the year. 10,000 Diamond prize pool. Limited spots — register via the Events page!",
            "type": "tournament", "created_at": now - timedelta(days=1),
        },
        {
            "_id": ObjectId(), "title": "New Recruits Welcome",
            "content": "We have 3 new recruits joining NECROLINK this month. Welcome ArcaneHunter and FrostByte! Show them the ropes.",
            "type": "announcement", "created_at": now - timedelta(days=5),
        },
        {
            "_id": ObjectId(), "title": "Discord Voice Chat Every Friday 8PM",
            "content": "Mandatory clan voice chat session every Friday at 8PM. Strategy discussion, team drafts, and fun matchups. Don't miss it!",
            "type": "announcement", "created_at": now - timedelta(days=10),
        },
    ]

    # ── Applications ──────────────────────────────────────────────────────────
    applications = [
        {
            "_id": ObjectId(), "name": "GhostAssassin", "email": "ghost@example.com",
            "game_name": "GhostAssassin_ML", "preferred_role": "Assassin",
            "experience": "3 years MLBB, Legend rank, main Fanny and Ling.",
            "reason": "I want to join a competitive clan to improve my ranked performance and participate in tournaments.",
            "status": "pending", "submitted_at": now - timedelta(days=2),
        },
        {
            "_id": ObjectId(), "name": "CoolHealer", "email": "healer@example.com",
            "game_name": "CoolHealer_ML", "preferred_role": "Support",
            "experience": "2 years, Grandmaster, main Estes and Angela.",
            "reason": "Looking for a clan with regular events and a strong team culture.",
            "status": "approved", "submitted_at": now - timedelta(days=15),
        },
        {
            "_id": ObjectId(), "name": "RageCarry", "email": "carry@example.com",
            "game_name": "RageCarry_ML", "preferred_role": "Gold Laner",
            "experience": "1 year, Master, love Lesley and Beatrix.",
            "reason": "Want to be part of a strong community and compete in clan events.",
            "status": "rejected", "submitted_at": now - timedelta(days=20),
        },
    ]

    # ── Tournaments ───────────────────────────────────────────────────────────
    tournaments = [
        {
            "_id": ObjectId(), "name": "NECROLINK Dark Cup 2026",
            "description": "Our flagship annual tournament. 16 teams compete in single-elimination format.",
            "start_date": (now + timedelta(days=14)).isoformat(),
            "end_date": (now + timedelta(days=16)).isoformat(),
            "prize_pool": "10,000 Diamonds + Champion Title",
            "max_teams": 16, "status": "upcoming",
            "banner_url": "https://images.pexels.com/photos/9072394/pexels-photo-9072394.jpeg?auto=compress&cs=tinysrgb&w=940",
            "rules": "Single elimination. Best of 3. Standard MLBB ruleset. Draft pick enabled.",
            "bracket": None, "winners": None,
            "created_at": now - timedelta(days=5),
        },
        {
            "_id": ObjectId(), "name": "Monthly Cup — June 2026",
            "description": "Monthly clan cup open to all NECROLINK members. Best of 1 format, 8 teams.",
            "start_date": now.isoformat(),
            "end_date": (now + timedelta(days=1)).isoformat(),
            "prize_pool": "2,000 Diamonds",
            "max_teams": 8, "status": "ongoing",
            "banner_url": "https://images.pexels.com/photos/7862505/pexels-photo-7862505.jpeg?auto=compress&cs=tinysrgb&w=940",
            "rules": "Single elimination. Best of 1. All pick.",
            "bracket": {
                "rounds": [
                    {"name": "Semi Finals", "matches": [
                        {"team1": "Team Necro Alpha", "team2": "Team Necro Beta", "score1": 1, "score2": 0, "winner": "Team Necro Alpha"},
                        {"team1": "Team Void", "team2": "Team Shadow", "score1": 0, "score2": 1, "winner": "Team Shadow"},
                    ]},
                    {"name": "Final", "matches": [
                        {"team1": "Team Necro Alpha", "team2": "Team Shadow", "score1": None, "score2": None, "winner": None},
                    ]},
                ]
            }, "winners": None,
            "created_at": now - timedelta(days=14),
        },
        {
            "_id": ObjectId(), "name": "Friday Night Cup #12",
            "description": "Weekly quick tournament. 8 teams, single elimination, best of 1.",
            "start_date": (now - timedelta(days=7)).isoformat(),
            "end_date": (now - timedelta(days=7)).isoformat(),
            "prize_pool": "1,000 Diamonds",
            "max_teams": 8, "status": "completed",
            "banner_url": "https://images.pexels.com/photos/17195067/pexels-photo-17195067.jpeg?auto=compress&cs=tinysrgb&w=940",
            "rules": "Single elimination. Best of 1.",
            "bracket": {
                "rounds": [
                    {"name": "Quarter Finals", "matches": [
                        {"team1": "Team Alpha", "team2": "Team Beta", "score1": 1, "score2": 0, "winner": "Team Alpha"},
                        {"team1": "Team Gamma", "team2": "Team Delta", "score1": 0, "score2": 1, "winner": "Team Delta"},
                        {"team1": "Team Epsilon", "team2": "Team Zeta", "score1": 1, "score2": 0, "winner": "Team Epsilon"},
                        {"team1": "Team Eta", "team2": "Team Theta", "score1": 1, "score2": 0, "winner": "Team Eta"},
                    ]},
                    {"name": "Semi Finals", "matches": [
                        {"team1": "Team Alpha", "team2": "Team Delta", "score1": 1, "score2": 0, "winner": "Team Alpha"},
                        {"team1": "Team Epsilon", "team2": "Team Eta", "score1": 0, "score2": 1, "winner": "Team Eta"},
                    ]},
                    {"name": "Final", "matches": [
                        {"team1": "Team Alpha", "team2": "Team Eta", "score1": 1, "score2": 0, "winner": "Team Alpha"},
                    ]},
                ]
            },
            "winners": ["Team Alpha", "Team Eta", "Team Epsilon"],
            "created_at": now - timedelta(days=21),
        },
    ]

    # ── Settings ──────────────────────────────────────────────────────────────
    settings = [
        {
            "_id": ObjectId(), "key": "announcement_bar",
            "value": {
                "text": "🔥 NECROLINK Dark Cup 2026 registration is now OPEN — 10,000 Diamonds prize pool! Join via Events.",
                "is_active": True, "color": "purple"
            },
            "updated_at": now,
        },
        {
            "_id": ObjectId(), "key": "discord",
            "value": {
                "invite_url": "https://discord.gg/necrolink",
                "server_id": "000000000000000000",
                "enabled": True
            },
            "updated_at": now,
        },
    ]

    # ── Member of Month ───────────────────────────────────────────────────────
    member_of_month = [
        {
            "_id": ObjectId(),
            "member_game_name": "NECROLINK_Aamon",
            "month": now.strftime("%Y-%m"),
            "reason": "Carried the team to victory in 4 consecutive weekend tournaments. 68 MVPs in the last 30 days and counting! Truly deserving of the crown.",
            "created_at": now - timedelta(days=5),
        }
    ]

    # ── Visit Stats ───────────────────────────────────────────────────────────
    visit_stats = [
        {
            "_id": ObjectId(), "key": "total",
            "total_visits": 4821, "updated_at": now,
        }
    ]

    return _MemDB({
        "users": _MemCollection(users),
        "members": _MemCollection(members),
        "events": _MemCollection(events),
        "event_registrations": _MemCollection([]),
        "news": _MemCollection(news),
        "products": _MemCollection(products),
        "orders": _MemCollection([]),
        "applications": _MemCollection(applications),
        "gallery": _MemCollection(gallery),
        "announcements": _MemCollection(announcements),
        "tournaments": _MemCollection(tournaments),
        "settings": _MemCollection(settings),
        "member_of_month": _MemCollection(member_of_month),
        "visit_stats": _MemCollection(visit_stats),
        "files": _MemCollection([]),
        "leaderboard": _MemCollection([]),
        "refresh_tokens": _MemCollection([]),
    })
