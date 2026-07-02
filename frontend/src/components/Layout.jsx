import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Landmark, ListTree, ArrowLeftRight,
  CreditCard, TrendingUp, LogOut, Menu, Repeat, BarChart3
} from "lucide-react";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/bancos", icon: Landmark, label: "Bancos" },
  { to: "/plano-contas", icon: ListTree, label: "Plano de Contas" },
  { to: "/movimentacoes", icon: ArrowLeftRight, label: "Movimentações" },
  { to: "/transferencias", icon: Repeat, label: "Transferências" },
  { to: "/cartoes", icon: CreditCard, label: "Cartões" },
  { to: "/fluxo", icon: TrendingUp, label: "Fluxo de Caixa" },
  { to: "/relatorio", icon: BarChart3, label: "Relatório" },
];

export default function Layout({ children }) {
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-layout">
      <button className="menu-toggle" onClick={() => setOpen(!open)}><Menu size={20} /></button>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="logo">💰 FinanceHub</div>
        {nav.map(n => (
          <NavLink key={n.to} to={n.to} end className="nav-item" onClick={() => setOpen(false)}>
            <n.icon size={18} /> {n.label}
          </NavLink>
        ))}
        <button className="logout-btn" onClick={logout}>
          <LogOut size={18} /> Sair ({user?.nome})
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
