from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Cartao, CompraCartao, Fatura, Movimentacao

def pagar_fatura(db: Session, usuario_id, cartao_id, banco_id,
                 competencia: str, data_pagamento: date):
    """Gera UMA saída na conta bancária com o total das compras abertas do cartão.
    Garante consistência: marca compras como pagas e evita duplicidade."""
    cartao = db.query(Cartao).filter(Cartao.id == cartao_id,
                                     Cartao.usuario_id == usuario_id).first()
    if not cartao:
        raise ValueError("Cartão não encontrado")

    compras = db.query(CompraCartao).filter(
        CompraCartao.cartao_id == cartao_id,
        CompraCartao.paga == False).all()
    if not compras:
        raise ValueError("Não há compras em aberto para este cartão")

    total = sum(Decimal(c.valor) for c in compras)

    fatura = Fatura(cartao_id=cartao_id, competencia=competencia,
                    valor_total=total, data_vencimento=data_pagamento, paga=True)
    db.add(fatura); db.flush()

    mov = Movimentacao(
        usuario_id=usuario_id, banco_id=banco_id, plano_conta_id=None,
        descricao=f"Pagamento fatura {cartao.nome} ({competencia})",
        valor=total, tipo="saida",
        data_lancamento=data_pagamento, data_vencimento=data_pagamento,
        data_pagamento=data_pagamento, situacao="pago",
        origem_fatura_id=fatura.id)
    db.add(mov); db.flush()

    fatura.movimentacao_id = mov.id
    for c in compras:
        c.paga = True
        c.fatura_id = fatura.id

    db.commit()
    return {"fatura_id": str(fatura.id), "valor_total": float(total),
            "movimentacao_id": str(mov.id)}
