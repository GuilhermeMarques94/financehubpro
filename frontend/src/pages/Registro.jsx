import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Registro() {
  const { registrar } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ nome: "", telefone: "", email: "", senha: "" });
  const [erro, setErro] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErro("");
    try {
      await registrar(f);
      navigate("/");
    } catch (err) {
      setErro(err.response?.data?.detail || "Erro ao criar conta.");
    }
  };

  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>FinanceHub</h1>
        <p className="sub">Crie sua conta</p>
        {erro && <div className="error-msg">{erro}</div>}
        <label>Nome Completo</label>
        <input className="input" value={f.nome} onChange={up("nome")} required />
        <label>Telefone</label>
        <input className="input" value={f.telefone} onChange={up("telefone")} />
        <label>E-mail</label>
        <input className="input" type="email" value={f.email} onChange={up("email")} required />
        <label>Senha</label>
        <input className="input" type="password" value={f.senha} onChange={up("senha")} required minLength={6} />
        <button className="btn" style={{ width: "100%" }}>Criar Conta</button>
        <p className="auth-link">Já tem conta? <Link to="/login">Entrar</Link></p>
      </form>
    </div>
  );
}
