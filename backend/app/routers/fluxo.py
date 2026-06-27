from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_usuario_atual
from app.models.models import Movimentacao, Banco, Usuario
from app.services.calculos import saldo_banco

router = APIRouter(prefix="/fluxo", tags=["Fluxo de Caixa"])

@router.get("")
def fluxo(inicio: date, fim: date, banco_id: str | None = None,
          db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    q = db.query(Movimentacao).filter(
        Movimentacao.usuario_id == u.id, Movimentacao.situacao == "pago",
        Movimentacao.data_lancamento.between(inicio, fim))
    if banco_id: q = q.filter(Movimentacao.banco_id == banco_id)
    movs = q.order_by(Movimentacao.data_lancamento).all()

    entradas = sum(float(m.valor) for m in movs if m.tipo == "entrada")
    saidas = sum(float(m.valor) for m in movs if m.tipo == "saida")

    bancos = db.query(Banco).filter(Banco.usuario_id == u.id).all()
    acumulado = float(sum(saldo_banco(db, b) for b in bancos))

    return {
        "periodo": {"inicio": str(inicio), "fim": str(fim)},
        "total_entradas": entradas, "total_saidas": saidas,
        "saldo_periodo": entradas - saidas,
        "saldo_acumulado": acumulado,
        "lancamentos": [
            {"data": str(m.data_lancamento), "descricao": m.descricao,
             "tipo": m.tipo, "valor": float(m.valor)} for m in movs],
    }
