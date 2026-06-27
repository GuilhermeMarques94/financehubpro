import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.get("/auth/me").then(r => setUser(r.data)).catch(() => {}).finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const login = async (email, senha) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", senha);
    const { data } = await api.post("/auth/login", form);
    localStorage.setItem("token", data.access_token);
    const me = await api.get("/auth/me");
    setUser(me.data);
  };

  const registrar = async (dados) => {
    await api.post("/auth/registrar", dados);
    await login(dados.email, dados.senha);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
