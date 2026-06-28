from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_usuario_atual
from app.models.models import Cartao, CompraCartao, Usuario, Fatura
from app.schemas.schemas import CartaoCriar, CompraCartaoCriar, PagarFatura
from app.services.calculos import resumo_cartao
from app.services.fatura_service import pagar_fatura, estornar_fatura

router = APIRouter(prefix="/cartoes", tags=["Cartões"])

@router.post("")
def criar_cartao(d: CartaoCriar, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    c = Cartao(usuario_id=u.id, **d.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    return resumo_cartao(db, c)

@router.get("")
def listar_cartoes(db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    cartoes = db.query(Cartao).filter(Cartao.usuario_id == u.id).all()
    resumos = [resumo_cartao(db, c) for c in cartoes]
    return {
        "cartoes": resumos,
        "resumo_geral": {
            "limite_total": sum(r["limite_total"] for r in resumos),
            "utilizado_total": sum(r["utilizado"] for r in resumos),
            "disponivel_total": sum(r["disponivel"] for r in resumos),
        }
    }

@router.post("/compras")
def criar_compra(d: CompraCartaoCriar, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    if not db.query(Cartao).filter(Cartao.id == d.cartao_id, Cartao.usuario_id == u.id).first():
        raise HTTPException(404, "Cartão não encontrado")
    c = CompraCartao(usuario_id=u.id, **d.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    return {"id": str(c.id)}

@router.get("/compras")
def listar_compras(cartao_id: str | None = None, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    q = db.query(CompraCartao).filter(CompraCartao.usuario_id == u.id)
    if cartao_id: q = q.filter(CompraCartao.cartao_id == cartao_id)
    return q.order_by(CompraCartao.data_compra.desc()).all()

@router.post("/pagar-fatura")
def pagar(d: PagarFatura, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    try:
        return pagar_fatura(db, u.id, d.cartao_id, d.banco_id, d.competencia, d.data_pagamento)
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.get("/faturas")
def listar_faturas(cartao_id: str | None = None, db: Session = Depends(get_db),
                   u: Usuario = Depends(get_usuario_atual)):
    q = db.query(Fatura).join(Cartao, Cartao.id == Fatura.cartao_id).filter(
        Cartao.usuario_id == u.id)
    if cartao_id:
        q = q.filter(Fatura.cartao_id == cartao_id)
    faturas = q.order_by(Fatura.data_vencimento.desc()).all()
    return [{
        "id": str(f.id),
        "cartao_id": str(f.cartao_id),
        "competencia": f.competencia,
        "valor_total": float(f.valor_total),
        "data_vencimento": str(f.data_vencimento),
        "paga": f.paga,
    } for f in faturas]

@router.delete("/faturas/{fatura_id}")
def estornar(fatura_id, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    try:
        return estornar_fatura(db, u.id, fatura_id)
    except ValueError as e:
        raise HTTPException(404, str(e))

@router.put("/compras/{compra_id}")
def editar_compra(compra_id, d: CompraCartaoCriar, db: Session = Depends(get_db),
                  u: Usuario = Depends(get_usuario_atual)):
    c = db.query(CompraCartao).filter(CompraCartao.id == compra_id,
                                      CompraCartao.usuario_id == u.id).first()
    if not c:
        raise HTTPException(404, "Compra não encontrada")
    if c.paga:
        raise HTTPException(400, "Compra já está em uma fatura paga. Estorne a fatura antes de editar.")
    if not db.query(Cartao).filter(Cartao.id == d.cartao_id, Cartao.usuario_id == u.id).first():
        raise HTTPException(404, "Cartão não encontrado")
    for k, v in d.model_dump().items():
        setattr(c, k, v)
    db.commit(); db.refresh(c)
    return {"id": str(c.id)}

@router.delete("/compras/{compra_id}")
def excluir_compra(compra_id, db: Session = Depends(get_db),
                   u: Usuario = Depends(get_usuario_atual)):
    c = db.query(CompraCartao).filter(CompraCartao.id == compra_id,
                                      CompraCartao.usuario_id == u.id).first()
    if not c:
        raise HTTPException(404, "Compra não encontrada")
    if c.paga:
        raise HTTPException(400, "Compra já está em uma fatura paga. Estorne a fatura antes de excluir.")
    db.delete(c); db.commit()
    return {"ok": True}
