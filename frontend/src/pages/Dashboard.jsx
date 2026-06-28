import { useEffect, useState } from "react";
import api from "../api/axios";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from "recharts";

const brl = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const CORES = ["#ff2d3d", "#ff7a45", "#ffb020", "#2ee6a0", "#37a3ff", "#a06bff"];

const tooltipStyle = {
  background: "#14141f",
  border: "1px solid #ff2d3d",
  borderRadius: 10,
  boxShadow: "0 8px 24px rgba(255,45,61,.25)",
};

export default function Dashboard() {
  const [d, setD] = useState(null);

  useEffect(() => { api.get("/dashboard").then(r => setD(r.data)); }, []);
  if (!d) return <p style={{ padding: 32 }}>Carregando...</p>;

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
            <BarChart data={[{ nome: "Mês", Entradas: d.entradas_mes, "Saídas": d.saidas_mes }]}>
              <defs>
                <linearGradient id="gEnt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ee6a0" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#2ee6a0" stopOpacity={0.35} />
                </linearGradient>
                <linearGradient id="gSai" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff2d3d" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#ff2d3d" stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262636" vertical={false} />
              <XAxis dataKey="nome" stroke="#8a8a9a" tickLine={false} axisLine={false} />
              <YAxis stroke="#8a8a9a" tickLine={false} axisLine={false} width={70}
                     tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={brl} contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,.04)" }} />
              <Legend />
              <Bar dataKey="Entradas" fill="url(#gEnt)" radius={[6,6,0,0]} maxBarSize={70} />
              <Bar dataKey="Saídas" fill="url(#gSai)" radius={[6,6,0,0]} maxBarSize={70} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h3>Gastos por Categoria</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={d.gastos_por_categoria} dataKey="total" nameKey="categoria"
                   cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}
                   stroke="#14141f" strokeWidth={2}>
                {d.gastos_por_categoria.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
              </Pie>
              <Tooltip formatter={brl} contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-grid" style={{ marginTop: 16 }}>
        <div className="chart-box">
          <h3>Próximas Contas a Vencer</h3>
          {d.proximas_contas.length === 0 ? <p style={{ color: "var(--text-muted)" }}>Nenhuma conta pendente.</p> :
            d.proximas_contas.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span>{p.descricao}</span>
                <span style={{ color: "var(--text-muted)" }}>{brl(p.valor)} • {p.vencimento}</span>
              </div>
            ))}
        </div>
        <div className="chart-box">
          <h3>Últimos Lançamentos</h3>
          {d.ultimos_lancamentos.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span>{m.descricao}</span>
              <span className={m.tipo === "entrada" ? "value green" : "value red"} style={{ fontSize: 14 }}>
                {m.tipo === "entrada" ? "+" : "-"}{brl(m.valor)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
