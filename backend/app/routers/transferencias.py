import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_usuario_atual
from app.models.models import Movimentacao, Banco, Usuario
from app.schemas.schemas import TransferenciaCriar, MovimentacaoOut

router = APIRouter(prefix="/transferencias", tags=["Transferências"])

@router.post("", response_model=list[MovimentacaoOut])
def criar(d: TransferenciaCriar, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    if d.banco_origem_id == d.banco_destino_id:
        raise HTTPException(400, "Origem e destino devem ser diferentes")
    origem = db.query(Banco).filter(Banco.id == d.banco_origem_id, Banco.usuario_id == u.id).first()
    destino = db.query(Banco).filter(Banco.id == d.banco_destino_id, Banco.usuario_id == u.id).first()
    if not origem or not destino:
        raise HTTPException(404, "Banco não encontrado")

    par_id = uuid.uuid4()
    dt = d.data or date.today()
    desc = d.descricao or f"Transferência {origem.nome} → {destino.nome}"

    saida = Movimentacao(
        usuario_id=u.id, banco_id=origem.id, descricao=desc, valor=d.valor,
        tipo="saida", data_lancamento=dt, data_pagamento=dt, situacao="pago",
        eh_transferencia=True, transferencia_par_id=par_id)
    entrada = Movimentacao(
        usuario_id=u.id, banco_id=destino.id, descricao=desc, valor=d.valor,
        tipo="entrada", data_lancamento=dt, data_pagamento=dt, situacao="pago",
        eh_transferencia=True, transferencia_par_id=par_id)

    db.add_all([saida, entrada]); db.commit()
    db.refresh(saida); db.refresh(entrada)
    return [saida, entrada]

@router.get("", response_model=list[MovimentacaoOut])
def listar(db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    return db.query(Movimentacao).filter(
        Movimentacao.usuario_id == u.id,
        Movimentacao.eh_transferencia == True,
        Movimentacao.tipo == "saida"   # mostra só uma ponta na lista
    ).order_by(Movimentacao.data_lancamento.desc()).all()

@router.delete("/{par_id}")
def excluir(par_id: str, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    movs = db.query(Movimentacao).filter(
        Movimentacao.usuario_id == u.id,
        Movimentacao.transferencia_par_id == par_id).all()
    if not movs:
        raise HTTPException(404, "Transferência não encontrada")
    for m in movs: db.delete(m)
    db.commit()
    return {"ok": True}

@router.get("")
def listar(db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    saidas = db.query(Movimentacao).filter(
        Movimentacao.usuario_id == u.id,
        Movimentacao.eh_transferencia == True,
        Movimentacao.tipo == "saida"
    ).order_by(Movimentacao.data_lancamento.desc()).all()

    bancos = {b.id: b.nome for b in db.query(Banco).filter(Banco.usuario_id == u.id).all()}
    out = []
    for s in saidas:
        # acha a ponta de entrada (destino) pelo par
        entrada = db.query(Movimentacao).filter(
            Movimentacao.transferencia_par_id == s.transferencia_par_id,
            Movimentacao.tipo == "entrada").first()
        out.append({
            "id": str(s.id),
            "transferencia_par_id": str(s.transferencia_par_id),
            "data_lancamento": str(s.data_lancamento),
            "descricao": s.descricao,
            "valor": float(s.valor),
            "banco_id": str(s.banco_id),
            "banco_destino_id": str(entrada.banco_id) if entrada else None,
            "banco_destino_nome": bancos.get(entrada.banco_id) if entrada else "-",
        })
    return out
