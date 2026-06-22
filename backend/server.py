from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, BackgroundTasks, UploadFile, File, Header, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
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
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

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
    rank: str = "Member"
    achievements: List[str] = []
    wins: int = 0
    mvp_count: int = 0
    avatar_url: Optional[str] = None
    is_leader: bool = False
    is_co_leader: bool = False

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
    category: str  # patch_notes, new_heroes, new_skins, events, esports, game_updates
    image_url: Optional[str] = None
    source_url: Optional[str] = None
    is_pinned: bool = False
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

# ============ AUTH ROUTES ============
@api_router.post("/auth/login")
async def login(request: LoginRequest, response: Response):
    email = request.email.lower()
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
@api_router.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    await get_admin_user(request)
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/uploads/{file_id}.{ext}"
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    result = put_object(path, data, file.content_type)
    await db.files.insert_one({
        "id": file_id, "storage_path": result["path"],
        "original_filename": file.filename, "content_type": file.content_type,
        "size": result["size"], "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"id": file_id, "url": f"/api/files/{result['path']}", "path": result["path"]}

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
    event = await db.events.find_one({"_id": ObjectId(event_id)})
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
        {"_id": ObjectId(event_id)},
        {"$set": {**event.model_dump(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event updated"}

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, request: Request):
    await get_admin_user(request)
    result = await db.events.delete_one({"_id": ObjectId(event_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    # Also delete registrations
    await db.event_registrations.delete_many({"event_id": event_id})
    return {"message": "Event deleted"}

# ============ EVENT REGISTRATIONS ============
@api_router.post("/event-registrations")
async def register_event(registration: EventRegistrationRequest):
    # Verify event exists
    event = await db.events.find_one({"_id": ObjectId(registration.event_id)})
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
        {"_id": ObjectId(reg_id)},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"message": "Status updated"}

# ============ NEWS ============
@api_router.get("/news")
async def get_news(category: Optional[str] = None):
    query = {"is_published": True}
    if category:
        query["category"] = category
    news = await db.news.find(query).sort([("is_pinned", -1), ("created_at", -1)]).to_list(100)
    for n in news:
        n["id"] = str(n.pop("_id"))
    return news

@api_router.get("/news/{news_id}")
async def get_news_item(news_id: str):
    item = await db.news.find_one({"_id": ObjectId(news_id)})
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
        {"_id": ObjectId(news_id)},
        {"$set": {**news.model_dump(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="News not found")
    return {"message": "News updated"}

@api_router.delete("/news/{news_id}")
async def delete_news(news_id: str, request: Request):
    await get_admin_user(request)
    result = await db.news.delete_one({"_id": ObjectId(news_id)})
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
        {"_id": ObjectId(product_id)},
        {"$set": {**product.model_dump(), "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product updated"}

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    await get_admin_user(request)
    result = await db.products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ============ ORDERS ============
@api_router.post("/orders")
async def create_order(order: OrderRequest):
    product = await db.products.find_one({"_id": ObjectId(order.product_id)})
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
        {"_id": ObjectId(order_id)},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order status updated"}

# ============ STATISTICS ============
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
        f.write(f"# NECROLINK Test Credentials\n\n## Admin Account\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n")
        f.write("## Legacy Admin (still works)\n- Email: admin@darknet.com\n- Password: DarkNet2024!\n\n")
        f.write("## Endpoints\n- /api/auth/login, /api/auth/register, /api/auth/me, /api/auth/logout\n- /api/events, /api/news, /api/products, /api/orders\n- /api/event-registrations, /api/applications, /api/announcements, /api/members\n- /api/upload, /api/files/{path}, /api/stats\n")

async def seed_initial_data():
    # Members
    if await db.members.count_documents({}) == 0:
        await db.members.insert_many([
            {
                "name": "Shadow Leader", "game_name": "NECROLINK_Shadow", "role": "Tank",
                "rank": "Leader", "achievements": ["MVP Season 23", "Tournament Champion"],
                "wins": 1247, "mvp_count": 89,
                "avatar_url": "https://images.pexels.com/photos/7773546/pexels-photo-7773546.jpeg?auto=compress&cs=tinysrgb&w=400",
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

@app.on_event("startup")
async def startup_event():
    init_storage()
    await seed_admin()
    await seed_initial_data()
    try:
        await db.users.create_index("email", unique=True)
        await db.members.create_index("game_name", unique=True)
    except Exception as e:
        logger.warning(f"Index creation: {e}")
    logger.info("Startup complete")

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
