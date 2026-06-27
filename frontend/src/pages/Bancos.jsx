import { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import { Plus, Pencil, Trash2 } from "lucide-react";

const brl = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const vazio = { nome: "", tipo_conta: "corrente", saldo_inicial: 0, data_saldo_inicial: "", ativo: true };

export default function Bancos() {
  const [lista, setLista] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(vazio);
  const [editId, setEditId] = useState(null);

  const carregar = () => api.get("/bancos").then(r => setLista(r.data));
  useEffect(() => { carregar(); }, []);

  const abrir = (b) => {
    if (b) { setForm(b); setEditId(b.id); } else { setForm(vazio); setEditId(null); }
    setModal(true);
  };

  const salvar = async (e) => {
    e.preventDefault();
    const payload = { ...form, saldo_inicial: parseFloat(form.saldo_inicial) };
    if (editId) await api.put(`/bancos/${editId}`, payload);
    else await api.post("/bancos", payload);
    setModal(false); carregar();
  };

  const excluir = async (id) => {
    if (confirm("Excluir este banco?")) { await api.delete(`/bancos/${id}`); carregar(); }
  };

  const up = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Bancos</h1>
        <button className="btn" onClick={() => abrir()}><Plus size={16} /> Novo Banco</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>Nome</th><th>Tipo</th><th>Saldo Inicial</th><th>Saldo Atual</th><th>Situação</th><th></th>
          </tr></thead>
          <tbody>
            {lista.map(b => (
              <tr key={b.id}>
                <td>{b.nome}</td>
                <td style={{textTransform:"capitalize"}}>{b.tipo_conta}</td>
                <td>{brl(b.saldo_inicial)}</td>
                <td className={b.saldo_atual >= 0 ? "value green" : "value red"} style={{fontSize:14}}>{brl(b.saldo_atual)}</td>
                <td><span className={`badge ${b.ativo ? "pago" : "cancelado"}`}>{b.ativo ? "Ativa" : "Inativa"}</span></td>
                <td style={{display:"flex",gap:8}}>
                  <Pencil size={16} style={{cursor:"pointer"}} onClick={() => abrir(b)} />
                  <Trash2 size={16} style={{cursor:"pointer",color:"#ef4444"}} onClick={() => excluir(b.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editId ? "Editar Banco" : "Novo Banco"} onClose={() => setModal(false)}>
          <form onSubmit={salvar}>
            <label>Nome do Banco</label>
            <input className="input" value={form.nome} onChange={up("nome")} required />
            <label>Tipo de Conta</label>
            <select value={form.tipo_conta} onChange={up("tipo_conta")}>
              <option value="corrente">Corrente</option>
              <option value="poupanca">Poupança</option>
              <option value="investimento">Investimento</option>
              <option value="outro">Outro</option>
            </select>
            <label>Saldo Inicial</label>
            <input className="input" type="number" step="0.01" value={form.saldo_inicial} onChange={up("saldo_inicial")} required />
            <label>Data do Saldo Inicial</label>
            <input className="input" type="date" value={form.data_saldo_inicial} onChange={up("data_saldo_inicial")} required />
            <label>Situação</label>
            <select value={form.ativo} onChange={(e) => setForm({...form, ativo: e.target.value === "true"})}>
              <option value="true">Ativa</option>
              <option value="false">Inativa</option>
            </select>
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
