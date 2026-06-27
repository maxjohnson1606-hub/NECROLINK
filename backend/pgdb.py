"""
PostgreSQL-backed document store that mimics the MongoDB/Motor async interface.
Stores all documents as JSONB in a single table, partitioned by collection name.
"""
import asyncpg
import json
import os
import uuid
from bson import ObjectId


def _new_id() -> str:
    return str(ObjectId())  # 24-char hex, safe for ObjectId(id_str) roundtrip


def _to_str_id(value) -> str:
    return str(value)


class InsertOneResult:
    def __init__(self, inserted_id: str):
        self.inserted_id = inserted_id


class UpdateResult:
    def __init__(self, modified_count=0, matched_count=0, upserted_id=None):
        self.modified_count = modified_count
        self.matched_count = matched_count
        self.upserted_id = upserted_id


class DeleteResult:
    def __init__(self, deleted_count=0):
        self.deleted_count = deleted_count


class _AsyncFindCursor:
    def __init__(self, collection, filter_dict):
        self._col = collection
        self._filter = filter_dict
        self._sort_key = None
        self._sort_dir = 1
        self._limit_n = None
        self._skip_n = None

    def sort(self, key, direction=1):
        if isinstance(key, list):
            if key:
                self._sort_key = key[0][0]
                self._sort_dir = key[0][1]
        else:
            self._sort_key = key
            self._sort_dir = direction
        return self

    def limit(self, n):
        self._limit_n = n
        return self

    def skip(self, n):
        self._skip_n = n
        return self

    async def to_list(self, limit=None):
        docs = await self._col._get_all()
        if self._filter:
            docs = [d for d in docs if self._col._matches(d, self._filter)]
        if self._sort_key:
            reverse = self._sort_dir == -1
            sk = self._sort_key
            docs.sort(key=lambda d: str(d.get(sk, '')), reverse=reverse)
        if self._skip_n:
            docs = docs[self._skip_n:]
        # honour both .limit() and to_list(limit) — pick the smaller
        effective_limit = self._limit_n or limit
        if limit and self._limit_n:
            effective_limit = min(self._limit_n, limit)
        if effective_limit:
            docs = docs[:effective_limit]
        return docs


