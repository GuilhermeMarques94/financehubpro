import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let w, h, raf;
    const particles = [];
    const mouse = { x: 0, y: 0, px: 0, py: 0 };

    // pega cor do tema (fallback azul)
    const css = getComputedStyle(document.documentElement);
    const themeColor = (css.getPropertyValue("--primary").trim() || "#6366f1");

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // gera partículas a partir de uma posição (mouse OU toque)
    const emit = (clientX, clientY) => {
      mouse.px = mouse.x; mouse.py = mouse.y;
      mouse.x = clientX; mouse.y = clientY;
      const vx = mouse.x - mouse.px;
      const vy = mouse.y - mouse.py;
      const speed = Math.min(Math.hypot(vx, vy), 40);
      const count = 2 + Math.floor(speed / 4); // mais rápido = mais poeira
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spread = Math.random() * 12;            // dispersão lateral
        particles.push({
          x: mouse.x + Math.cos(ang) * spread,
          y: mouse.y + Math.sin(ang) * spread,
          vx: Math.cos(ang) * (Math.random() * 0.4) - vx * 0.02,
          vy: Math.sin(ang) * (Math.random() * 0.4) - vy * 0.02,
          size: Math.random() < 0.15 ? 2.2 : 1,        // alguns pontos maiores
          life: 1,
          decay: 0.006 + Math.random() * 0.012,        // rastro mais longo
        });
      }
    };

    // mouse (desktop)
    const onMove = (e) => emit(e.clientX, e.clientY);

    // touch (mobile)
    const onTouchStart = (e) => {
      const t = e.touches[0];
      // reseta posição p/ não gerar "salto" de velocidade no 1º toque
      mouse.x = mouse.px = t.clientX;
      mouse.y = mouse.py = t.clientY;
    };
    const onTouchMove = (e) => {
      const t = e.touches[0];
      emit(t.clientX, t.clientY);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    const loop = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.97; p.vy *= 0.97;
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.6 + p.life * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = themeColor;
        ctx.shadowBlur = 6;
        ctx.shadowColor = themeColor;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

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
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
      />
      <form className="auth-card" onSubmit={submit} style={{ position: "relative", zIndex: 1 }}>
        <h1>FinanceHub</h1>
        <p className="sub">Acesse sua conta</p>
        {erro && <div className="error-msg">{erro}</div>}
        <label>E-mail</label>
        <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <label>Senha</label>
        <input className="input" type="password" value={senha} onChange={e => setSenha(e.target.value)} required />
        <button className="btn" style={{ width: "100%", justifyContent: "center" }}>Entrar</button>
        <p className="auth-link">Não tem conta? <Link to="/registro">Criar conta</Link></p>
      </form>
    </div>
  );
}
