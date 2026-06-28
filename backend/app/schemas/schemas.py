from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import UUID4, BaseModel, EmailStr, Field, condecimal

class UsuarioCriar(BaseModel):
    nome: str
    telefone: Optional[str] = None
    email: EmailStr
    senha: str = Field(min_length=6)

class UsuarioOut(BaseModel):
    id: UUID; nome: str; telefone: Optional[str]; email: EmailStr
    class Config: from_attributes = True

class Token(BaseModel):
    access_token: str; token_type: str

class BancoCriar(BaseModel):
    nome: str; tipo_conta: str
    saldo_inicial: Decimal = 0
    data_saldo_inicial: date
    ativo: bool = True

class BancoOut(BancoCriar):
    id: UUID; saldo_atual: Optional[float] = None
    class Config: from_attributes = True

class PlanoContaCriar(BaseModel):
    nome: str; tipo: str
    categoria: Optional[str] = None
    cor: Optional[str] = None; icone: Optional[str] = None
    ativo: bool = True

class PlanoContaOut(PlanoContaCriar):
    id: UUID
    class Config: from_attributes = True

class MovimentacaoCriar(BaseModel):
    banco_id: UUID
    plano_conta_id: Optional[UUID] = None
    descricao: str; valor: Decimal; tipo: str
    data_lancamento: date
    data_vencimento: Optional[date] = None
    data_pagamento: Optional[date] = None
    situacao: str = "pendente"
    observacoes: Optional[str] = None

class MovimentacaoOut(MovimentacaoCriar):
    id: UUID
    class Config: from_attributes = True
    eh_transferencia: bool = False
    transferencia_par_id: UUID4 | None = None

class CartaoCriar(BaseModel):
    nome: str; banco_emissor: Optional[str] = None
    limite_total: Decimal
    melhor_dia_compra: Optional[int] = None
    dia_vencimento: Optional[int] = None
    bandeira: Optional[str] = None
    ativo: bool = True

class CompraCartaoCriar(BaseModel):
    cartao_id: UUID
    plano_conta_id: Optional[UUID] = None
    descricao: str; valor: Decimal
    data_compra: date; parcelas: int = 1

class PagarFatura(BaseModel):
    cartao_id: UUID; banco_id: UUID
    competencia: str; data_pagamento: date

class TransferenciaCriar(BaseModel):
    banco_origem_id: UUID4
    banco_destino_id: UUID4
    valor: condecimal(gt=0)
    descricao: str | None = None
    data: date | None = None
