import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../api/axios";

const MESES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const brl = (v) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Relatorio() {
  const [qtdMeses, setQtdMeses] = useState(6);
  const [d, setD] = useState(null);
  const [aberto, setAberto] = useState({});   // setores: receitas, despesas, si, sf
  const [catAberta, setCatAberta] = useState({}); // categorias individuais
  const navigate = useNavigate();

  const carregar = () => {
    const hoje = new Date();
    api.get("/fluxo/relatorio", {
      params: {
        ref_ano: hoje.getFullYear(),
        ref_mes: hoje.getMonth() + 1,
        meses: qtdMeses,
      },
    }).then(r => {
      setD(r.data);
      setAberto({ receitas: true, despesas: true, si: true, sf: true });
      const cats = {};
      r.data.despesas.forEach((_, i) => (cats[i] = true));
      setCatAberta(cats);
    });
  };

  useEffect(() => { carregar(); }, [qtdMeses]);

  if (!d) return <div className="rel-loading">Carregando...</div>;

  const cols = d.colunas;
  const toggle = (k) => setAberto(s => ({ ...s, [k]: !s[k] }));
  const toggleCat = (i) => setCatAberta(s => ({ ...s, [i]: !s[i] }));

  const todosAbertos = Object.values(aberto).every(Boolean);
  const alternarTudo = () => {
    const novo = !todosAbertos;
    setAberto({ receitas: novo, despesas: novo, si: novo, sf: novo });
    const cats = {};
    d.despesas.forEach((_, i) => (cats[i] = novo));
    setCatAberta(cats);
  };

  const cell = (obj, k) => brl(obj[k]);
  const Chevron = ({ open }) => (
    <span className={`rel-chev ${open ? "open" : ""}`}>▸</span>
  );

  return (
    <div className="rel-page">
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <h1 className="page-title" style={{ margin: 0 }}>Relatório de Fluxo de Caixa</h1>
        </div>
        <div className="filters" style={{ margin: 0 }}>
          <button className="btn btn-outline rel-toggle-all" onClick={alternarTudo}>
            {todosAbertos ? "Recolher tudo" : "Expandir tudo"}
          </button>
          {[3, 6, 12].map(n => (
            <button key={n}
              className={`btn ${qtdMeses === n ? "" : "btn-outline"}`}
              onClick={() => setQtdMeses(n)}>
              {n} meses
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap rel-wrap">
        <table className="rel-table">
          <thead>
            <tr>
              <th className="rel-first"></th>
              {cols.map(c => (
                <th key={c.chave}>{MESES[c.mes]}<span className="rel-ano">{c.ano}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* RECEITAS */}
            <tr className="rel-header rel-receita rel-clic" onClick={() => toggle("receitas")}>
              <td><Chevron open={aberto.receitas} /> Receitas</td>
              {cols.map(c => <td key={c.chave}>{cell(d.total_receitas, c.chave)}</td>)}
            </tr>
            {aberto.receitas && d.receitas.map((r, i) => (
              <tr key={`r${i}`} className="rel-sub">
                <td>{r.nome}</td>
                {cols.map(c => <td key={c.chave}>{cell(r.valores, c.chave)}</td>)}
              </tr>
            ))}

            <tr className="rel-gap"><td colSpan={cols.length + 1}></td></tr>

            {/* DESPESAS */}
            <tr className="rel-header rel-despesa rel-clic" onClick={() => toggle("despesas")}>
              <td><Chevron open={aberto.despesas} /> Despesas</td>
              {cols.map(c => <td key={c.chave}>{cell(d.total_despesas, c.chave)}</td>)}
            </tr>
            {aberto.despesas && d.despesas.map((c, i) => (
              <FragmentCat key={`cat${i}`}>
                <tr className="rel-cat rel-clic" onClick={() => toggleCat(i)}>
                  <td><Chevron open={catAberta[i]} /> {c.categoria}</td>
                  {cols.map(col => <td key={col.chave}>{cell(c.total, col.chave)}</td>)}
                </tr>
                {catAberta[i] && c.planos.map((p, j) => (
                  <tr key={`c${i}p${j}`} className="rel-sub rel-sub-deep">
                    <td>{p.nome}</td>
                    {cols.map(col => <td key={col.chave}>{cell(p.valores, col.chave)}</td>)}
                  </tr>
                ))}
              </FragmentCat>
            ))}

            <tr className="rel-gap"><td colSpan={cols.length + 1}></td></tr>

            {/* RESULTADO */}
            <tr className="rel-total rel-resultado">
              <td>Resultado</td>
              {cols.map(c => (
                <td key={c.chave} className={d.resultado[c.chave] >= 0 ? "pos" : "neg"}>
                  {cell(d.resultado, c.chave)}
                </td>
              ))}
            </tr>

            <tr className="rel-gap"><td colSpan={cols.length + 1}></td></tr>

            {/* SALDO INICIAL */}
            <tr className="rel-header rel-clic" onClick={() => toggle("si")}>
              <td><Chevron open={aberto.si} /> Saldo Inicial</td>
              {cols.map(c => <td key={c.chave}>{cell(d.saldo_inicial_total, c.chave)}</td>)}
            </tr>
            {aberto.si && d.bancos.map((b, i) => (
              <tr key={`si${i}`} className="rel-sub">
                <td>{b.nome}</td>
                {cols.map(c => <td key={c.chave}>{cell(b.saldo_inicial, c.chave)}</td>)}
              </tr>
            ))}

            <tr className="rel-gap"><td colSpan={cols.length + 1}></td></tr>

            {/* SALDO FINAL */}
            <tr className="rel-header rel-clic" onClick={() => toggle("sf")}>
              <td><Chevron open={aberto.sf} /> Saldo Final</td>
              {cols.map(c => <td key={c.chave}>{cell(d.saldo_final_total, c.chave)}</td>)}
            </tr>
            {aberto.sf && d.bancos.map((b, i) => (
              <tr key={`sf${i}`} className="rel-sub">
                <td>{b.nome}</td>
                {cols.map(c => <td key={c.chave}>{cell(b.saldo_final, c.chave)}</td>)}
              </tr>
            ))}

            <tr className="rel-gap"><td colSpan={cols.length + 1}></td></tr>

            {/* DIFERENÇAS */}
            <tr className="rel-total">
              <td>Diferença de Saldo</td>
              {cols.map(c => <td key={c.chave}>{cell(d.diferenca_saldo, c.chave)}</td>)}
            </tr>
            <tr className="rel-total">
              <td>Diferença de Conciliação</td>
              {cols.map(c => (
                <td key={c.chave} style={{
                  color: Math.abs(d.diferenca_conciliacao[c.chave]) < 0.01 ? "#2ee6a0" : "#ff4d5a"
                }}>{cell(d.diferenca_conciliacao, c.chave)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// wrapper para agrupar linhas da categoria sem <> com key
function FragmentCat({ children }) {
  return <>{children}</>;
}
