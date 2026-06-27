import { useEffect, useState } from "react";
import api from "../api/axios";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const brl = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const CORES = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function Dashboard() {
  const [d, setD] = useState(null);

  useEffect(() => { api.get("/dashboard").then(r => setD(r.data)); }, []);
  if (!d) return <p>Carregando...</p>;

  const cards = [
    { label: "Saldo Total em Bancos", value: brl(d.saldo_total_bancos) },
    { label: "Entradas do Mês", value: brl(d.entradas_mes), cls: "green" },
    { label: "Saídas do Mês", value: brl(d.saidas_mes), cls: "red" },
    { label: "Saldo do Mês", value: brl(d.saldo_mes), cls: d.saldo_mes >= 0 ? "green" : "red" },
    { label: "Gasto em Cartões", value: brl(d.total_gasto_cartoes) },
    { label: "Limite Disponível", value: brl(d.limite_disponivel_cartoes), cls: "green" },
  ];

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <div className="cards-grid">
        {cards.map((c, i) => (
          <div className="stat-card" key={i}>
            <div className="label">{c.label}</div>
            <div className={`value ${c.cls || ""}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-box">
          <h3>Entradas x Saídas (mês)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[{ nome: "Mês", Entradas: d.entradas_mes, Saídas: d.saidas_mes }]}>
              <XAxis dataKey="nome" stroke="#8b98a5" />
              <YAxis stroke="#8b98a5" />
              <Tooltip formatter={brl} contentStyle={{ background: "#1a2129", border: "1px solid #2a3441" }} />
              <Legend />
              <Bar dataKey="Entradas" fill="#22c55e" radius={[6,6,0,0]} />
              <Bar dataKey="Saídas" fill="#ef4444" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h3>Gastos por Categoria</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={d.gastos_por_categoria} dataKey="total" nameKey="categoria"
                   cx="50%" cy="50%" outerRadius={90} label>
                {d.gastos_por_categoria.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
              </Pie>
              <Tooltip formatter={brl} contentStyle={{ background: "#1a2129", border: "1px solid #2a3441" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-grid" style={{ marginTop: 16 }}>
        <div className="chart-box">
          <h3>Próximas Contas a Vencer</h3>
          {d.proximas_contas.length === 0 ? <p style={{color:"#8b98a5"}}>Nenhuma conta pendente.</p> :
            d.proximas_contas.map((p, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #2a3441" }}>
                <span>{p.descricao}</span>
                <span>{brl(p.valor)} • {p.vencimento}</span>
              </div>
            ))}
        </div>
        <div className="chart-box">
          <h3>Últimos Lançamentos</h3>
          {d.ultimos_lancamentos.map((m, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #2a3441" }}>
              <span>{m.descricao}</span>
              <span className={m.tipo === "entrada" ? "value green" : "value red"} style={{fontSize:14}}>
                {m.tipo === "entrada" ? "+" : "-"}{brl(m.valor)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
