from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, BackgroundTasks, Depends
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
import secrets
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get('JWT_SECRET')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ PASSWORD HASHING ============
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# ============ JWT TOKEN MANAGEMENT ============
def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
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

# ============ EMAIL FUNCTIONALITY ============
def send_application_email(applicant_name: str, applicant_email: str, role: str, experience: str, reason: str):
    try:
        message = Mail(
            from_email=os.getenv('SENDER_EMAIL'),
            to_emails=os.getenv('ADMIN_EMAIL'),
            subject=f'New Dark_Net Application from {applicant_name}',
            html_content=f"""
            <html>
                <body style="background-color: #000; color: #fff; font-family: monospace;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #00E5FF;">
                        <h2 style="color: #00E5FF; text-transform: uppercase;">New Clan Application</h2>
                        <p><strong style="color: #B026FF;">Name:</strong> {applicant_name}</p>
                        <p><strong style="color: #B026FF;">Email:</strong> {applicant_email}</p>
                        <p><strong style="color: #B026FF;">Preferred Role:</strong> {role}</p>
                        <p><strong style="color: #B026FF;">Experience:</strong> {experience}</p>
                        <p><strong style="color: #B026FF;">Why Join:</strong></p>
                        <p style="border-left: 3px solid #FF003C; padding-left: 15px;">{reason}</p>
                        <hr style="border-color: #1A1A2A;" />
                        <p style="color: #606070; font-size: 12px;">Review this application in your admin dashboard.</p>
                    </div>
                </body>
            </html>
            """
        )
        sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
        response = sg.send(message)
        return response.status_code == 202
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False

# ============ AUTH HELPER ============
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
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=86400,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/"
    )
    
    return {
        "_id": user_id,
        "email": user["email"],
        "name": user.get("name"),
        "role": user.get("role", "member"),
        "game_name": user.get("game_name"),
        "preferred_role": user.get("preferred_role")
    }

