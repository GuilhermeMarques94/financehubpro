import { useState } from "react";
import api from "../api/axios";

const brl = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hoje = new Date().toISOString().slice(0, 10);
const inicioMes = hoje.slice(0, 8) + "01";

export default function Fluxo() {
  const [periodo, setPeriodo] = useState({ inicio: inicioMes, fim: hoje });
  const [dados, setDados] = useState(null);

  const buscar = (e) => {
    e?.preventDefault();
    api.get("/fluxo", { params: periodo }).then(r => setDados(r.data));
  };

  const up = (k) => (e) => setPeriodo({ ...periodo, [k]: e.target.value });

  return (
    <div>
      <h1 className="page-title">Fluxo de Caixa</h1>
      <form className="filters" onSubmit={buscar}>
        <div><label>Início</label><input className="input" type="date" value={periodo.inicio} onChange={up("inicio")} /></div>
        <div><label>Fim</label><input className="input" type="date" value={periodo.fim} onChange={up("fim")} /></div>
        <button className="btn" style={{alignSelf:"flex-end"}}>Filtrar</button>
      </form>

      {dados && (
        <>
          <div className="cards-grid">
            <div className="stat-card"><div className="label">Total Entradas</div><div className="value green">{brl(dados.total_entradas)}</div></div>
            <div className="stat-card"><div className="label">Total Saídas</div><div className="value red">{brl(dados.total_saidas)}</div></div>
            <div className="stat-card"><div className="label">Saldo do Período</div><div className={`value ${dados.saldo_periodo>=0?"green":"red"}`}>{brl(dados.saldo_periodo)}</div></div>
            <div className="stat-card"><div className="label">Saldo Acumulado</div><div className="value">{brl(dados.saldo_acumulado)}</div></div>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr></thead>
              <tbody>
                {dados.lancamentos.map((l, i) => (
                  <tr key={i}>
                    <td>{l.data}</td><td>{l.descricao}</td>
                    <td className={l.tipo === "entrada" ? "value green" : "value red"} style={{fontSize:14}}>{l.tipo}</td>
                    <td>{brl(l.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
