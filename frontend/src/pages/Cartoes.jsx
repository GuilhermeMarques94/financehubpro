import { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import { Plus, ShoppingCart, Receipt } from "lucide-react";

const brl = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Cartoes() {
  const [dados, setDados] = useState({ cartoes: [], resumo_geral: {} });
  const [bancos, setBancos] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [filtroCartao, setFiltroCartao] = useState("");
  const [modalCartao, setModalCartao] = useState(false);
  const [modalCompra, setModalCompra] = useState(false);
  const [modalFatura, setModalFatura] = useState(false);

  const [fCartao, setFCartao] = useState({ nome:"", banco_emissor:"", limite_total:0, melhor_dia_compra:1, dia_vencimento:10, bandeira:"", ativo:true });
  const [fCompra, setFCompra] = useState({ cartao_id:"", plano_conta_id:"", descricao:"", valor:0, data_compra:"", parcelas:1 });
  const [fFatura, setFFatura] = useState({ cartao_id:"", banco_id:"", competencia:"", data_pagamento:"" });

  const carregar = () => api.get("/cartoes").then(r => setDados(r.data));
  const carregarCompras = () => api.get("/cartoes/compras", { params: filtroCartao ? { cartao_id: filtroCartao } : {} }).then(r => setCompras(r.data));

  useEffect(() => {
    carregar();
    api.get("/bancos").then(r => setBancos(r.data));
    api.get("/plano-contas").then(r => setPlanos(r.data));
  }, []);
  useEffect(() => { carregarCompras(); }, [filtroCartao]);

  const salvarCartao = async (e) => {
    e.preventDefault();
    await api.post("/cartoes", { ...fCartao, limite_total: parseFloat(fCartao.limite_total),
      melhor_dia_compra: +fCartao.melhor_dia_compra, dia_vencimento: +fCartao.dia_vencimento });
    setModalCartao(false); carregar();
  };

  const salvarCompra = async (e) => {
    e.preventDefault();
    const p = { ...fCompra, valor: parseFloat(fCompra.valor), parcelas: +fCompra.parcelas };
    if (!p.plano_conta_id) p.plano_conta_id = null;
    await api.post("/cartoes/compras", p);
    setModalCompra(false); carregar(); carregarCompras();
  };

  const pagarFatura = async (e) => {
    e.preventDefault();
    try {
      await api.post("/cartoes/pagar-fatura", fFatura);
      setModalFatura(false); carregar(); carregarCompras();
      alert("Fatura paga! Saída gerada na conta bancária.");
    } catch (err) { alert(err.response?.data?.detail || "Erro ao pagar fatura."); }
  };

  const rg = dados.resumo_geral;
  const upC = (k) => (e) => setFCartao({ ...fCartao, [k]: e.target.value });
  const upCp = (k) => (e) => setFCompra({ ...fCompra, [k]: e.target.value });
  const upF = (k) => (e) => setFFatura({ ...fFatura, [k]: e.target.value });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Cartões de Crédito</h1>
        <div style={{display:"flex",gap:10}}>
          <button className="btn btn-outline" onClick={() => setModalFatura(true)}><Receipt size={16} /> Pagar Fatura</button>
          <button className="btn btn-outline" onClick={() => setModalCompra(true)}><ShoppingCart size={16} /> Nova Compra</button>
          <button className="btn" onClick={() => setModalCartao(true)}><Plus size={16} /> Novo Cartão</button>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="cards-grid">
        <div className="stat-card"><div className="label">Limite Total</div><div className="value">{brl(rg.limite_total)}</div></div>
        <div className="stat-card"><div className="label">Utilizado Total</div><div className="value red">{brl(rg.utilizado_total)}</div></div>
        <div className="stat-card"><div className="label">Disponível Total</div><div className="value green">{brl(rg.disponivel_total)}</div></div>
      </div>

      {/* Cartões individuais */}
      <div className="cards-grid">
        {dados.cartoes.map(c => {
          const pct = c.limite_total ? (c.utilizado / c.limite_total) * 100 : 0;
          return (
            <div className="stat-card" key={c.cartao_id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <strong>{c.nome}</strong>
              </div>
              <div className="label">Utilizado: <span className="value red" style={{fontSize:14}}>{brl(c.utilizado)}</span></div>
              <div className="label">Disponível: <span className="value green" style={{fontSize:14}}>{brl(c.disponivel)}</span></div>
              <div style={{height:6,background:"#2a3441",borderRadius:4,marginTop:10,overflow:"hidden"}}>
                <div style={{width:`${pct}%`,height:"100%",background: pct>80?"#ef4444":"#3b82f6"}} />
              </div>
              <div className="label" style={{marginTop:6}}>Limite: {brl(c.limite_total)}</div>
            </div>
          );
        })}
      </div>

      {/* Compras */}
      <div className="page-header" style={{marginTop:12}}>
        <h2 style={{fontSize:18}}>Compras</h2>
        <select onChange={(e) => setFiltroCartao(e.target.value)} style={{width:"auto",marginBottom:0}}>
          <option value="">Todos os cartões</option>
          {dados.cartoes.map(c => <option key={c.cartao_id} value={c.cartao_id}>{c.nome}</option>)}
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody>
            {compras.map(c => (
              <tr key={c.id}>
                <td>{c.data_compra}</td><td>{c.descricao}</td><td>{brl(c.valor)}</td>
                <td><span className={`badge ${c.paga ? "pago" : "pendente"}`}>{c.paga ? "Paga" : "Em fatura"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modais */}
      {modalCartao && (
        <Modal title="Novo Cartão" onClose={() => setModalCartao(false)}>
          <form onSubmit={salvarCartao}>
            <label>Nome do Cartão</label><input className="input" value={fCartao.nome} onChange={upC("nome")} required />
            <label>Banco Emissor</label><input className="input" value={fCartao.banco_emissor} onChange={upC("banco_emissor")} />
            <label>Limite Total</label><input className="input" type="number" step="0.01" value={fCartao.limite_total} onChange={upC("limite_total")} required />
            <label>Melhor Dia de Compra</label><input className="input" type="number" min="1" max="31" value={fCartao.melhor_dia_compra} onChange={upC("melhor_dia_compra")} />
            <label>Dia de Vencimento</label><input className="input" type="number" min="1" max="31" value={fCartao.dia_vencimento} onChange={upC("dia_vencimento")} />
            <label>Bandeira</label><input className="input" value={fCartao.bandeira} onChange={upC("bandeira")} placeholder="Visa, Master..." />
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setModalCartao(false)}>Cancelar</button>
              <button className="btn">Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      {modalCompra && (
        <Modal title="Nova Compra" onClose={() => setModalCompra(false)}>
          <form onSubmit={salvarCompra}>
            <label>Cartão</label>
            <select value={fCompra.cartao_id} onChange={upCp("cartao_id")} required>
              <option value="">Selecione</option>
              {dados.cartoes.map(c => <option key={c.cartao_id} value={c.cartao_id}>{c.nome}</option>)}
            </select>
            <label>Plano de Contas</label>
            <select value={fCompra.plano_conta_id} onChange={upCp("plano_conta_id")}>
              <option value="">Selecione</option>
              {planos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <label>Descrição</label><input className="input" value={fCompra.descricao} onChange={upCp("descricao")} required />
            <label>Valor</label><input className="input" type="number" step="0.01" value={fCompra.valor} onChange={upCp("valor")} required />
            <label>Data da Compra</label><input className="input" type="date" value={fCompra.data_compra} onChange={upCp("data_compra")} required />
            <label>Parcelas</label><input className="input" type="number" min="1" value={fCompra.parcelas} onChange={upCp("parcelas")} />
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setModalCompra(false)}>Cancelar</button>
              <button className="btn">Salvar</button>
            </div>
          </form>
        </Modal>
      )}

      {modalFatura && (
        <Modal title="Pagar Fatura" onClose={() => setModalFatura(false)}>
          <form onSubmit={pagarFatura}>
            <label>Cartão</label>
            <select value={fFatura.cartao_id} onChange={upF("cartao_id")} required>
              <option value="">Selecione</option>
              {dados.cartoes.map(c => <option key={c.cartao_id} value={c.cartao_id}>{c.nome}</option>)}
            </select>
            <label>Banco para débito</label>
            <select value={fFatura.banco_id} onChange={upF("banco_id")} required>
              <option value="">Selecione</option>
              {bancos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
            <label>Competência (YYYY-MM)</label>
            <input className="input" value={fFatura.competencia} onChange={upF("competencia")} placeholder="2026-06" required />
            <label>Data de Pagamento</label>
            <input className="input" type="date" value={fFatura.data_pagamento} onChange={upF("data_pagamento")} required />
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setModalFatura(false)}>Cancelar</button>
              <button className="btn">Confirmar Pagamento</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
