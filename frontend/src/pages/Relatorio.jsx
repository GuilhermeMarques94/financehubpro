import { useEffect, useState } from "react";
import api from "../api/axios";

const MESES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const brl = (v) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Relatorio() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [qtdMeses, setQtdMeses] = useState(12);
  const [d, setD] = useState(null);

  const carregar = () => {
    api.get("/fluxo/relatorio", { params: { ano, meses: qtdMeses } })
      .then(r => setD(r.data));
  };

  useEffect(() => { carregar(); }, [ano, qtdMeses]);

  if (!d) return <div>Carregando...</div>;

  const cols = d.meses;
  const anos = Array.from({ length: 6 }, (_, i) => anoAtual - i);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Relatório de Fluxo de Caixa</h1>
        <div className="filters" style={{ margin: 0 }}>
          <select value={ano} onChange={e => setAno(+e.target.value)}>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {[3, 6, 12].map(n => (
            <button key={n}
              className={`btn ${qtdMeses === n ? "" : "btn-outline"}`}
              onClick={() => setQtdMeses(n)}>
              {n} meses
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="rel-table">
          <thead>
            <tr>
              <th></th>
              {cols.map(m => <th key={m}>{MESES[m]} {ano}</th>)}
            </tr>
          </thead>
          <tbody>
            {/* RECEITAS */}
            <tr className="rel-header"><td>Receitas</td>
              {cols.map(m => <td key={m}>{brl(d.total_receitas[m])}</td>)}</tr>
            {d.receitas.map((r, i) => (
              <tr key={i} className="rel-sub"><td>{r.nome}</td>
                {cols.map(m => <td key={m}>{brl(r.valores[m])}</td>)}</tr>
            ))}

            {/* DESPESAS */}
            <tr className="rel-header rel-despesa"><td>Despesas</td>
              {cols.map(m => <td key={m}>{brl(d.total_despesas[m])}</td>)}</tr>
            {d.despesas.map((c, i) => (
              <>
                <tr key={`c${i}`} className="rel-cat"><td>{c.categoria}</td>
                  {cols.map(m => <td key={m}>{brl(c.total[m])}</td>)}</tr>
                {c.planos.map((p, j) => (
                  <tr key={`c${i}p${j}`} className="rel-sub"><td>{p.nome}</td>
                    {cols.map(m => <td key={m}>{brl(p.valores[m])}</td>)}</tr>
                ))}
              </>
            ))}

            {/* RESULTADO */}
            <tr className="rel-total"><td>Resultado</td>
              {cols.map(m => <td key={m}>{brl(d.resultado[m])}</td>)}</tr>

            {/* SALDO INICIAL */}
            <tr className="rel-header"><td>Saldo Inicial</td>
              {cols.map(m => <td key={m}>{brl(d.saldo_inicial_total[m])}</td>)}</tr>
            {d.bancos.map((b, i) => (
              <tr key={`si${i}`} className="rel-sub"><td>{b.nome}</td>
                {cols.map(m => <td key={m}>{brl(b.saldo_inicial[m])}</td>)}</tr>
            ))}

            {/* SALDO FINAL */}
            <tr className="rel-header"><td>Saldo Final</td>
              {cols.map(m => <td key={m}>{brl(d.saldo_final_total[m])}</td>)}</tr>
            {d.bancos.map((b, i) => (
              <tr key={`sf${i}`} className="rel-sub"><td>{b.nome}</td>
                {cols.map(m => <td key={m}>{brl(b.saldo_final[m])}</td>)}</tr>
            ))}

            {/* DIFERENÇAS */}
            <tr className="rel-total"><td>Diferença de Saldo</td>
              {cols.map(m => <td key={m}>{brl(d.diferenca_saldo[m])}</td>)}</tr>
            <tr className="rel-total"><td>Diferença de Conciliação</td>
              {cols.map(m => (
                <td key={m} style={{
                  color: Math.abs(d.diferenca_conciliacao[m]) < 0.01 ? "#22c55e" : "#ef4444"
                }}>{brl(d.diferenca_conciliacao[m])}</td>
              ))}</tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
