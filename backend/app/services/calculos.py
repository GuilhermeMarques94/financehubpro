from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Banco, Movimentacao, Cartao, CompraCartao

def saldo_banco(db: Session, banco: Banco) -> Decimal:
    """Saldo atual = saldo inicial + entradas pagas - saídas pagas."""
    movs = db.query(Movimentacao.tipo, func.coalesce(func.sum(Movimentacao.valor), 0))\
        .filter(Movimentacao.banco_id == banco.id,
                Movimentacao.situacao == "pago")\
        .group_by(Movimentacao.tipo).all()
    saldo = Decimal(banco.saldo_inicial)
    for tipo, total in movs:
        saldo += Decimal(total) if tipo == "entrada" else -Decimal(total)
    return saldo

def utilizado_cartao(db: Session, cartao: Cartao) -> Decimal:
    """Soma das compras ainda não pagas (em fatura aberta)."""
    total = db.query(func.coalesce(func.sum(CompraCartao.valor), 0))\
        .filter(CompraCartao.cartao_id == cartao.id,
                CompraCartao.paga == False).scalar()
    return Decimal(total or 0)

def resumo_cartao(db: Session, cartao: Cartao) -> dict:
    utilizado = utilizado_cartao(db, cartao)
    return {
        "cartao_id": str(cartao.id),
        "nome": cartao.nome,
        "limite_total": float(cartao.limite_total),
        "utilizado": float(utilizado),
        "disponivel": float(Decimal(cartao.limite_total) - utilizado),
    }
