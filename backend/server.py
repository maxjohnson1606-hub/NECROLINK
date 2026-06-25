from dotenv import load_dotenv
from pathlib import Path
import ssl

# Patch SSL context to lower security level for OpenSSL 3.x compatibility with MongoDB Atlas
_orig_create_default_context = ssl.create_default_context
def _patched_create_default_context(*args, **kwargs):
    ctx = _orig_create_default_context(*args, **kwargs)
    try:
        ctx.set_ciphers("DEFAULT@SECLEVEL=0")
    except Exception:
        pass
    return ctx
ssl.create_default_context = _patched_create_default_context

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, BackgroundTasks, UploadFile, File, Header, Query
from fastapi.encoders import ENCODERS_BY_TYPE
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId

# Make FastAPI auto-serialize ObjectId → str in all responses
ENCODERS_BY_TYPE[ObjectId] = str
import os
import logging
import bcrypt
import jwt
import uuid
import requests
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
# Short serverSelectionTimeoutMS so startup doesn't block for 30s per operation
client = AsyncIOMotorClient(mongo_url, tlsInsecure=True, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000, socketTimeoutMS=5000)
db = client[os.environ['DB_NAME']]

# ── Sync connectivity test ── switch to in-memory DB if Atlas is unreachable ──
_USING_MEMDB = False
try:
    import pymongo as _pymongo
    _sc = _pymongo.MongoClient(
        mongo_url, tlsInsecure=True,
        serverSelectionTimeoutMS=2500, connectTimeoutMS=2500, socketTimeoutMS=2500
    )
    _sc.admin.command('ping')
    _sc.close()
    print("✅ [NECROLINK] MongoDB Atlas connected successfully")
except Exception as _mongo_err:
    print(f"⚠️  [NECROLINK] MongoDB unavailable ({type(_mongo_err).__name__}) — loading in-memory database")
    from memdb import create_mem_db as _create_mem_db
    db = _create_mem_db()
    _USING_MEMDB = True
    print("✅ [NECROLINK] In-memory database loaded with full seed data")

# JWT settings
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get('JWT_SECRET')

# Object Storage settings
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = os.environ.get("APP_NAME", "necrolink")
storage_key = None

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ OBJECT STORAGE ============
def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    if resp.status_code == 403:
        # Re-init and retry once
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120
        )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    if resp.status_code == 403:
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key}, timeout=60
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ============ PASSWORD HASHING ============
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# ============ JWT ============
def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ============ EMAIL ============
def send_application_email(applicant_name: str, applicant_email: str, role: str, experience: str, reason: str):
    try:
        message = Mail(
            from_email=os.getenv('SENDER_EMAIL'),
            to_emails=os.getenv('ADMIN_EMAIL'),
            subject=f'New NECROLINK Application from {applicant_name}',
            html_content=f"""
            <html><body style="background-color: #000; color: #fff; font-family: monospace;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #00E5FF;">
                    <h2 style="color: #00E5FF; text-transform: uppercase;">New Clan Application</h2>
                    <p><strong style="color: #B026FF;">Name:</strong> {applicant_name}</p>
                    <p><strong style="color: #B026FF;">Email:</strong> {applicant_email}</p>
                    <p><strong style="color: #B026FF;">Preferred Role:</strong> {role}</p>
                    <p><strong style="color: #B026FF;">Experience:</strong> {experience}</p>
                    <p><strong style="color: #B026FF;">Why Join:</strong></p>
                    <p style="border-left: 3px solid #FF003C; padding-left: 15px;">{reason}</p>
                </div>
            </body></html>
            """
        )
        sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
        sg.send(message)
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")

# ============ AUTH HELPERS ============
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def get_owner_user(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return user

def parse_object_id(id_str: str, resource_name: str = "Resource") -> ObjectId:
    """Safely parse an ObjectId, returning 404 instead of 500 on invalid format."""
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=404, detail=f"{resource_name} not found")

# ============ MODELS ============
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    game_name: Optional[str] = None
    preferred_role: Optional[str] = None

class ApplicationRequest(BaseModel):
    name: str
    email: EmailStr
    game_name: str
    preferred_role: str
    experience: str
    discord_username: Optional[str] = None
    reason: str

class AnnouncementRequest(BaseModel):
    title: str
    content: str
    type: str = "general"

class MemberRequest(BaseModel):
    name: str
    game_name: str
    role: str
    rank: str = "Recruit"  # Recruit, Member, Veteran, Elite, Officer, Co-Leader, Leader, Owner
    achievements: List[str] = []
    badges: List[str] = []  # Event Winner, Tournament Champion, MVP, Community Helper, Veteran
    wins: int = 0
    mvp_count: int = 0
    points: int = 0
    mlbb_id: Optional[str] = None
    main_heroes: List[str] = []
    join_date: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_leader: bool = False
    is_co_leader: bool = False
    is_staff: bool = False
    staff_role: Optional[str] = None  # Owner, Admin, Moderator, Event Manager

class EventRequest(BaseModel):
    title: str
    description: str
    category: str
    event_date: str  # ISO format datetime string
    location: str = "Online"
    banner_url: Optional[str] = None
    status: str = "upcoming"  # upcoming, ongoing, completed
    max_participants: Optional[int] = None
    prize_pool: Optional[str] = None

class EventRegistrationRequest(BaseModel):
    event_id: str
    name: str
    email: EmailStr
    game_name: str
    discord_username: Optional[str] = None
    notes: Optional[str] = None

class NewsRequest(BaseModel):
    title: str
    content: str
    category: str  # patch_notes, new_heroes, hero_revamps, new_skins, events, tournaments, mlbb_esports, collaborations, game_updates, community_news
    image_url: Optional[str] = None
    source_url: Optional[str] = None
    is_pinned: bool = False
    is_featured: bool = False
    is_published: bool = True

class ProductRequest(BaseModel):
    name: str
    description: str
    price: float
    category: str  # jersey, hoodie, tshirt, mousepad, sticker, keychain, diamonds, weekly_pass, starlight, event_pass
    section: str  # merchandise, topup
    image_url: Optional[str] = None
    is_active: bool = True
    stock: Optional[int] = None

class OrderRequest(BaseModel):
    product_id: str
    quantity: int = 1
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    game_id: Optional[str] = None  # For top-up: MLBB ID
    server_id: Optional[str] = None  # For top-up: MLBB server ID
    notes: Optional[str] = None

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    game_name: Optional[str] = None
    preferred_role: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

