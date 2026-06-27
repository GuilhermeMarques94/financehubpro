import { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import { Plus, Pencil, Trash2 } from "lucide-react";

const vazio = { nome: "", tipo: "saida", categoria: "", cor: "#3b82f6", icone: "", ativo: true };

export default function PlanoContas() {
  const [lista, setLista] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(vazio);
  const [editId, setEditId] = useState(null);

  const carregar = () => api.get("/plano-contas").then(r => setLista(r.data));
  useEffect(() => { carregar(); }, []);

  const abrir = (p) => {
    if (p) { setForm(p); setEditId(p.id); } else { setForm(vazio); setEditId(null); }
    setModal(true);
  };

  const salvar = async (e) => {
    e.preventDefault();
    if (editId) await api.put(`/plano-contas/${editId}`, form);
    else await api.post("/plano-contas", form);
    setModal(false); carregar();
  };

  const excluir = async (id) => {
    if (confirm("Excluir este plano?")) { await api.delete(`/plano-contas/${id}`); carregar(); }
  };

  const up = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Plano de Contas</h1>
        <button className="btn" onClick={() => abrir()}><Plus size={16} /> Novo Plano</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Cor</th><th>Nome</th><th>Tipo</th><th>Categoria</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {lista.map(p => (
              <tr key={p.id}>
                <td><span style={{display:"inline-block",width:18,height:18,borderRadius:5,background:p.cor||"#3b82f6"}} /></td>
                <td>{p.nome}</td>
                <td><span className={`badge ${p.tipo === "entrada" ? "pago" : "cancelado"}`}>{p.tipo}</span></td>
                <td>{p.categoria}</td>
                <td><span className={`badge ${p.ativo ? "pago" : "cancelado"}`}>{p.ativo ? "Ativo" : "Inativo"}</span></td>
                <td style={{display:"flex",gap:8}}>
                  <Pencil size={16} style={{cursor:"pointer"}} onClick={() => abrir(p)} />
                  <Trash2 size={16} style={{cursor:"pointer",color:"#ef4444"}} onClick={() => excluir(p.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editId ? "Editar Plano" : "Novo Plano"} onClose={() => setModal(false)}>
          <form onSubmit={salvar}>
            <label>Nome</label>
            <input className="input" value={form.nome} onChange={up("nome")} required />
            <label>Tipo</label>
            <select value={form.tipo} onChange={up("tipo")}>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
            <label>Categoria</label>
            <input className="input" value={form.categoria} onChange={up("categoria")} />
            <label>Cor</label>
            <input className="input" type="color" value={form.cor} onChange={up("cor")} style={{height:48}} />
            <label>Ícone (opcional)</label>
            <input className="input" value={form.icone} onChange={up("icone")} placeholder="ex: shopping-cart" />
            <label>Situação</label>
            <select value={form.ativo} onChange={(e) => setForm({...form, ativo: e.target.value === "true"})}>
              <option value="true">Ativo</option><option value="false">Inativo</option>
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
