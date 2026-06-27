import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErro("");
    try {
      await login(email, senha);
      navigate("/");
    } catch {
      setErro("E-mail ou senha inválidos.");
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>FinanceHub</h1>
        <p className="sub">Acesse sua conta</p>
        {erro && <div className="error-msg">{erro}</div>}
        <label>E-mail</label>
        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <label>Senha</label>
        <input className="input" type="password" value={senha} onChange={e => setSenha(e.target.value)} required />
        <button className="btn" style={{ width: "100%" }}>Entrar</button>
        <p className="auth-link">Não tem conta? <Link to="/registro">Criar conta</Link></p>
      </form>
    </div>
  );
}
