import uuid
from sqlalchemy import (Column, String, Boolean, Numeric, Date, Integer,
                        ForeignKey, DateTime, Text, func)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

def pk(): return Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

class Usuario(Base):
    __tablename__ = "usuarios"
    id = pk()
    nome = Column(String(150), nullable=False)
    telefone = Column(String(20))
    email = Column(String(150), unique=True, nullable=False)
    senha_hash = Column(Text, nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

class Banco(Base):
    __tablename__ = "bancos"
    id = pk()
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"))
    nome = Column(String(120), nullable=False)
    tipo_conta = Column(String(20), nullable=False)
    saldo_inicial = Column(Numeric(14, 2), default=0)
    data_saldo_inicial = Column(Date, nullable=False)
    ativo = Column(Boolean, default=True)

class PlanoConta(Base):
    __tablename__ = "plano_contas"
    id = pk()
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"))
    nome = Column(String(120), nullable=False)
    tipo = Column(String(10), nullable=False)
    categoria = Column(String(80))
    cor = Column(String(20))
    icone = Column(String(50))
    ativo = Column(Boolean, default=True)

class Movimentacao(Base):
    __tablename__ = "movimentacoes"
    id = pk()
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"))
    banco_id = Column(UUID(as_uuid=True), ForeignKey("bancos.id", ondelete="CASCADE"))
    plano_conta_id = Column(UUID(as_uuid=True), ForeignKey("plano_contas.id"))
    descricao = Column(String(200), nullable=False)
    valor = Column(Numeric(14, 2), nullable=False)
    tipo = Column(String(10), nullable=False)
    data_lancamento = Column(Date, nullable=False)
    data_vencimento = Column(Date)
    data_pagamento = Column(Date)
    situacao = Column(String(15), default="pendente")
    observacoes = Column(Text)
    origem_fatura_id = Column(UUID(as_uuid=True))
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    eh_transferencia = Column(Boolean, default=False)
    transferencia_par_id = Column(UUID(as_uuid=True))


class Cartao(Base):
    __tablename__ = "cartoes"
    id = pk()
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"))
    nome = Column(String(120), nullable=False)
    banco_emissor = Column(String(120))
    limite_total = Column(Numeric(14, 2), nullable=False)
    melhor_dia_compra = Column(Integer)
    dia_vencimento = Column(Integer)
    bandeira = Column(String(40))
    ativo = Column(Boolean, default=True)

class CompraCartao(Base):
    __tablename__ = "compras_cartao"
    id = pk()
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"))
    cartao_id = Column(UUID(as_uuid=True), ForeignKey("cartoes.id", ondelete="CASCADE"))
    plano_conta_id = Column(UUID(as_uuid=True), ForeignKey("plano_contas.id"))
    descricao = Column(String(200), nullable=False)
    valor = Column(Numeric(14, 2), nullable=False)
    data_compra = Column(Date, nullable=False)
    parcelas = Column(Integer, default=1)
    paga = Column(Boolean, default=False)
    fatura_id = Column(UUID(as_uuid=True), ForeignKey("faturas.id"))
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

class Fatura(Base):
    __tablename__ = "faturas"
    id = pk()
    cartao_id = Column(UUID(as_uuid=True), ForeignKey("cartoes.id", ondelete="CASCADE"))
    competencia = Column(String(7), nullable=False)
    valor_total = Column(Numeric(14, 2), default=0)
    data_vencimento = Column(Date)
    paga = Column(Boolean, default=False)
    movimentacao_id = Column(UUID(as_uuid=True), ForeignKey("movimentacoes.id"))
