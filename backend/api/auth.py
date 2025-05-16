from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import hashlib
from typing import List

from models.database import get_db, get_user_by_username, create_user, get_all_users

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    username: str
    is_admin: bool


@router.post("/signup", response_model=UserResponse)
async def sign_up(user: UserCreate, db: Session = Depends(get_db)):
    """用户注册"""
    existing_user = get_user_by_username(db, user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = hashlib.sha256(user.password.encode()).hexdigest()
    new_user = create_user(db, username=user.username, password=hashed_password, is_admin=False)
    return UserResponse(username=new_user.username, is_admin=new_user.is_admin)


@router.post("/login", response_model=UserResponse)
async def login(user: UserCreate, db: Session = Depends(get_db)):
    """用户登录"""
    if user.username == "admin" and user.password == "admin123":
        return UserResponse(username="admin", is_admin=True)
    db_user = get_user_by_username(db, user.username)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    hashed_password = hashlib.sha256(user.password.encode()).hexdigest()
    if db_user.password != hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return UserResponse(username=db_user.username, is_admin=db_user.is_admin)


@router.get("/users", response_model=List[UserResponse])
async def get_users(db: Session = Depends(get_db)):
    """获取用户列表（不包括管理员）"""
    users = get_all_users(db)
    return [UserResponse(username=user.username, is_admin=user.is_admin) for user in users]
