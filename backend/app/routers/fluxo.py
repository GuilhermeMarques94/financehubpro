from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal
from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_usuario_atual
from app.models.models import Movimentacao, Banco, PlanoConta, Usuario
from app.services.calculos import saldo_banco

router = APIRouter(prefix="/fluxo", tags=["Fluxo de Caixa"])


@router.get("")
def fluxo(inicio: date, fim: date, banco_id: str | None = None,
          db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    q = db.query(Movimentacao).filter(
        Movimentacao.usuario_id == u.id, Movimentacao.situacao == "pago",
        Movimentacao.data_lancamento.between(inicio, fim))
    if banco_id:
        q = q.filter(Movimentacao.banco_id == banco_id)
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


@router.get("/relatorio")
def relatorio(ref_ano: int, ref_mes: int, meses: int = 12,
              db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    meses = meses if meses in (3, 6, 12) else 12

    # Janela deslizante: termina em (ref_ano, ref_mes), volta meses-1 para trás
    periodos = []  # lista de (ano, mes), do mais antigo ao mais recente
    y, mth = ref_ano, ref_mes
    for _ in range(meses):
        periodos.append((y, mth))
        mth -= 1
        if mth == 0:
            mth = 12
            y -= 1
    periodos.reverse()
    chaves = [f"{a}-{m:02d}" for (a, m) in periodos]  # ex.: "2025-11"

    planos = db.query(PlanoConta).filter(PlanoConta.usuario_id == u.id).all()
    plano_map = {p.id: p for p in planos}
    bancos = db.query(Banco).filter(Banco.usuario_id == u.id).all()

    movs = db.query(Movimentacao).filter(
        Movimentacao.usuario_id == u.id,
        Movimentacao.situacao == "pago",
        Movimentacao.eh_transferencia == False,
        Movimentacao.data_pagamento.isnot(None),
    ).all()

    movs_saldo = db.query(Movimentacao).filter(
        Movimentacao.usuario_id == u.id,
        Movimentacao.situacao == "pago",
        Movimentacao.data_pagamento.isnot(None),
    ).all()

    def zero():
        return {k: 0.0 for k in chaves}

    def chave_de(dt):
        return f"{dt.year}-{dt.month:02d}"

    receitas = defaultdict(zero)
    despesas = defaultdict(lambda: defaultdict(zero))

    for m in movs:
        k = chave_de(m.data_pagamento)
        if k not in chaves:
            continue
        p = plano_map.get(m.plano_conta_id)
        nome_plano = p.nome if p else "Sem plano"
        val = float(m.valor)
        if m.tipo == "entrada":
            receitas[nome_plano][k] += val
        else:
            categoria = (p.categoria if p and p.categoria else "Sem categoria")
            despesas[categoria][nome_plano][k] += val

    total_receitas = zero()
    receitas_out = []
    for nome, vals in receitas.items():
        for k in chaves:
            total_receitas[k] += vals[k]
        receitas_out.append({"nome": nome, "valores": vals})

    total_despesas = zero()
    categorias_out = []
    for cat, planos_cat in despesas.items():
        subtotal = zero()
        planos_out = []
        for nome, vals in planos_cat.items():
            for k in chaves:
                subtotal[k] += vals[k]
            planos_out.append({"nome": nome, "valores": vals})
        for k in chaves:
            total_despesas[k] += subtotal[k]
        categorias_out.append({"categoria": cat, "total": subtotal, "planos": planos_out})

    resultado = {k: total_receitas[k] - total_despesas[k] for k in chaves}

    def saldo_ate(banco, dt_fim):
        total = Decimal(banco.saldo_inicial or 0)
        for mv in movs_saldo:
            if mv.banco_id != banco.id:
                continue
            if mv.data_pagamento <= dt_fim:
                total += Decimal(mv.valor) if mv.tipo == "entrada" else -Decimal(mv.valor)
        return float(total)

    def transf_liquida(dt_ini, dt_fim):
        total = Decimal(0)
        for mv in movs_saldo:
            if not mv.eh_transferencia:
                continue
            if dt_ini <= mv.data_pagamento <= dt_fim:
                total += Decimal(mv.valor) if mv.tipo == "entrada" else -Decimal(mv.valor)
        return float(total)

    saldo_inicial_tot = zero()
    saldo_final_tot = zero()
    saldo_inicial_banco = {b.id: zero() for b in bancos}
    saldo_final_banco = {b.id: zero() for b in bancos}

    for b in bancos:
        for (a, mes) in periodos:
            k = f"{a}-{mes:02d}"
            ultimo_dia = monthrange(a, mes)[1]
            fim_mes = date(a, mes, ultimo_dia)
            ini_mes = date(a, mes, 1)
            sig = saldo_ate(b, ini_mes - timedelta(days=1))
            sfg = saldo_ate(b, fim_mes)
            saldo_inicial_banco[b.id][k] = sig
            saldo_final_banco[b.id][k] = sfg
            saldo_inicial_tot[k] += sig
            saldo_final_tot[k] += sfg

    diferenca_saldo = {k: saldo_final_tot[k] - saldo_inicial_tot[k] for k in chaves}
    diferenca_conciliacao = {}
    for (a, mes) in periodos:
        k = f"{a}-{mes:02d}"
        ultimo_dia = monthrange(a, mes)[1]
        tl = transf_liquida(date(a, mes, 1), date(a, mes, ultimo_dia))
        diferenca_conciliacao[k] = round(diferenca_saldo[k] - resultado[k] - tl, 2)

    return {
        "colunas": [{"chave": f"{a}-{m:02d}", "ano": a, "mes": m} for (a, m) in periodos],
        "receitas": receitas_out,
        "total_receitas": total_receitas,
        "despesas": categorias_out,
        "total_despesas": total_despesas,
        "resultado": resultado,
        "bancos": [{
            "nome": b.nome,
            "saldo_inicial": saldo_inicial_banco[b.id],
            "saldo_final": saldo_final_banco[b.id],
        } for b in bancos],
        "saldo_inicial_total": saldo_inicial_tot,
        "saldo_final_total": saldo_final_tot,
        "diferenca_saldo": diferenca_saldo,
        "diferenca_conciliacao": diferenca_conciliacao,
    }