@api_router.post("/auth/register")
async def register(request: RegisterRequest, response: Response):
    email = request.email.lower()
    existing_user = await db.users.find_one({"email": email})
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(request.password)
    user_doc = {
        "email": email,
        "password_hash": hashed_password,
        "name": request.name,
        "game_name": request.game_name,
        "preferred_role": request.preferred_role,
        "role": "member",
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email, "member")
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=86400,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/"
    )
    
    return {
        "_id": user_id,
        "email": email,
        "name": request.name,
        "role": "member",
        "game_name": request.game_name,
        "preferred_role": request.preferred_role
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

# ============ APPLICATION ROUTES ============
@api_router.post("/applications")
async def submit_application(application: ApplicationRequest, background_tasks: BackgroundTasks):
    app_doc = {
        "name": application.name,
        "email": application.email.lower(),
        "game_name": application.game_name,
        "preferred_role": application.preferred_role,
        "experience": application.experience,
        "discord_username": application.discord_username,
        "reason": application.reason,
        "status": "pending",
        "submitted_at": datetime.now(timezone.utc)
    }
    
    result = await db.applications.insert_one(app_doc)
    
    background_tasks.add_task(
        send_application_email,
        application.name,
        application.email,
        application.preferred_role,
        application.experience,
        application.reason
    )
    
    return {
        "id": str(result.inserted_id),
        "message": "Application submitted successfully",
        "status": "pending"
    }

@api_router.get("/applications")
async def get_applications(request: Request):
    await get_admin_user(request)
    applications = await db.applications.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(100)
    return applications

@api_router.patch("/applications/{email}/status")
async def update_application_status(email: str, status: str, request: Request):
    await get_admin_user(request)
    result = await db.applications.update_one(
        {"email": email.lower()},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Status updated successfully"}

# ============ MEMBER ROUTES ============
@api_router.get("/members")
async def get_members():
    members = await db.members.find({}, {"_id": 0}).to_list(100)
    return members

@api_router.post("/members")
async def create_member(member: MemberRequest, request: Request):
    await get_admin_user(request)
    member_doc = member.model_dump()
    member_doc["created_at"] = datetime.now(timezone.utc)
    await db.members.insert_one(member_doc)
    return {"message": "Member created successfully"}

@api_router.put("/members/{game_name}")
async def update_member(game_name: str, member: MemberRequest, request: Request):
    await get_admin_user(request)
    result = await db.members.update_one(
        {"game_name": game_name},
        {"$set": member.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member updated successfully"}

@api_router.delete("/members/{game_name}")
async def delete_member(game_name: str, request: Request):
    await get_admin_user(request)
    result = await db.members.delete_one({"game_name": game_name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member deleted successfully"}

# ============ ANNOUNCEMENT ROUTES ============
@api_router.get("/announcements")
async def get_announcements():
    announcements = await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    return announcements

@api_router.post("/announcements")
async def create_announcement(announcement: AnnouncementRequest, request: Request):
    await get_admin_user(request)
    ann_doc = announcement.model_dump()
    ann_doc["created_at"] = datetime.now(timezone.utc)
    await db.announcements.insert_one(ann_doc)
    return {"message": "Announcement created successfully"}

@api_router.delete("/announcements/{title}")
async def delete_announcement(title: str, request: Request):
    await get_admin_user(request)
    result = await db.announcements.delete_one({"title": title})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Announcement deleted successfully"}

# ============ ADMIN SEEDING ============
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@darknet.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "DarkNet2024!")
    existing = await db.users.find_one({"email": admin_email})
    
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info(f"Admin password updated for: {admin_email}")
    
    # Write test credentials
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Dark_Net Test Credentials\n\n")
        f.write("## Admin Account\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write(f"- Role: admin\n\n")
        f.write("## Endpoints\n")
        f.write("- Login: POST /api/auth/login\n")
        f.write("- Register: POST /api/auth/register\n")
        f.write("- Get Me: GET /api/auth/me\n")
        f.write("- Applications: POST /api/applications\n")
        f.write("- Members: GET /api/members\n")
        f.write("- Announcements: GET /api/announcements\n")

async def seed_initial_data():
    # Seed sample members
    member_count = await db.members.count_documents({})
    if member_count == 0:
        sample_members = [
            {
                "name": "Shadow Leader",
                "game_name": "DarkNet_Shadow",
                "role": "Tank",
                "rank": "Leader",
                "achievements": ["MVP Season 23", "Triple Kill Master", "Tournament Champion"],
                "wins": 1247,
                "mvp_count": 89,
                "avatar_url": "https://images.pexels.com/photos/7773546/pexels-photo-7773546.jpeg?auto=compress&cs=tinysrgb&w=400",
                "is_leader": True,
                "is_co_leader": False,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "name": "Cyber Phantom",
                "game_name": "DarkNet_Phantom",
                "role": "Jungle",
                "rank": "Co-Leader",
                "achievements": ["Savage Master", "Maniac x50"],
                "wins": 982,
                "mvp_count": 67,
                "avatar_url": "https://images.pexels.com/photos/7773975/pexels-photo-7773975.jpeg?auto=compress&cs=tinysrgb&w=400",
                "is_leader": False,
                "is_co_leader": True,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        await db.members.insert_many(sample_members)
        logger.info("Sample members created")
    
    # Seed sample announcements
    ann_count = await db.announcements.count_documents({})
    if ann_count == 0:
        sample_announcements = [
            {
                "title": "Welcome to Dark_Net",
                "content": "We are now recruiting skilled MLBB players. Join us for weekly tournaments and custom matches!",
                "type": "recruitment",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "title": "Weekend Tournament",
                "content": "This Saturday at 8 PM. Squad training starts at 6 PM. Be ready!",
                "type": "event",
                "created_at": datetime.now(timezone.utc)
            }
        ]
        await db.announcements.insert_many(sample_announcements)
        logger.info("Sample announcements created")

@app.on_event("startup")
async def startup_event():
    await seed_admin()
    await seed_initial_data()
    await db.users.create_index("email", unique=True)
    await db.members.create_index("game_name", unique=True)
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)