class GalleryItemRequest(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: str
    category: str = "match"  # match, mvp, team, event

class UserRoleRequest(BaseModel):
    role: str  # member, admin, owner

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ChangeEmailRequest(BaseModel):
    current_password: str
    new_email: EmailStr

class TournamentRequest(BaseModel):
    name: str
    description: str
    start_date: str
    end_date: Optional[str] = None
    prize_pool: Optional[str] = None
    max_teams: int = 16
    status: str = "upcoming"  # upcoming, ongoing, completed
    banner_url: Optional[str] = None
    rules: Optional[str] = None
    bracket: Optional[dict] = None  # { rounds: [ { matches: [{ team1, team2, score1, score2, winner }] } ] }
    winners: Optional[List[str]] = None  # ['1st place team', '2nd', '3rd']

class AnnouncementBarRequest(BaseModel):
    text: str
    is_active: bool = True
    color: str = "purple"  # purple, blue, red

class MemberOfMonthRequest(BaseModel):
    member_game_name: str
    month: str  # YYYY-MM
    reason: Optional[str] = None

class DiscordSettingsRequest(BaseModel):
    invite_url: Optional[str] = None
    server_id: Optional[str] = None
    enabled: bool = True

class PromoteRequest(BaseModel):
    rank: str  # Recruit, Member, Veteran, Elite, Officer, Co-Leader, Leader, Owner

class PointsAdjustRequest(BaseModel):
    delta: int  # positive to add, negative to deduct
    reason: Optional[str] = None

# ============ AUTH ROUTES ============
@api_router.post("/auth/login")
async def login(request: LoginRequest, response: Response):
    email = request.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email, user.get("role", "member"))
    refresh_token = create_refresh_token(user_id)
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {
        "_id": user_id, "email": user["email"], "name": user.get("name"),
        "role": user.get("role", "member"), "game_name": user.get("game_name"),
        "preferred_role": user.get("preferred_role")
    }