class Collection:
    def __init__(self, pool, name: str):
        self._pool = pool
        self._name = name

    def _matches(self, doc: dict, filter_dict: dict) -> bool:
        for key, value in filter_dict.items():
            if key == '_id':
                doc_id = str(doc.get('_id', doc.get('id', '')))
                if doc_id != _to_str_id(value):
                    return False
            elif isinstance(value, dict):
                # Partial operator support
                for op, op_val in value.items():
                    if op == '$exists':
                        exists = key in doc
                        if op_val and not exists:
                            return False
                        if not op_val and exists:
                            return False
                    elif op == '$in':
                        if doc.get(key) not in op_val:
                            return False
                    elif op == '$ne':
                        if doc.get(key) == op_val:
                            return False
                    elif op == '$gt':
                        if not (doc.get(key, 0) > op_val):
                            return False
                    elif op == '$lt':
                        if not (doc.get(key, 0) < op_val):
                            return False
            else:
                if doc.get(key) != value:
                    return False
        return True

    def _apply_update(self, doc: dict, update: dict) -> dict:
        doc = dict(doc)
        if '$set' in update:
            for k, v in update['$set'].items():
                doc[k] = v
        if '$unset' in update:
            for k in update['$unset']:
                doc.pop(k, None)
        if '$inc' in update:
            for k, v in update['$inc'].items():
                doc[k] = doc.get(k, 0) + v
        if '$push' in update:
            for k, v in update['$push'].items():
                if k not in doc:
                    doc[k] = []
                if isinstance(v, dict) and '$each' in v:
                    doc[k].extend(v['$each'])
                else:
                    doc[k].append(v)
        if '$pull' in update:
            for k, v in update['$pull'].items():
                if k in doc and isinstance(doc[k], list):
                    doc[k] = [i for i in doc[k] if i != v]
        if '$addToSet' in update:
            for k, v in update['$addToSet'].items():
                if k not in doc:
                    doc[k] = []
                if v not in doc[k]:
                    doc[k].append(v)
        return doc

    async def _get_all(self) -> list:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, data FROM necrolink_docs WHERE collection = $1 ORDER BY created_at ASC",
                self._name,
            )
        result = []
        for row in rows:
            doc = dict(json.loads(row['data']))
            doc['_id'] = row['id']
            result.append(doc)
        return result

    async def find_one(self, filter_dict=None, projection=None, sort=None):
        docs = await self._get_all()
        if filter_dict:
            docs = [d for d in docs if self._matches(d, filter_dict)]
        if sort:
            key, direction = sort[0]
            reverse = direction == -1
            docs.sort(key=lambda d: str(d.get(key, '')), reverse=reverse)
        return docs[0] if docs else None

    def find(self, filter_dict=None, projection=None):
        return _AsyncFindCursor(self, filter_dict)

    async def insert_one(self, doc: dict) -> InsertOneResult:
        doc = dict(doc)
        raw_id = doc.pop('_id', None)
        doc_id = _to_str_id(raw_id) if raw_id is not None else _new_id()
        # Remove any leftover 'id' key to avoid confusion
        doc.pop('id', None)
        data_json = json.dumps(doc, default=str)
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO necrolink_docs (id, collection, data)
                VALUES ($1, $2, $3::jsonb)
                ON CONFLICT (id) DO UPDATE SET data = $3::jsonb
                """,
                doc_id, self._name, data_json,
            )
        return InsertOneResult(doc_id)

    async def update_one(self, filter_dict, update, upsert=False):
        docs = await self._get_all()
        matched = [d for d in docs if self._matches(d, filter_dict)]
        if not matched:
            if upsert:
                new_doc = {}
                new_doc = self._apply_update(new_doc, update)
                res = await self.insert_one(new_doc)
                return UpdateResult(0, 0, res.inserted_id)
            return UpdateResult(0, 0)
        doc = matched[0]
        doc_id = str(doc.get('_id', doc.get('id', '')))
        doc_copy = {k: v for k, v in doc.items() if k != '_id'}
        doc_copy = self._apply_update(doc_copy, update)
        data_json = json.dumps(doc_copy, default=str)
        async with self._pool.acquire() as conn:
            await conn.execute(
                "UPDATE necrolink_docs SET data = $1::jsonb WHERE id = $2 AND collection = $3",
                data_json, doc_id, self._name,
            )
        return UpdateResult(1, 1)

    async def replace_one(self, filter_dict, replacement, upsert=False):
        docs = await self._get_all()
        matched = [d for d in docs if self._matches(d, filter_dict)]
        replacement = {k: v for k, v in replacement.items() if k not in ('_id', 'id')}
        if not matched:
            if upsert:
                res = await self.insert_one(replacement)
                return UpdateResult(0, 0, res.inserted_id)
            return UpdateResult(0, 0)
        doc = matched[0]
        doc_id = str(doc.get('_id', doc.get('id', '')))
        data_json = json.dumps(replacement, default=str)
        async with self._pool.acquire() as conn:
            await conn.execute(
                "UPDATE necrolink_docs SET data = $1::jsonb WHERE id = $2 AND collection = $3",
                data_json, doc_id, self._name,
            )
        return UpdateResult(1, 1)

    async def delete_one(self, filter_dict):
        docs = await self._get_all()
        matched = [d for d in docs if self._matches(d, filter_dict)]
        if not matched:
            return DeleteResult(0)
        doc = matched[0]
        doc_id = str(doc.get('_id', doc.get('id', '')))
        async with self._pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM necrolink_docs WHERE id = $1 AND collection = $2",
                doc_id, self._name,
            )
        return DeleteResult(1)

    async def delete_many(self, filter_dict=None):
        if not filter_dict:
            async with self._pool.acquire() as conn:
                r = await conn.execute(
                    "DELETE FROM necrolink_docs WHERE collection = $1", self._name
                )
            count = int(r.split()[-1]) if r else 0
            return DeleteResult(count)
        docs = await self._get_all()
        matched = [d for d in docs if self._matches(d, filter_dict)]
        if not matched:
            return DeleteResult(0)
        ids = [str(d.get('_id', d.get('id', ''))) for d in matched]
        async with self._pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM necrolink_docs WHERE id = ANY($1::text[])", ids
            )
        return DeleteResult(len(ids))

    async def count_documents(self, filter_dict=None):
        if not filter_dict:
            async with self._pool.acquire() as conn:
                return await conn.fetchval(
                    "SELECT COUNT(*) FROM necrolink_docs WHERE collection = $1", self._name
                )
        docs = await self._get_all()
        return sum(1 for d in docs if self._matches(d, filter_dict))

    async def create_index(self, *args, **kwargs):
        pass  # schema-level indexes are set up in create_pg_db()


class PGDatabase:
    """Namespace object: db.users → Collection('users'), etc."""
    def __init__(self, pool):
        self._pool = pool
        self._collections: dict = {}

    def __getattr__(self, name: str):
        if name.startswith('_'):
            raise AttributeError(name)
        if name not in self._collections:
            self._collections[name] = Collection(self._pool, name)
        return self._collections[name]


async def create_pg_db():
    """
    Connect to PostgreSQL and ensure the schema exists.
    Returns a PGDatabase instance, or None if DATABASE_URL is not set.
    """
    database_url = os.environ.get('DATABASE_URL', '')
    if not database_url:
        return None
    try:
        pool = await asyncpg.create_pool(database_url, min_size=2, max_size=10, command_timeout=30)
        async with pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS necrolink_docs (
                    id          TEXT        PRIMARY KEY,
                    collection  TEXT        NOT NULL,
                    data        JSONB       NOT NULL,
                    created_at  TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            await conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_necrolink_col ON necrolink_docs(collection)"
            )
            await conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_necrolink_data ON necrolink_docs USING GIN(data)"
            )
        print("✅ [NECROLINK] PostgreSQL connected — persistent storage active")
        return PGDatabase(pool)
    except Exception as e:
        print(f"⚠️  [NECROLINK] PostgreSQL connection failed: {e}")
        return None
