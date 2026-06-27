from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.core.database import get_db
from app.core.security import get_usuario_atual
from app.models.models import Banco, Movimentacao, Cartao, PlanoConta, Usuario
from app.services.calculos import saldo_banco, resumo_cartao

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("")
def dashboard(db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    hoje = date.today()
    bancos = db.query(Banco).filter(Banco.usuario_id == u.id).all()
    saldo_total = float(sum(saldo_banco(db, b) for b in bancos)) if bancos else 0.0

    def soma_mes(tipo):
        return float(db.query(func.coalesce(func.sum(Movimentacao.valor), 0)).filter(
            Movimentacao.usuario_id == u.id, Movimentacao.tipo == tipo,
            Movimentacao.situacao == "pago",
            extract("month", Movimentacao.data_lancamento) == hoje.month,
            extract("year", Movimentacao.data_lancamento) == hoje.year).scalar())

    entradas = soma_mes("entrada"); saidas = soma_mes("saida")
    cartoes = db.query(Cartao).filter(Cartao.usuario_id == u.id).all()
    res_cartoes = [resumo_cartao(db, c) for c in cartoes]

    proximas = db.query(Movimentacao).filter(
        Movimentacao.usuario_id == u.id, Movimentacao.situacao == "pendente",
        Movimentacao.data_vencimento >= hoje
    ).order_by(Movimentacao.data_vencimento).limit(5).all()

    ultimos = db.query(Movimentacao).filter(Movimentacao.usuario_id == u.id)\
        .order_by(Movimentacao.criado_em.desc()).limit(5).all()

    # gastos por categoria
    cat = db.query(PlanoConta.categoria, func.sum(Movimentacao.valor))\
        .join(Movimentacao, Movimentacao.plano_conta_id == PlanoConta.id)\
        .filter(Movimentacao.usuario_id == u.id, Movimentacao.tipo == "saida")\
        .group_by(PlanoConta.categoria).all()

    return {
        "saldo_total_bancos": saldo_total,
        "entradas_mes": entradas, "saidas_mes": saidas,
        "saldo_mes": entradas - saidas,
        "total_gasto_cartoes": sum(r["utilizado"] for r in res_cartoes),
        "limite_disponivel_cartoes": sum(r["disponivel"] for r in res_cartoes),
        "proximas_contas": [
            {"descricao": p.descricao, "valor": float(p.valor),
             "vencimento": str(p.data_vencimento)} for p in proximas],
        "ultimos_lancamentos": [
            {"descricao": m.descricao, "valor": float(m.valor), "tipo": m.tipo,
             "data": str(m.data_lancamento)} for m in ultimos],
        "gastos_por_categoria": [
            {"categoria": c or "Sem categoria", "total": float(t)} for c, t in cat],
    }
