from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_senha, verificar_senha, criar_token, get_usuario_atual
from app.models.models import Usuario
from app.schemas.schemas import UsuarioCriar, UsuarioOut, Token

router = APIRouter(prefix="/auth", tags=["Autenticação"])

@router.post("/registrar", response_model=UsuarioOut)
def registrar(dados: UsuarioCriar, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == dados.email).first():
        raise HTTPException(400, "E-mail já cadastrado")
    user = Usuario(nome=dados.nome, telefone=dados.telefone,
                   email=dados.email, senha_hash=hash_senha(dados.senha))
    db.add(user); db.commit(); db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == form.username).first()
    if not user or not verificar_senha(form.password, user.senha_hash):
        raise HTTPException(401, "E-mail ou senha inválidos")
    return {"access_token": criar_token(str(user.id)), "token_type": "bearer"}

@router.get("/me", response_model=UsuarioOut)
def me(user: Usuario = Depends(get_usuario_atual)):
    return user