@api_router.post("/auth/register")
async def register(request: RegisterRequest, response: Response):
    email = request.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(request.password)
    user_doc = {
        "email": email, "password_hash": hashed, "name": request.name,
        "game_name": request.game_name, "preferred_role": request.preferred_role,
        "role": "member", "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    access_token = create_access_token(user_id, email, "member")
    refresh_token = create_refresh_token(user_id)
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {
        "_id": user_id, "email": email, "name": request.name, "role": "member",
        "game_name": request.game_name, "preferred_role": request.preferred_role
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

# ============ FILE UPLOAD ============
_UPLOAD_DIR = ROOT_DIR / "static" / "uploads"
_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@api_router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    await get_admin_user(request)
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    if ext not in ("jpg", "jpeg", "png", "gif", "webp"):
        ext = "jpg"
    file_id = str(uuid.uuid4())
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    # Try cloud object storage first; fall back to local disk
    try:
        path = f"{APP_NAME}/uploads/{file_id}.{ext}"
        result = put_object(path, data, file.content_type)
        url = f"/api/files/{result['path']}"
        await db.files.insert_one({
            "id": file_id, "storage_path": result["path"],
            "original_filename": file.filename, "content_type": file.content_type,
            "size": result["size"], "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    except Exception as _upload_err:
        logger.warning(f"Cloud storage unavailable ({_upload_err}), saving locally")
        fname = f"{file_id}.{ext}"
        (_UPLOAD_DIR / fname).write_bytes(data)
        url = f"/api/uploads/{fname}"
    return {"id": file_id, "url": url}

@api_router.get("/uploads/{filename}")
async def serve_local_upload(filename: str):
    """Serve locally saved uploads (fallback when cloud storage is unavailable)."""
    safe = filename.replace("/", "").replace("..", "")
    file_path = _UPLOAD_DIR / safe
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    ext = safe.rsplit(".", 1)[-1].lower()
    ctype = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
             "gif": "image/gif", "webp": "image/webp"}.get(ext, "application/octet-stream")
    return Response(content=file_path.read_bytes(), media_type=ctype)

@api_router.get("/files/{path:path}")
async def download_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type", content_type))

# ============ APPLICATIONS ============
@api_router.post("/applications")
async def submit_application(application: ApplicationRequest, background_tasks: BackgroundTasks):
    app_doc = {
        **application.model_dump(),
        "email": application.email.lower(),
        "status": "pending",
        "submitted_at": datetime.now(timezone.utc)
    }
    result = await db.applications.insert_one(app_doc)
    background_tasks.add_task(send_application_email, application.name, application.email,
                              application.preferred_role, application.experience, application.reason)
    return {"id": str(result.inserted_id), "message": "Application submitted successfully", "status": "pending"}

@api_router.get("/applications")
async def get_applications(request: Request):
    await get_admin_user(request)
    return await db.applications.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(100)

@api_router.patch("/applications/{email}/status")
async def update_application_status(email: str, status: str, request: Request):
    await get_admin_user(request)
    result = await db.applications.update_one(
        {"email": email.lower()},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Status updated"}

# ============ MEMBERS ============
@api_router.get("/members")
async def get_members():
    return await db.members.find({}, {"_id": 0}).to_list(100)

@api_router.post("/members")
async def create_member(member: MemberRequest, request: Request):
    await get_admin_user(request)
    doc = member.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    await db.members.insert_one(doc)
    return {"message": "Member created"}

@api_router.put("/members/{game_name}")
async def update_member(game_name: str, member: MemberRequest, request: Request):
    await get_admin_user(request)
    result = await db.members.update_one({"game_name": game_name}, {"$set": member.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member updated"}

@api_router.delete("/members/{game_name}")
async def delete_member(game_name: str, request: Request):
    await get_admin_user(request)
    result = await db.members.delete_one({"game_name": game_name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member deleted"}

# ============ ANNOUNCEMENTS ============
@api_router.get("/announcements")
async def get_announcements():
    return await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)

@api_router.post("/announcements")
async def create_announcement(announcement: AnnouncementRequest, request: Request):
    await get_admin_user(request)
    doc = announcement.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    await db.announcements.insert_one(doc)
    return {"message": "Announcement created"}

@api_router.delete("/announcements/{title}")
async def delete_announcement(title: str, request: Request):
    await get_admin_user(request)
    result = await db.announcements.delete_one({"title": title})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Announcement deleted"}

# ============ EVENTS ============
@api_router.get("/events")
async def get_events(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    events = await db.events.find(query).sort("event_date", 1).to_list(200)
    for e in events:
        e["id"] = str(e.pop("_id"))
    return events

@api_router.get("/events/{event_id}")
async def get_event(event_id: str):
    event = await db.events.find_one({"_id": parse_object_id(event_id, "Event")})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event["id"] = str(event.pop("_id"))
    return event

@api_router.post("/events")
async def create_event(event: EventRequest, request: Request):
    await get_admin_user(request)
    doc = event.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.events.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Event created"}

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, event: EventRequest, request: Request):
    await get_admin_user(request)
    result = await db.events.update_one(
        {"_id": parse_object_id(event_id, "Event")},
        {"$set": {**event.model_dump(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event updated"}

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, request: Request):
    await get_admin_user(request)
    result = await db.events.delete_one({"_id": parse_object_id(event_id, "Event")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    # Also delete registrations
    await db.event_registrations.delete_many({"event_id": event_id})
    return {"message": "Event deleted"}

# ============ EVENT REGISTRATIONS ============
@api_router.post("/event-registrations")
async def register_event(registration: EventRegistrationRequest):
    # Verify event exists
    event = await db.events.find_one({"_id": parse_object_id(registration.event_id, "Event")})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    doc = registration.model_dump()
    doc["email"] = registration.email.lower()
    doc["status"] = "pending"
    doc["registered_at"] = datetime.now(timezone.utc)
    result = await db.event_registrations.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Registration submitted successfully"}

@api_router.get("/event-registrations")
async def get_event_registrations(request: Request, event_id: Optional[str] = None):
    await get_admin_user(request)
    query = {}
    if event_id:
        query["event_id"] = event_id
    regs = await db.event_registrations.find(query).sort("registered_at", -1).to_list(500)
    for r in regs:
        r["id"] = str(r.pop("_id"))
    return regs

@api_router.patch("/event-registrations/{reg_id}/status")
async def update_registration_status(reg_id: str, status: str, request: Request):
    await get_admin_user(request)
    result = await db.event_registrations.update_one(
        {"_id": parse_object_id(reg_id, "Registration")},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"message": "Status updated"}

# ============ NEWS ============
@api_router.get("/news")
async def get_news(category: Optional[str] = None, search: Optional[str] = None, featured: Optional[bool] = None, limit: int = 100):
    query = {"is_published": True}
    if category and category != "all":
        query["category"] = category
    if featured is not None:
        query["is_featured"] = featured
    if search and len(search.strip()) >= 2:
        q_regex = {"$regex": search.strip(), "$options": "i"}
        query["$or"] = [{"title": q_regex}, {"content": q_regex}, {"category": q_regex}]
    news = await db.news.find(query).sort([("is_pinned", -1), ("is_featured", -1), ("created_at", -1)]).to_list(limit)
    for n in news:
        n["id"] = str(n.pop("_id"))
    return news

@api_router.get("/news/featured")
async def get_featured_news(limit: int = 5):
    """Get featured + pinned news for homepage display."""
    news = await db.news.find(
        {"is_published": True, "$or": [{"is_featured": True}, {"is_pinned": True}]}
    ).sort([("is_pinned", -1), ("is_featured", -1), ("created_at", -1)]).to_list(limit)
    for n in news:
        n["id"] = str(n.pop("_id"))
    return news

@api_router.get("/news/latest")
async def get_latest_news(limit: int = 5):
    """Get latest published news articles for homepage."""
    news = await db.news.find({"is_published": True}).sort([("created_at", -1)]).to_list(limit)
    for n in news:
        n["id"] = str(n.pop("_id"))
    return news

@api_router.get("/news/{news_id}")
async def get_news_item(news_id: str):
    item = await db.news.find_one({"_id": parse_object_id(news_id, "News article")})
    if not item:
        raise HTTPException(status_code=404, detail="News item not found")
    item["id"] = str(item.pop("_id"))
    return item

@api_router.post("/news")
async def create_news(news: NewsRequest, request: Request):
    await get_admin_user(request)
    doc = news.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.news.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "News created"}

@api_router.put("/news/{news_id}")
async def update_news(news_id: str, news: NewsRequest, request: Request):
    await get_admin_user(request)
    result = await db.news.update_one(
        {"_id": parse_object_id(news_id, "News article")},
        {"$set": {**news.model_dump(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="News not found")
    return {"message": "News updated"}

@api_router.delete("/news/{news_id}")
async def delete_news(news_id: str, request: Request):
    await get_admin_user(request)
    result = await db.news.delete_one({"_id": parse_object_id(news_id, "News article")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="News not found")
    return {"message": "News deleted"}

# ============ PRODUCTS ============
@api_router.get("/products")
async def get_products(section: Optional[str] = None, category: Optional[str] = None):
    query = {"is_active": True}
    if section:
        query["section"] = section
    if category:
        query["category"] = category
    products = await db.products.find(query).to_list(200)
    for p in products:
        p["id"] = str(p.pop("_id"))
    return products

@api_router.post("/products")
async def create_product(product: ProductRequest, request: Request):
    await get_admin_user(request)
    doc = product.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.products.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Product created"}

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product: ProductRequest, request: Request):
    await get_admin_user(request)
    result = await db.products.update_one(
        {"_id": parse_object_id(product_id, "Product")},
        {"$set": {**product.model_dump(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product updated"}

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    await get_admin_user(request)
    result = await db.products.delete_one({"_id": parse_object_id(product_id, "Product")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ============ ORDERS ============
@api_router.post("/orders")
async def create_order(order: OrderRequest):
    if order.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    product = await db.products.find_one({"_id": parse_object_id(order.product_id, "Product")})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    doc = order.model_dump()
    doc["email"] = order.customer_email.lower()
    doc["product_name"] = product.get("name")
    doc["unit_price"] = product.get("price", 0)
    doc["total_price"] = product.get("price", 0) * order.quantity
    doc["product_section"] = product.get("section")
    doc["status"] = "pending"
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.orders.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Order placed successfully. Admin will contact you for payment."}

@api_router.get("/orders")
async def get_orders(request: Request):
    await get_admin_user(request)
    orders = await db.orders.find({}).sort("created_at", -1).to_list(500)
    for o in orders:
        o["id"] = str(o.pop("_id"))
    return orders

@api_router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, request: Request):
    await get_admin_user(request)
    result = await db.orders.update_one(
        {"_id": parse_object_id(order_id, "Order")},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order status updated"}

# ============ TOURNAMENTS ============
@api_router.get("/tournaments")
async def get_tournaments(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    items = await db.tournaments.find(query).sort("start_date", -1).to_list(100)
    for t in items:
        t["id"] = str(t.pop("_id"))
    return items

@api_router.get("/tournaments/{tournament_id}")
async def get_tournament(tournament_id: str):
    t = await db.tournaments.find_one({"_id": parse_object_id(tournament_id, "Tournament")})
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    t["id"] = str(t.pop("_id"))
    return t

@api_router.post("/tournaments")
async def create_tournament(t: TournamentRequest, request: Request):
    await get_admin_user(request)
    doc = t.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.tournaments.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Tournament created"}

@api_router.put("/tournaments/{tournament_id}")
async def update_tournament(tournament_id: str, t: TournamentRequest, request: Request):
    await get_admin_user(request)
    result = await db.tournaments.update_one(
        {"_id": parse_object_id(tournament_id, "Tournament")},
        {"$set": {**t.model_dump(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {"message": "Tournament updated"}

@api_router.delete("/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: str, request: Request):
    await get_admin_user(request)
    result = await db.tournaments.delete_one({"_id": parse_object_id(tournament_id, "Tournament")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {"message": "Tournament deleted"}

# ============ ANNOUNCEMENT BAR / DISCORD SETTINGS ============
@api_router.get("/announcement-bar")
async def get_announcement_bar():
    bar = await db.settings.find_one({"key": "announcement_bar"}, {"_id": 0})
    if not bar:
        return {"text": "", "is_active": False, "color": "purple"}
    return bar.get("value", {})

@api_router.put("/announcement-bar")
async def set_announcement_bar(req: AnnouncementBarRequest, request: Request):
    await get_admin_user(request)
    await db.settings.update_one(
        {"key": "announcement_bar"},
        {"$set": {"value": req.model_dump(), "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "Announcement bar updated"}

@api_router.get("/discord-settings")
async def get_discord_settings():
    doc = await db.settings.find_one({"key": "discord"}, {"_id": 0})
    return doc.get("value", {}) if doc else {"invite_url": "", "server_id": "", "enabled": False}

@api_router.put("/discord-settings")
async def set_discord_settings(req: DiscordSettingsRequest, request: Request):
    await get_admin_user(request)
    await db.settings.update_one(
        {"key": "discord"},
        {"$set": {"value": req.model_dump(), "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "Discord settings updated"}

@api_router.get("/discord-widget")
async def get_discord_widget():
    doc = await db.settings.find_one({"key": "discord"})
    if not doc:
        return {"online": 0, "configured": False}
    settings = doc.get("value", {})
    server_id = settings.get("server_id")
    if not server_id:
        return {"online": 0, "configured": False}
    try:
        resp = requests.get(f"https://discord.com/api/guilds/{server_id}/widget.json", timeout=8)
        if resp.status_code == 200:
            data = resp.json()
            return {
                "online": len(data.get("members", [])),
                "instant_invite": data.get("instant_invite"),
                "name": data.get("name"),
                "presence_count": data.get("presence_count", 0),
                "configured": True,
            }
        return {"online": 0, "configured": True, "error": "Widget disabled in Discord server settings"}
    except Exception as e:
        return {"online": 0, "configured": True, "error": str(e)}

# ============ MEMBER OF THE MONTH ============
@api_router.get("/member-of-month")
async def get_member_of_month():
    doc = await db.member_of_month.find_one({}, sort=[("month", -1)])
    if not doc:
        return None
    member = await db.members.find_one({"game_name": doc.get("member_game_name")}, {"_id": 0})
    return {"month": doc.get("month"), "reason": doc.get("reason"), "member": member}

@api_router.post("/member-of-month")
async def set_member_of_month(req: MemberOfMonthRequest, request: Request):
    await get_admin_user(request)
    await db.member_of_month.update_one(
        {"month": req.month},
        {"$set": {**req.model_dump(), "created_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "Member of the Month set"}

# ============ LEADERBOARD ============
@api_router.get("/leaderboard")
async def get_leaderboard():
    top_wins = await db.members.find({}, {"_id": 0}).sort("wins", -1).limit(10).to_list(10)
    top_mvp = await db.members.find({}, {"_id": 0}).sort("mvp_count", -1).limit(10).to_list(10)
    top_points = await db.members.find({}, {"_id": 0}).sort("points", -1).limit(10).to_list(10)
    tournament_winners_docs = await db.tournaments.find({"status": "completed"}).sort("end_date", -1).to_list(20)
    tournament_winners = []
    for tw in tournament_winners_docs:
        if tw.get("winners"):
            tournament_winners.append({"tournament": tw.get("name"), "winners": tw.get("winners"), "end_date": tw.get("end_date")})
    return {"top_wins": top_wins, "top_mvp": top_mvp, "top_points": top_points, "tournament_winners": tournament_winners}

# ============ MEMBER RANK / POINTS / DETAIL ============
@api_router.patch("/members/{game_name}/rank")
async def promote_member(game_name: str, req: PromoteRequest, request: Request):
    await get_admin_user(request)
    valid_ranks = ["Recruit", "Member", "Veteran", "Elite", "Officer", "Co-Leader", "Leader", "Owner"]
    if req.rank not in valid_ranks:
        raise HTTPException(status_code=400, detail=f"Invalid rank. Must be one of: {', '.join(valid_ranks)}")
    is_leader = req.rank == "Leader"
    is_co_leader = req.rank == "Co-Leader"
    result = await db.members.update_one(
        {"game_name": game_name},
        {"$set": {"rank": req.rank, "is_leader": is_leader, "is_co_leader": is_co_leader}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": f"Member rank changed to {req.rank}"}

@api_router.patch("/members/{game_name}/points")
async def adjust_points(game_name: str, req: PointsAdjustRequest, request: Request):
    await get_admin_user(request)
    result = await db.members.update_one(
        {"game_name": game_name},
        {"$inc": {"points": req.delta}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": f"Points adjusted by {req.delta}"}

@api_router.get("/members/{game_name}")
async def get_member_detail(game_name: str):
    member = await db.members.find_one({"game_name": game_name}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member

# ============ STAFF ============
@api_router.get("/staff")
async def get_staff():
    staff = await db.members.find({"is_staff": True}, {"_id": 0}).to_list(100)
    grouped = {"Owner": [], "Admin": [], "Moderator": [], "Event Manager": []}
    for m in staff:
        role = m.get("staff_role") or "Moderator"
        if role in grouped:
            grouped[role].append(m)
        else:
            grouped["Moderator"].append(m)
    return grouped

# ============ SITE-WIDE SEARCH ============
@api_router.get("/search")
async def search(q: str, limit: int = 20):
    if not q or len(q.strip()) < 2:
        return {"members": [], "events": [], "news": [], "products": []}
    q_regex = {"$regex": q.strip(), "$options": "i"}
    members = await db.members.find(
        {"$or": [{"name": q_regex}, {"game_name": q_regex}, {"role": q_regex}, {"rank": q_regex}]},
        {"_id": 0}
    ).limit(limit).to_list(limit)
    events = await db.events.find(
        {"$or": [{"title": q_regex}, {"description": q_regex}, {"category": q_regex}]}
    ).limit(limit).to_list(limit)
    for e in events:
        e["id"] = str(e.pop("_id"))
    news = await db.news.find(
        {"$or": [{"title": q_regex}, {"content": q_regex}, {"category": q_regex}]}
    ).limit(limit).to_list(limit)
    for n in news:
        n["id"] = str(n.pop("_id"))
    products = await db.products.find(
        {"$or": [{"name": q_regex}, {"description": q_regex}, {"category": q_regex}]}
    ).limit(limit).to_list(limit)
    for p in products:
        p["id"] = str(p.pop("_id"))
    return {"members": members, "events": events, "news": news, "products": products}

# ============ VISITOR COUNTER ============
@api_router.post("/visit")
async def track_visit():
    await db.settings.update_one(
        {"key": "visit_counter"},
        {"$inc": {"value.total": 1}, "$set": {"updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"ok": True}

@api_router.get("/visit-stats")
async def get_visit_stats():
    doc = await db.settings.find_one({"key": "visit_counter"})
    total_visits = (doc or {}).get("value", {}).get("total", 0) if doc else 0
    return {
        "total_visits": total_visits,
        "registered_members": await db.users.count_documents({}),
        "active_members": await db.members.count_documents({}),
        "total_events": await db.events.count_documents({}),
    }

# ============ STATISTICS ============

# ============ EXTERNAL NEWS FEEDS ============
import feedparser
import re as _re

MLBB_YT_CHANNEL_ID = "UCqmld-BIYME2i_ooRTo1EOg"
MLBB_ESPORTS_CHANNEL_ID = "UCLvkHEBRTJoME-PJIFKpqfw"
MLBB_INSTAGRAM = "https://www.instagram.com/mobilelegendsgame/"
_feed_cache = {"data": None, "fetched_at": None}
_esports_feed_cache = {"data": None, "fetched_at": None}

@api_router.get("/feeds/mlbb-videos")
async def get_mlbb_videos():
    """Fetch latest videos from official MLBB YouTube channel (cached 30 min)."""
    now = datetime.now(timezone.utc)
    if _feed_cache["data"] and _feed_cache["fetched_at"] and (now - _feed_cache["fetched_at"]).total_seconds() < 1800:
        return _feed_cache["data"]
    try:
        feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={MLBB_YT_CHANNEL_ID}"
        feed = feedparser.parse(feed_url)
        videos = []
        for entry in feed.entries[:15]:
            video_id = entry.get("yt_videoid") or entry.get("id", "").replace("yt:video:", "")
            thumbnail = ""
            if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
                thumbnail = entry.media_thumbnail[0].get("url", "")
            if not thumbnail and video_id:
                thumbnail = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
            description = ""
            if hasattr(entry, "media_description"):
                description = entry.media_description
            elif hasattr(entry, "summary"):
                description = _re.sub(r"<[^>]+>", "", entry.summary)[:300]
            videos.append({
                "video_id": video_id,
                "title": entry.title,
                "description": description,
                "thumbnail": thumbnail,
                "url": entry.link,
                "published": entry.get("published", ""),
                "author": entry.get("author", "Mobile Legends: Bang Bang"),
            })
        result = {
            "source": "Mobile Legends: Bang Bang (Official YouTube)",
            "channel_url": f"https://www.youtube.com/channel/{MLBB_YT_CHANNEL_ID}",
            "videos": videos,
            "fetched_at": now.isoformat(),
        }
        _feed_cache["data"] = result
        _feed_cache["fetched_at"] = now
        return result
    except Exception as e:
        logger.error(f"YouTube feed error: {e}")
        return {"source": "Mobile Legends: Bang Bang", "videos": [], "error": str(e), "channel_url": f"https://www.youtube.com/channel/{MLBB_YT_CHANNEL_ID}"}

@api_router.get("/feeds/mlbb-esports")
async def get_mlbb_esports_videos():
    """Fetch latest videos from official MLBB Esports YouTube channel (cached 30 min)."""
    now = datetime.now(timezone.utc)
    if _esports_feed_cache["data"] and _esports_feed_cache["fetched_at"] and (now - _esports_feed_cache["fetched_at"]).total_seconds() < 1800:
        return _esports_feed_cache["data"]
    try:
        feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={MLBB_ESPORTS_CHANNEL_ID}"
        feed = feedparser.parse(feed_url)
        videos = []
        for entry in feed.entries[:12]:
            video_id = entry.get("yt_videoid") or entry.get("id", "").replace("yt:video:", "")
            thumbnail = ""
            if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
                thumbnail = entry.media_thumbnail[0].get("url", "")
            if not thumbnail and video_id:
                thumbnail = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
            description = ""
            if hasattr(entry, "media_description"):
                description = entry.media_description
            elif hasattr(entry, "summary"):
                description = _re.sub(r"<[^>]+>", "", entry.summary)[:300]
            videos.append({
                "video_id": video_id,
                "title": entry.title,
                "description": description,
                "thumbnail": thumbnail,
                "url": entry.link,
                "published": entry.get("published", ""),
                "author": entry.get("author", "MLBB Esports"),
            })
        result = {
            "source": "MLBB Esports (Official YouTube)",
            "channel_url": f"https://www.youtube.com/channel/{MLBB_ESPORTS_CHANNEL_ID}",
            "videos": videos,
            "fetched_at": now.isoformat(),
        }
        _esports_feed_cache["data"] = result
        _esports_feed_cache["fetched_at"] = now
        return result
    except Exception as e:
        logger.error(f"MLBB Esports feed error: {e}")
        return {"source": "MLBB Esports", "videos": [], "error": str(e), "channel_url": f"https://www.youtube.com/channel/{MLBB_ESPORTS_CHANNEL_ID}"}

@api_router.get("/feeds/mlbb-instagram")
async def get_mlbb_instagram():
    """Return Instagram profile info. Instagram doesn't allow reliable scraping;
    we expose the profile link and admin can manually create news items embedding posts."""
    return {
        "source": "Mobile Legends: Bang Bang Instagram",
        "profile_url": MLBB_INSTAGRAM,
        "handle": "@mobilelegendsgame",
        "note": "Instagram restricts automated content fetching. Click to view latest posts.",
    }

# ============ USER PROFILE & MY DATA ============
@api_router.patch("/auth/profile")
async def update_profile(profile: ProfileUpdateRequest, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in profile.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": update_data})
    updated = await db.users.find_one({"_id": ObjectId(user["_id"])})
    updated["_id"] = str(updated["_id"])
    updated.pop("password_hash", None)
    return updated

@api_router.put("/auth/password")
async def change_password(req: ChangePasswordRequest, request: Request, response: Response):
    user = await get_current_user(request)
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    full_user = await db.users.find_one({"_id": ObjectId(user["_id"])})
    if not verify_password(req.current_password, full_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    new_hash = hash_password(req.new_password)
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc)}}
    )
    # Refresh session
    access_token = create_access_token(user["_id"], user["email"], user.get("role", "member"))
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    return {"message": "Password changed successfully"}

@api_router.put("/auth/email")
async def change_email(req: ChangeEmailRequest, request: Request, response: Response):
    user = await get_current_user(request)
    full_user = await db.users.find_one({"_id": ObjectId(user["_id"])})
    if not verify_password(req.current_password, full_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    new_email = req.new_email.lower().strip()
    if new_email == user["email"]:
        raise HTTPException(status_code=400, detail="New email must be different from current email")
    existing = await db.users.find_one({"email": new_email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use by another account")
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"email": new_email, "updated_at": datetime.now(timezone.utc)}}
    )
    # Refresh session with new email
    access_token = create_access_token(user["_id"], new_email, user.get("role", "member"))
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    return {"message": "Email changed successfully", "email": new_email}

@api_router.get("/me/applications")
async def get_my_applications(request: Request):
    user = await get_current_user(request)
    apps = await db.applications.find({"email": user["email"].lower()}, {"_id": 0}).sort("submitted_at", -1).to_list(50)
    return apps

@api_router.get("/me/registrations")
async def get_my_registrations(request: Request):
    user = await get_current_user(request)
    regs = await db.event_registrations.find({"email": user["email"].lower()}).sort("registered_at", -1).to_list(100)
    for r in regs:
        r["id"] = str(r.pop("_id"))
    return regs

@api_router.get("/me/orders")
async def get_my_orders(request: Request):
    user = await get_current_user(request)
    orders = await db.orders.find({"email": user["email"].lower()}).sort("created_at", -1).to_list(100)
    for o in orders:
        o["id"] = str(o.pop("_id"))
    return orders

# ============ GALLERY ============
@api_router.get("/gallery")
async def get_gallery(category: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    items = await db.gallery.find(query).sort("created_at", -1).to_list(200)
    for item in items:
        item["id"] = str(item.pop("_id"))
    return items

@api_router.post("/gallery")
async def create_gallery_item(item: GalleryItemRequest, request: Request):
    await get_admin_user(request)
    doc = item.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.gallery.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Gallery item created"}

@api_router.delete("/gallery/{item_id}")
async def delete_gallery_item(item_id: str, request: Request):
    await get_admin_user(request)
    result = await db.gallery.delete_one({"_id": parse_object_id(item_id, "Gallery item")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    return {"message": "Gallery item deleted"}

# ============ OWNER-ONLY USER MANAGEMENT ============
@api_router.get("/users")
async def get_users(request: Request):
    await get_owner_user(request)
    users = await db.users.find({}, {"password_hash": 0}).to_list(500)
    for u in users:
        u["id"] = str(u.pop("_id"))
    return users

@api_router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, role_req: UserRoleRequest, request: Request):
    owner = await get_owner_user(request)
    if role_req.role not in ("member", "admin", "owner"):
        raise HTTPException(status_code=400, detail="Invalid role")
    uid = parse_object_id(user_id, "User")
    if str(uid) == owner["_id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    result = await db.users.update_one({"_id": uid}, {"$set": {"role": role_req.role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Role updated"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    owner = await get_owner_user(request)
    uid = parse_object_id(user_id, "User")
    if str(uid) == owner["_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

@api_router.get("/stats")
async def get_stats(request: Request):
    await get_admin_user(request)
    return {
        "members": await db.members.count_documents({}),
        "applications": await db.applications.count_documents({}),
        "pending_applications": await db.applications.count_documents({"status": "pending"}),
        "events": await db.events.count_documents({}),
        "upcoming_events": await db.events.count_documents({"status": "upcoming"}),
        "ongoing_events": await db.events.count_documents({"status": "ongoing"}),
        "event_registrations": await db.event_registrations.count_documents({}),
        "pending_registrations": await db.event_registrations.count_documents({"status": "pending"}),
        "news_articles": await db.news.count_documents({}),
        "products": await db.products.count_documents({"is_active": True}),
        "orders": await db.orders.count_documents({}),
        "pending_orders": await db.orders.count_documents({"status": "pending"}),
        "users": await db.users.count_documents({}),
    }

# ============ ADMIN SEEDING ============
async def seed_admin():
    # Seed owner
    owner_email = "owner@necrolink.com"
    owner_password = "Owner2024!"
    existing_owner = await db.users.find_one({"email": owner_email})
    if existing_owner is None:
        await db.users.insert_one({
            "email": owner_email, "password_hash": hash_password(owner_password),
            "name": "Owner", "role": "owner", "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Owner user created: {owner_email}")
    elif not verify_password(owner_password, existing_owner["password_hash"]):
        await db.users.update_one({"email": owner_email}, {"$set": {"password_hash": hash_password(owner_password), "role": "owner"}})
    else:
        # Make sure role is owner
        await db.users.update_one({"email": owner_email}, {"$set": {"role": "owner"}})

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@necrolink.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Necrolink2024!")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")
    
    # Make sure to also update the old DarkNet admin to NECROLINK admin role
    old_admin = await db.users.find_one({"email": "admin@darknet.com"})
    if old_admin:
        await db.users.update_one({"email": "admin@darknet.com"}, {"$set": {"role": "admin"}})
    
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# NECROLINK Test Credentials\n\n")
        f.write("## Owner Account (full control)\n")
        f.write(f"- Email: {owner_email}\n")
        f.write(f"- Password: {owner_password}\n")
        f.write("- Role: owner (highest privilege - can manage admins)\n\n")
        f.write("## Admin Account\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write("- Role: admin\n\n")
        f.write("## Legacy Admin (still works)\n- Email: admin@darknet.com\n- Password: DarkNet2024!\n\n")
        f.write("## Endpoints\n- /api/auth/login, /api/auth/register, /api/auth/me, /api/auth/logout, /api/auth/profile\n")
        f.write("- /api/me/applications, /api/me/registrations, /api/me/orders\n")
        f.write("- /api/events, /api/news, /api/products, /api/orders, /api/gallery\n")
        f.write("- /api/event-registrations, /api/applications, /api/announcements, /api/members\n")
        f.write("- /api/upload, /api/files/{path}, /api/stats\n")
        f.write("- (owner only) /api/users, /api/users/{id}/role, /api/users/{id}\n")

async def seed_initial_data():
    # Members - update leader avatar to Aamon poster
    LEADER_POSTER = "https://customer-assets.emergentagent.com/job_voltage-victory/artifacts/qk6p9s84_ChatGPT%20Image%2022%20%D0%B8%D1%8E%D0%BD.%202026%20%D0%B3.%2C%2017_40_45.png"
    # Update existing leader to Aamon (matches poster: 236 matches, 72% WR, 68 MVPs, KDA 8.2)
    await db.members.update_one(
        {"is_leader": True},
        {"$set": {
            "avatar_url": LEADER_POSTER,
            "name": "Aamon",
            "game_name": "NECROLINK_Aamon",
            "role": "Jungle",
            "rank": "Leader",
            "wins": 236,
            "mvp_count": 68,
            "points": 950,
            "mlbb_id": "12345678",
            "main_heroes": ["Aamon", "Hayabusa", "Ling", "Lancelot"],
            "join_date": "2024-01-15",
            "bio": "The Duke of Shadows. Silent. Deadly. Always one step ahead.",
            "achievements": ["The Duke of Shadows", "Win Rate 72%", "KDA 8.2", "Silent Shadow Deadly"],
            "badges": ["Tournament Champion", "MVP", "Veteran"],
            "is_staff": True,
            "staff_role": "Owner"
        }}
    )
    # Update co-leader with extended fields
    await db.members.update_one(
        {"game_name": {"$in": ["DarkNet_Phantom", "NECROLINK_Phantom"]}},
        {"$set": {
            "game_name": "NECROLINK_Phantom",
            "rank": "Co-Leader",
            "points": 720,
            "mlbb_id": "98765432",
            "main_heroes": ["Lancelot", "Hayabusa", "Saber"],
            "join_date": "2024-02-08",
            "bio": "Cyber Phantom. The shadow that strikes from the jungle.",
            "badges": ["MVP", "Veteran"],
            "is_staff": True,
            "staff_role": "Admin"
        }}
    )
    if await db.members.count_documents({}) == 0:
        await db.members.insert_many([
            {
                "name": "Aamon", "game_name": "NECROLINK_Aamon", "role": "Jungle",
                "rank": "Leader", "achievements": ["The Duke of Shadows", "MVP x68", "Tournament Champion"],
                "wins": 236, "mvp_count": 68,
                "avatar_url": LEADER_POSTER,
                "is_leader": True, "is_co_leader": False, "created_at": datetime.now(timezone.utc)
            },
            {
                "name": "Cyber Phantom", "game_name": "NECROLINK_Phantom", "role": "Jungle",
                "rank": "Co-Leader", "achievements": ["Savage Master", "Maniac x50"],
                "wins": 982, "mvp_count": 67,
                "avatar_url": "https://images.pexels.com/photos/7773975/pexels-photo-7773975.jpeg?auto=compress&cs=tinysrgb&w=400",
                "is_leader": False, "is_co_leader": True, "created_at": datetime.now(timezone.utc)
            }
        ])
    
    # Announcements
    if await db.announcements.count_documents({}) == 0:
        await db.announcements.insert_many([
            {"title": "Welcome to NECROLINK", "content": "We are recruiting skilled MLBB players. Join us for weekly tournaments!",
             "type": "recruitment", "created_at": datetime.now(timezone.utc)},
            {"title": "Weekend Tournament", "content": "This Saturday at 8 PM. Squad training starts at 6 PM. Be ready!",
             "type": "event", "created_at": datetime.now(timezone.utc)}
        ])
    
    # Events
    if await db.events.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        await db.events.insert_many([
            {
                "title": "Friday Night Clash", "description": "Weekly Friday battles. Squad up for epic clashes!",
                "category": "Friday Night Clash", "event_date": (now + timedelta(days=3)).isoformat(),
                "location": "Online", "status": "upcoming", "max_participants": 50,
                "prize_pool": "1000 Diamonds", "banner_url": "https://images.pexels.com/photos/7862505/pexels-photo-7862505.jpeg?auto=compress&cs=tinysrgb&w=940",
                "created_at": now
            },
            {
                "title": "NECROLINK Dark Cup 2026", "description": "Our flagship monthly tournament. Compete for the title of Dark Cup Champion.",
                "category": "NECROLINK Dark Cup", "event_date": (now + timedelta(days=14)).isoformat(),
                "location": "Online - Custom Rooms", "status": "upcoming", "max_participants": 100,
                "prize_pool": "10,000 Diamonds + Champion Title", "banner_url": "https://images.pexels.com/photos/9072394/pexels-photo-9072394.jpeg?auto=compress&cs=tinysrgb&w=940",
                "created_at": now
            },
            {
                "title": "Rank Push Night", "description": "Join our coordinated rank push session. Mythic+ welcome!",
                "category": "Rank Push Night", "event_date": (now + timedelta(hours=6)).isoformat(),
                "location": "Online", "status": "ongoing", "max_participants": 25,
                "prize_pool": "Glory & Honor", "banner_url": "https://images.pexels.com/photos/17195067/pexels-photo-17195067.jpeg?auto=compress&cs=tinysrgb&w=940",
                "created_at": now
            }
        ])
    
    # News
    if await db.news.count_documents({}) == 0:
        await db.news.insert_many([
            {
                "title": "NECROLINK Clan Reborn", "content": "We've rebranded! NECROLINK is the new era of our MLBB community. Stay tuned for major events.",
                "category": "events", "is_pinned": True, "is_published": True,
                "image_url": "https://images.pexels.com/photos/17195067/pexels-photo-17195067.jpeg?auto=compress&cs=tinysrgb&w=940",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "title": "New Hero Spotlight: Esmeralda Returns", "content": "The latest patch brings buffs to our favorite mage-tank hybrid. Discuss strategies in our Discord.",
                "category": "new_heroes", "is_pinned": False, "is_published": True,
                "created_at": datetime.now(timezone.utc)
            }
        ])
    
    # Products
    if await db.products.count_documents({}) == 0:
        await db.products.insert_many([
            {"name": "NECROLINK Jersey 2026", "description": "Official clan jersey with neon embroidered logo", "price": 49.99,
             "category": "jersey", "section": "merchandise", "is_active": True, "stock": 50,
             "image_url": "https://images.pexels.com/photos/7773546/pexels-photo-7773546.jpeg?auto=compress&cs=tinysrgb&w=400",
             "created_at": datetime.now(timezone.utc)},
            {"name": "NECROLINK Hoodie", "description": "Premium black hoodie with neon purple accents", "price": 59.99,
             "category": "hoodie", "section": "merchandise", "is_active": True, "stock": 30,
             "created_at": datetime.now(timezone.utc)},
            {"name": "Gaming Mousepad XL", "description": "Extra large RGB mousepad with NECROLINK logo", "price": 24.99,
             "category": "mousepad", "section": "merchandise", "is_active": True, "stock": 100,
             "created_at": datetime.now(timezone.utc)},
            {"name": "Sticker Pack", "description": "10x NECROLINK branded vinyl stickers", "price": 4.99,
             "category": "sticker", "section": "merchandise", "is_active": True, "stock": 200,
             "created_at": datetime.now(timezone.utc)},
            {"name": "86 Diamonds", "description": "Top up 86 diamonds instantly to your MLBB account", "price": 1.99,
             "category": "diamonds", "section": "topup", "is_active": True,
             "created_at": datetime.now(timezone.utc)},
            {"name": "172 Diamonds", "description": "Top up 172 diamonds to your MLBB account", "price": 3.99,
             "category": "diamonds", "section": "topup", "is_active": True,
             "created_at": datetime.now(timezone.utc)},
            {"name": "Weekly Diamond Pass", "description": "Daily diamond rewards for 7 days", "price": 1.49,
             "category": "weekly_pass", "section": "topup", "is_active": True,
             "created_at": datetime.now(timezone.utc)},
            {"name": "Starlight Membership", "description": "Monthly Starlight with exclusive skins", "price": 4.99,
             "category": "starlight", "section": "topup", "is_active": True,
             "created_at": datetime.now(timezone.utc)},
        ])

    # Gallery seed
    if await db.gallery.count_documents({}) == 0:
        await db.gallery.insert_many([
            {"title": "Tournament Victory", "description": "NECROLINK clinches the weekend custom matches", "category": "match",
             "image_url": "https://images.pexels.com/photos/7862505/pexels-photo-7862505.jpeg?auto=compress&cs=tinysrgb&w=940",
             "created_at": datetime.now(timezone.utc)},
            {"title": "MVP Moment - Aamon Triple Kill", "description": "The Duke of Shadows strikes again", "category": "mvp",
             "image_url": "https://images.pexels.com/photos/9072394/pexels-photo-9072394.jpeg?auto=compress&cs=tinysrgb&w=940",
             "created_at": datetime.now(timezone.utc)},
            {"title": "Squad Lineup", "description": "The full NECROLINK team", "category": "team",
             "image_url": "https://images.pexels.com/photos/17195067/pexels-photo-17195067.jpeg?auto=compress&cs=tinysrgb&w=940",
             "created_at": datetime.now(timezone.utc)},
        ])

    # Announcement bar default
    bar_exists = await db.settings.find_one({"key": "announcement_bar"})
    if not bar_exists:
        await db.settings.insert_one({
            "key": "announcement_bar",
            "value": {"text": "🔥 NECROLINK Dark Cup 2026 registration is now OPEN — 10,000 Diamonds prize pool!", "is_active": True, "color": "purple"},
            "updated_at": datetime.now(timezone.utc)
        })

    # Member of the Month default
    if await db.member_of_month.count_documents({}) == 0:
        await db.member_of_month.insert_one({
            "member_game_name": "NECROLINK_Aamon",
            "month": datetime.now(timezone.utc).strftime("%Y-%m"),
            "reason": "Carried the team to victory in 4 consecutive weekend tournaments. 68 MVPs and rising!",
            "created_at": datetime.now(timezone.utc)
        })

    # Tournament seed
    if await db.tournaments.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        await db.tournaments.insert_many([
            {
                "name": "NECROLINK Dark Cup 2026",
                "description": "Our flagship monthly tournament. 16 teams compete in single-elimination format.",
                "start_date": (now + timedelta(days=14)).isoformat(),
                "end_date": (now + timedelta(days=16)).isoformat(),
                "prize_pool": "10,000 Diamonds + Champion Title",
                "max_teams": 16,
                "status": "upcoming",
                "banner_url": "https://images.pexels.com/photos/9072394/pexels-photo-9072394.jpeg?auto=compress&cs=tinysrgb&w=940",
                "rules": "Single elimination. Best of 3. Standard MLBB ruleset. No banned heroes.",
                "bracket": None,
                "winners": None,
                "created_at": now,
            },
            {
                "name": "Friday Night Cup #12",
                "description": "Weekly quick tournament. 8 teams, single elimination.",
                "start_date": (now - timedelta(days=7)).isoformat(),
                "end_date": (now - timedelta(days=7)).isoformat(),
                "prize_pool": "1,000 Diamonds",
                "max_teams": 8,
                "status": "completed",
                "banner_url": "https://images.pexels.com/photos/7862505/pexels-photo-7862505.jpeg?auto=compress&cs=tinysrgb&w=940",
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
                        ]}
                    ]
                },
                "winners": ["Team Alpha", "Team Eta", "Team Epsilon"],
                "created_at": now,
            }
        ])

async def _background_startup():
    import asyncio
    await asyncio.sleep(0.5)
    init_storage()
    if _USING_MEMDB:
        logger.info("✅ Using in-memory database — skipping Atlas seeding")
        return
    try:
        await seed_admin()
        await seed_initial_data()
    except Exception as e:
        logger.error(f"Startup seeding failed (DB may not be reachable): {e}")
    try:
        await db.users.create_index("email", unique=True)
        await db.members.create_index("game_name", unique=True)
    except Exception as e:
        logger.warning(f"Index creation: {e}")
    logger.info("Startup complete")

@app.on_event("startup")
async def startup_event():
    import asyncio
    asyncio.create_task(_background_startup())
    logger.info("Background startup task scheduled")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
