from datetime import date
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine, SessionLocal
from app.core.security import hash_senha
from app.models.models import Usuario
from app.routers import auth, bancos, plano_contas, movimentacoes, cartoes, dashboard, fluxo

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FinanceHub API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"^https://financehubpro[a-z0-9-]*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_admin():
    db = SessionLocal()
    try:
        if not db.query(Usuario).filter(Usuario.email == "guinis@financehub.com").first():
            db.add(Usuario(
                nome="guinis", telefone="34984319104",
                email="guinis@financehub.com",
                senha_hash=hash_senha("senha@123")))
            db.commit()
    finally:
        db.close()

seed_admin()

app.include_router(auth.router)
app.include_router(bancos.router)
app.include_router(plano_contas.router)
app.include_router(movimentacoes.router)
app.include_router(cartoes.router)
app.include_router(fluxo.router)
app.include_router(dashboard.router)

@app.get("/")
def health():
    return {"status": "ok", "service": "FinanceHub"}
