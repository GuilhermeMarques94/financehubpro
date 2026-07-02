import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Dashboard from "./pages/Dashboard";
import Bancos from "./pages/Bancos";
import PlanoContas from "./pages/PlanoContas";
import Movimentacoes from "./pages/Movimentacoes";
import Cartoes from "./pages/Cartoes";
import Fluxo from "./pages/Fluxo";
import Transferencias from "./pages/Transferencias";
import Relatorio from "./pages/Relatorio";

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }}>Carregando...</div>;
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/" element={<Private><Dashboard /></Private>} />
          <Route path="/bancos" element={<Private><Bancos /></Private>} />
          <Route path="/plano-contas" element={<Private><PlanoContas /></Private>} />
          <Route path="/movimentacoes" element={<Private><Movimentacoes /></Private>} />
          <Route path="/cartoes" element={<Private><Cartoes /></Private>} />
          <Route path="/fluxo" element={<Private><Fluxo /></Private>} />
          <Route path="*" element={<Navigate to="/" />} />
          <Route path="/transferencias" element={<Transferencias />} />
          <Route path="/relatorio" element={<Relatorio />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
