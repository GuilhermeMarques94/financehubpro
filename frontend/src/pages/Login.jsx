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

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e) => {
      mouse.px = mouse.x; mouse.py = mouse.y;
      mouse.x = e.clientX; mouse.y = e.clientY;
      // velocidade do cursor
      const vx = mouse.x - mouse.px;
      const vy = mouse.y - mouse.py;
      const speed = Math.min(Math.hypot(vx, vy), 40);
      // quanto mais rápido, mais triângulos
      const count = 1 + Math.floor(speed / 6);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: mouse.x, y: mouse.y,
          vx: (Math.random() - 0.5) * 1.5 - vx * 0.05,
          vy: (Math.random() - 0.5) * 1.5 - vy * 0.05,
          size: 4 + speed * 0.4 + Math.random() * 4,
          rot: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.2,
          life: 1,
          decay: 0.012 + Math.random() * 0.02,
          hue: 200 + Math.random() * 80, // azul → roxo
        });
      }
    };
    window.addEventListener("mousemove", onMove);

    const drawTriangle = (p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      const s = p.size * p.life;
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.866, s * 0.5);
      ctx.lineTo(-s * 0.866, s * 0.5);
      ctx.closePath();
      ctx.fillStyle = `hsl(${p.hue}, 90%, 65%)`;
      ctx.shadowBlur = 12;
      ctx.shadowColor = `hsl(${p.hue}, 90%, 65%)`;
      ctx.fill();
      ctx.restore();
    };

    const loop = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.96; p.vy *= 0.96;
        p.rot += p.spin;
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        drawTriangle(p);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
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
