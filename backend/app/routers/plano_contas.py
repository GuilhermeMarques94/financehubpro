from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_usuario_atual
from app.models.models import PlanoConta, Usuario
from app.schemas.schemas import PlanoContaCriar, PlanoContaOut

router = APIRouter(prefix="/plano-contas", tags=["Plano de Contas"])

@router.post("", response_model=PlanoContaOut)
def criar(d: PlanoContaCriar, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    p = PlanoConta(usuario_id=u.id, **d.model_dump())
    db.add(p); db.commit(); db.refresh(p)
    return p

@router.get("", response_model=list[PlanoContaOut])
def listar(db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    return db.query(PlanoConta).filter(PlanoConta.usuario_id == u.id).all()

@router.put("/{pid}", response_model=PlanoContaOut)
def editar(pid, d: PlanoContaCriar, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    p = db.query(PlanoConta).filter(PlanoConta.id == pid, PlanoConta.usuario_id == u.id).first()
    if not p: raise HTTPException(404, "Plano não encontrado")
    for k, v in d.model_dump().items(): setattr(p, k, v)
    db.commit(); db.refresh(p)
    return p

@router.delete("/{pid}")
def excluir(pid, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    p = db.query(PlanoConta).filter(PlanoConta.id == pid, PlanoConta.usuario_id == u.id).first()
    if not p: raise HTTPException(404, "Plano não encontrado")
    db.delete(p); db.commit()
    return {"ok": True}
