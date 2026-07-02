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
def relatorio(ano: int, meses: int = 12,
              db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    meses = meses if meses in (3, 6, 12) else 12
    lista_meses = list(range(13 - meses, 13))  # ex.: 3 => [10, 11, 12]

    planos = db.query(PlanoConta).filter(PlanoConta.usuario_id == u.id).all()
    plano_map = {p.id: p for p in planos}
    bancos = db.query(Banco).filter(Banco.usuario_id == u.id).all()

    # Movimentações pagas (SEM transferências) -> receitas/despesas/resultado
    movs = db.query(Movimentacao).filter(
        Movimentacao.usuario_id == u.id,
        Movimentacao.situacao == "pago",
        Movimentacao.eh_transferencia == False,
        Movimentacao.data_pagamento.isnot(None),
    ).all()

    # Movimentações pagas (COM transferências) -> saldo por banco
    movs_saldo = db.query(Movimentacao).filter(
        Movimentacao.usuario_id == u.id,
        Movimentacao.situacao == "pago",
        Movimentacao.data_pagamento.isnot(None),
    ).all()

    # ---- Receitas: por plano de conta (entrada) ----
    receitas = defaultdict(lambda: {m: 0.0 for m in lista_meses})
    # ---- Despesas: categoria -> plano -> {mes: valor} ----
    despesas = defaultdict(lambda: defaultdict(lambda: {m: 0.0 for m in lista_meses}))

    for m in movs:
        if m.data_pagamento.year != ano:
            continue
        mes = m.data_pagamento.month
        if mes not in lista_meses:
            continue
        p = plano_map.get(m.plano_conta_id)
        nome_plano = p.nome if p else "Sem plano"
        val = float(m.valor)
        if m.tipo == "entrada":
            receitas[nome_plano][mes] += val
        else:
            categoria = (p.categoria if p and p.categoria else "Sem categoria")
            despesas[categoria][nome_plano][mes] += val

    # ---- Totais receitas ----
    total_receitas = {m: 0.0 for m in lista_meses}
    receitas_out = []
    for nome, vals in receitas.items():
        for m in lista_meses:
            total_receitas[m] += vals[m]
        receitas_out.append({"nome": nome, "valores": vals})

    # ---- Totais despesas por categoria ----
    total_despesas = {m: 0.0 for m in lista_meses}
    categorias_out = []
    for cat, planos_cat in despesas.items():
        subtotal = {m: 0.0 for m in lista_meses}
        planos_out = []
        for nome, vals in planos_cat.items():
            for m in lista_meses:
                subtotal[m] += vals[m]
            planos_out.append({"nome": nome, "valores": vals})
        for m in lista_meses:
            total_despesas[m] += subtotal[m]
        categorias_out.append({"categoria": cat, "total": subtotal, "planos": planos_out})

    # ---- Resultado ----
    resultado = {m: total_receitas[m] - total_despesas[m] for m in lista_meses}

    # ---- Saldos por banco/mês (COM transferências) ----
    def saldo_ate(banco, dt_fim):
        total = Decimal(banco.saldo_inicial or 0)
        for mv in movs_saldo:
            if mv.banco_id != banco.id:
                continue
            if mv.data_pagamento <= dt_fim:
                total += Decimal(mv.valor) if mv.tipo == "entrada" else -Decimal(mv.valor)
        return float(total)

    # ---- Líquido de transferências no mês (para conciliar) ----
    def transf_liquida(dt_ini, dt_fim):
        total = Decimal(0)
        for mv in movs_saldo:
            if not mv.eh_transferencia:
                continue
            if dt_ini <= mv.data_pagamento <= dt_fim:
                total += Decimal(mv.valor) if mv.tipo == "entrada" else -Decimal(mv.valor)
        return float(total)

    saldo_inicial_tot = {m: 0.0 for m in lista_meses}
    saldo_final_tot = {m: 0.0 for m in lista_meses}
    saldo_inicial_banco = {b.id: {m: 0.0 for m in lista_meses} for b in bancos}
    saldo_final_banco = {b.id: {m: 0.0 for m in lista_meses} for b in bancos}

    for b in bancos:
        for mes in lista_meses:
            ultimo_dia = monthrange(ano, mes)[1]
            fim_mes = date(ano, mes, ultimo_dia)
            ini_mes = date(ano, mes, 1)
            sig = saldo_ate(b, ini_mes - timedelta(days=1))  # saldo inicial = fim do mês anterior
            sfg = saldo_ate(b, fim_mes)
            saldo_inicial_banco[b.id][mes] = sig
            saldo_final_banco[b.id][mes] = sfg
            saldo_inicial_tot[mes] += sig
            saldo_final_tot[mes] += sfg

    diferenca_saldo = {m: saldo_final_tot[m] - saldo_inicial_tot[m] for m in lista_meses}
    diferenca_conciliacao = {}
    for mes in lista_meses:
        ultimo_dia = monthrange(ano, mes)[1]
        tl = transf_liquida(date(ano, mes, 1), date(ano, mes, ultimo_dia))
        diferenca_conciliacao[mes] = round(diferenca_saldo[mes] - resultado[mes] - tl, 2)

    bancos_out = [{
        "nome": b.nome,
        "saldo_inicial": saldo_inicial_banco[b.id],
        "saldo_final": saldo_final_banco[b.id],
    } for b in bancos]

    return {
        "ano": ano,
        "meses": lista_meses,
        "receitas": receitas_out,
        "total_receitas": total_receitas,
        "despesas": categorias_out,
        "total_despesas": total_despesas,
        "resultado": resultado,
        "bancos": bancos_out,
        "saldo_inicial_total": saldo_inicial_tot,
        "saldo_final_total": saldo_final_tot,
        "diferenca_saldo": diferenca_saldo,
        "diferenca_conciliacao": diferenca_conciliacao,
    }
