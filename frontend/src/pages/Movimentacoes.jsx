import { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import { Plus, Trash2 } from "lucide-react";

const brl = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const vazio = { banco_id: "", plano_conta_id: "", descricao: "", valor: 0, tipo: "saida",
  data_lancamento: "", data_vencimento: "", data_pagamento: "", situacao: "pendente", observacoes: "" };

export default function Movimentacoes() {
  const [lista, setLista] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(vazio);
  const [filtros, setFiltros] = useState({ banco_id: "", situacao: "", tipo: "" });

  const carregar = () => {
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
    api.get("/movimentacoes", { params }).then(r => setLista(r.data));
  };

  useEffect(() => {
    api.get("/bancos").then(r => setBancos(r.data));
    api.get("/plano-contas").then(r => setPlanos(r.data));
  }, []);
  useEffect(() => { carregar(); }, [filtros]);

  const salvar = async (e) => {
    e.preventDefault();
    const p = { ...form, valor: parseFloat(form.valor) };
    Object.keys(p).forEach(k => p[k] === "" && (p[k] = null));
    await api.post("/movimentacoes", p);
    setModal(false); setForm(vazio); carregar();
  };

  const excluir = async (id) => {
    if (confirm("Excluir?")) { await api.delete(`/movimentacoes/${id}`); carregar(); }
  };

  const up = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const upF = (k) => (e) => setFiltros({ ...filtros, [k]: e.target.value });
  const nomeBanco = (id) => bancos.find(b => b.id === id)?.nome || "-";

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Movimentações</h1>
        <button className="btn" onClick={() => { setForm(vazio); setModal(true); }}><Plus size={16} /> Nova Movimentação</button>
      </div>

      <div className="filters">
        <select onChange={upF("banco_id")}><option value="">Todos os bancos</option>
          {bancos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}</select>
        <select onChange={upF("tipo")}><option value="">Todos os tipos</option>
          <option value="entrada">Entrada</option><option value="saida">Saída</option></select>
        <select onChange={upF("situacao")}><option value="">Todas situações</option>
          <option value="pago">Pago</option><option value="pendente">Pendente</option><option value="cancelado">Cancelado</option></select>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Banco</th><th>Tipo</th><th>Valor</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {lista.map(m => (
              <tr key={m.id}>
                <td>{m.data_lancamento}</td>
                <td>{m.descricao}</td>
                <td>{nomeBanco(m.banco_id)}</td>
                <td className={m.tipo === "entrada" ? "value green" : "value red"} style={{fontSize:14}}>{m.tipo}</td>
                <td>{brl(m.valor)}</td>
                <td><span className={`badge ${m.situacao}`}>{m.situacao}</span></td>
                <td><Trash2 size={16} style={{cursor:"pointer",color:"#ef4444"}} onClick={() => excluir(m.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Nova Movimentação" onClose={() => setModal(false)}>
          <form onSubmit={salvar}>
            <label>Banco</label>
            <select value={form.banco_id} onChange={up("banco_id")} required>
              <option value="">Selecione</option>
              {bancos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
            <label>Plano de Contas</label>
            <select value={form.plano_conta_id} onChange={up("plano_conta_id")}>
              <option value="">Selecione</option>
              {planos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <label>Descrição</label>
            <input className="input" value={form.descricao} onChange={up("descricao")} required />
            <label>Valor</label>
            <input className="input" type="number" step="0.01" value={form.valor} onChange={up("valor")} required />
            <label>Tipo</label>
            <select value={form.tipo} onChange={up("tipo")}>
              <option value="entrada">Entrada</option><option value="saida">Saída</option>
            </select>
            <label>Data do Lançamento</label>
            <input className="input" type="date" value={form.data_lancamento} onChange={up("data_lancamento")} required />
            <label>Data de Vencimento</label>
            <input className="input" type="date" value={form.data_vencimento} onChange={up("data_vencimento")} />
            <label>Data de Pagamento</label>
            <input className="input" type="date" value={form.data_pagamento} onChange={up("data_pagamento")} />
            <label>Situação</label>
            <select value={form.situacao} onChange={up("situacao")}>
              <option value="pendente">Pendente</option><option value="pago">Pago</option><option value="cancelado">Cancelado</option>
            </select>
            <label>Observações</label>
            <textarea value={form.observacoes} onChange={up("observacoes")} rows={2} />
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn">Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
