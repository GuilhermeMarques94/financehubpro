from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_usuario_atual
from app.models.models import Banco, Usuario
from app.schemas.schemas import BancoCriar, BancoOut
from app.services.calculos import saldo_banco

router = APIRouter(prefix="/bancos", tags=["Bancos"])

@router.post("", response_model=BancoOut)
def criar(d: BancoCriar, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    b = Banco(usuario_id=u.id, **d.model_dump())
    db.add(b); db.commit(); db.refresh(b)
    return b

@router.get("", response_model=list[BancoOut])
def listar(db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    bancos = db.query(Banco).filter(Banco.usuario_id == u.id).all()
    out = []
    for b in bancos:
        bo = BancoOut.model_validate(b)
        bo.saldo_atual = float(saldo_banco(db, b))
        out.append(bo)
    return out

@router.put("/{banco_id}", response_model=BancoOut)
def editar(banco_id, d: BancoCriar, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    b = db.query(Banco).filter(Banco.id == banco_id, Banco.usuario_id == u.id).first()
    if not b: raise HTTPException(404, "Banco não encontrado")
    for k, v in d.model_dump().items(): setattr(b, k, v)
    db.commit(); db.refresh(b)
    return b

@router.delete("/{banco_id}")
def excluir(banco_id, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    b = db.query(Banco).filter(Banco.id == banco_id, Banco.usuario_id == u.id).first()
    if not b: raise HTTPException(404, "Banco não encontrado")
    db.delete(b); db.commit()
    return {"ok": True}
