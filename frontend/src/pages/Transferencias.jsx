import { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import { Plus, Trash2, ArrowRight } from "lucide-react";

const brl = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const vazio = { banco_origem_id: "", banco_destino_id: "", valor: 0, descricao: "", data: "" };

export default function Transferencias() {
  const [lista, setLista] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState("");

  const carregar = () => api.get("/transferencias").then(r => setLista(r.data));

  useEffect(() => {
    api.get("/bancos").then(r => setBancos(r.data));
    carregar();
  }, []);

  const salvar = async (e) => {
    e.preventDefault();
    setErro("");
    if (form.banco_origem_id === form.banco_destino_id) {
      setErro("Origem e destino devem ser diferentes."); return;
    }
    const p = { ...form, valor: parseFloat(form.valor) };
    Object.keys(p).forEach(k => p[k] === "" && (p[k] = null));
    try {
      await api.post("/transferencias", p);
      setModal(false); setForm(vazio); carregar();
    } catch (err) {
      setErro(err.response?.data?.detail || "Erro ao salvar.");
    }
  };

  const excluir = async (parId) => {
    if (confirm("Excluir esta transferência? O dinheiro volta às contas.")) {
      await api.delete(`/transferencias/${parId}`);
      carregar();
    }
  };

  const up = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const nomeBanco = (id) => bancos.find(b => b.id === id)?.nome || "-";

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Transferências</h1>
        <button className="btn" onClick={() => { setForm(vazio); setErro(""); setModal(true); }}>
          <Plus size={16} /> Nova Transferência
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Data</th><th>Descrição</th><th>Origem</th><th></th><th>Destino</th><th>Valor</th><th></th></tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "#888" }}>Nenhuma transferência registrada.</td></tr>
            )}
            {lista.map(t => (
              <tr key={t.id}>
                <td>{t.data_lancamento}</td>
                <td>{t.descricao}</td>
                <td>{nomeBanco(t.banco_id)}</td>
                <td style={{ color: "#6366f1" }}><ArrowRight size={16} /></td>
                <td>{t.banco_destino_nome || "-"}</td>
                <td className="value">{brl(t.valor)}</td>
                <td>
                  <Trash2 size={16} style={{ cursor: "pointer", color: "#ef4444" }}
                    onClick={() => excluir(t.transferencia_par_id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Nova Transferência" onClose={() => setModal(false)}>
          <form onSubmit={salvar}>
            {erro && <div style={{ color: "#ef4444", marginBottom: 8 }}>{erro}</div>}

            <label>Conta de Origem</label>
            <select value={form.banco_origem_id} onChange={up("banco_origem_id")} required>
              <option value="">Selecione</option>
              {bancos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>

            <label>Conta de Destino</label>
            <select value={form.banco_destino_id} onChange={up("banco_destino_id")} required>
              <option value="">Selecione</option>
              {bancos.filter(b => b.id !== form.banco_origem_id)
                .map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>

            <label>Valor</label>
            <input className="input" type="number" step="0.01" min="0.01"
              value={form.valor} onChange={up("valor")} required />

            <label>Descrição (opcional)</label>
            <input className="input" value={form.descricao} onChange={up("descricao")}
              placeholder="Ex: reserva de emergência" />

            <label>Data</label>
            <input className="input" type="date" value={form.data} onChange={up("data")} />

            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn">Transferir</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
