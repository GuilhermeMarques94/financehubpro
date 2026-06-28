from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_usuario_atual
from app.models.models import Movimentacao, Banco, Usuario
from app.schemas.schemas import MovimentacaoCriar, MovimentacaoOut

router = APIRouter(prefix="/movimentacoes", tags=["Movimentações"])

@router.post("", response_model=MovimentacaoOut)
def criar(d: MovimentacaoCriar, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    if not db.query(Banco).filter(Banco.id == d.banco_id, Banco.usuario_id == u.id).first():
        raise HTTPException(404, "Banco não encontrado")
    m = Movimentacao(usuario_id=u.id, **d.model_dump())
    db.add(m); db.commit(); db.refresh(m)
    return m

@router.get("", response_model=list[MovimentacaoOut])
def listar(banco_id: str | None = None, plano_conta_id: str | None = None,
           tipo: str | None = None, situacao: str | None = None,
           inicio: date | None = None, fim: date | None = None,
           db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    q = db.query(Movimentacao).filter(Movimentacao.usuario_id == u.id)
    if banco_id: q = q.filter(Movimentacao.banco_id == banco_id)
    if plano_conta_id: q = q.filter(Movimentacao.plano_conta_id == plano_conta_id)
    if tipo: q = q.filter(Movimentacao.tipo == tipo)
    if situacao: q = q.filter(Movimentacao.situacao == situacao)
    if inicio: q = q.filter(Movimentacao.data_lancamento >= inicio)
    if fim: q = q.filter(Movimentacao.data_lancamento <= fim)
    return q.order_by(Movimentacao.data_lancamento.desc()).all()

@router.put("/{mid}", response_model=MovimentacaoOut)
def editar(mid, d: MovimentacaoCriar, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    m = db.query(Movimentacao).filter(Movimentacao.id == mid, Movimentacao.usuario_id == u.id).first()
    if not m: raise HTTPException(404, "Movimentação não encontrada")
    for k, v in d.model_dump().items(): setattr(m, k, v)
    db.commit(); db.refresh(m)
    return m

@router.delete("/{mid}")
def excluir(mid, db: Session = Depends(get_db), u: Usuario = Depends(get_usuario_atual)):
    m = db.query(Movimentacao).filter(Movimentacao.id == mid, Movimentacao.usuario_id == u.id).first()
    if not m: raise HTTPException(404, "Movimentação não encontrada")
    if m.origem_fatura_id:
        raise HTTPException(400, "Esta movimentação é o pagamento de uma fatura. "
                                 "Estorne a fatura na tela de Cartões.")
    db.delete(m); db.commit()
    return {"ok": True}

