"use client";

import type { Experiencia, Perfil } from "../lib/types";

export default function ProfileForm({ perfil, onChange }: { perfil: Perfil; onChange: (p: Perfil) => void }) {
  const set = <K extends keyof Perfil>(k: K, v: Perfil[K]) => onChange({ ...perfil, [k]: v });
  const imc = perfil.pesoKg / (perfil.alturaCm / 100) ** 2;
  const prote = [Math.round(perfil.pesoKg * 1.6), Math.round(perfil.pesoKg * 2.2)];

  return (
    <>
      <section className="card form">
        <h2>Tu perfil</h2>
        <p className="muted small">Se guarda solo en este navegador. Claude lo usa para ajustar volumen e intensidad.</p>
        <div className="grid2">
          <label className="field">
            <span>Altura (cm)</span>
            <input type="number" value={perfil.alturaCm} onChange={(e) => set("alturaCm", Number(e.target.value) || 0)} />
          </label>
          <label className="field">
            <span>Peso (kg)</span>
            <input type="number" step="0.5" value={perfil.pesoKg} onChange={(e) => set("pesoKg", Number(e.target.value) || 0)} />
          </label>
          <label className="field">
            <span>Edad (opcional)</span>
            <input type="number" value={perfil.edad ?? ""} onChange={(e) => set("edad", e.target.value ? Number(e.target.value) : null)} />
          </label>
          <label className="field">
            <span>Días por semana</span>
            <input type="number" min={1} max={7} value={perfil.diasPorSemana} onChange={(e) => set("diasPorSemana", Number(e.target.value) || 1)} />
          </label>
        </div>
        <div className="field">
          <span>Experiencia</span>
          <div className="chips">
            {(["principiante", "intermedio", "avanzado"] as Experiencia[]).map((x) => (
              <button key={x} className={perfil.experiencia === x ? "chip on" : "chip"} onClick={() => set("experiencia", x)}>
                {x[0].toUpperCase() + x.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Para ganar músculo</h3>
        <ul className="list">
          <li>
            IMC actual: <strong>{imc.toFixed(1)}</strong>. Tienes margen para subir de peso de forma limpia.
          </li>
          <li>
            Proteína diaria orientativa: <strong>{prote[0]}–{prote[1]} g</strong> (1,6–2,2 g por kg).
          </li>
          <li>Come unas 300–500 kcal por encima de tu mantenimiento y apunta a subir 0,25–0,5 kg por semana.</li>
          <li>Duerme 7–9 horas: es cuando se recupera y crece el músculo.</li>
          <li>Progresa poco a poco: cuando llegues al tope del rango de repeticiones, sube el peso.</li>
        </ul>
        <p className="muted small">Son pautas generales, no un consejo médico.</p>
      </section>
    </>
  );
}
