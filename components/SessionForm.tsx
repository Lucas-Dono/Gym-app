"use client";

import { useState } from "react";
import type { Energia, Lugar, Perfil, Rutina, SesionGuardada, SesionInput } from "../lib/types";
import { pedirRutina } from "./api";

const ENFOQUES = [
  ["auto", "Que decida Claude"],
  ["pecho y tríceps", "Pecho y tríceps"],
  ["espalda y bíceps", "Espalda y bíceps"],
  ["piernas y glúteos", "Piernas"],
  ["hombros y brazos", "Hombros y brazos"],
  ["torso completo", "Torso"],
  ["cuerpo completo", "Cuerpo completo"],
] as const;

export default function SessionForm({
  perfil,
  historial,
  onRutina,
}: {
  perfil: Perfil;
  historial: SesionGuardada[];
  onRutina: (input: SesionInput, rutina: Rutina) => void;
}) {
  const [input, setInput] = useState<SesionInput>({
    minutos: 60,
    energia: "normal",
    lugar: "gimnasio",
    enfoque: "auto",
    molestias: "",
    notas: "",
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof SesionInput>(k: K, v: SesionInput[K]) => setInput((s) => ({ ...s, [k]: v }));
  const ultima = historial[0];

  async function generar() {
    setCargando(true);
    setError("");
    try {
      onRutina(input, await pedirRutina({ perfil, sesion: input, historial }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="card form">
      <h2>¿Cómo viene el día?</h2>
      {ultima && (
        <p className="muted small">
          Última sesión: {ultima.enfoque} ({new Date(ultima.fecha).toLocaleDateString("es")}). Claude la tiene en cuenta para no repetir músculos.
        </p>
      )}

      <label className="field">
        <span>
          Tiempo disponible: <strong>{input.minutos} min</strong>
        </span>
        <input type="range" min={15} max={120} step={5} value={input.minutos} onChange={(e) => set("minutos", Number(e.target.value))} />
        <div className="chips">
          {[30, 45, 60, 90].map((m) => (
            <button key={m} className={input.minutos === m ? "chip on" : "chip"} onClick={() => set("minutos", m)}>
              {m} min
            </button>
          ))}
        </div>
      </label>

      <div className="field">
        <span>Energía</span>
        <div className="chips">
          {(
            [
              ["baja", "Baja 😴"],
              ["normal", "Normal 🙂"],
              ["alta", "Alta 🔥"],
            ] as [Energia, string][]
          ).map(([v, l]) => (
            <button key={v} className={input.energia === v ? "chip on" : "chip"} onClick={() => set("energia", v)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>¿Dónde entrenas?</span>
        <div className="chips">
          {(
            [
              ["gimnasio", "Gimnasio"],
              ["casa", "Casa con mancuernas"],
              ["peso-corporal", "Sin equipo"],
            ] as [Lugar, string][]
          ).map(([v, l]) => (
            <button key={v} className={input.lugar === v ? "chip on" : "chip"} onClick={() => set("lugar", v)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Enfoque</span>
        <select value={input.enfoque} onChange={(e) => set("enfoque", e.target.value)}>
          {ENFOQUES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Molestias o dolor (opcional)</span>
        <input placeholder="Ej.: me molesta el hombro derecho" value={input.molestias} onChange={(e) => set("molestias", e.target.value)} />
      </label>

      <label className="field">
        <span>Algo más (opcional)</span>
        <input placeholder="Ej.: el gimnasio está lleno, quiero sumar abdominales" value={input.notas} onChange={(e) => set("notas", e.target.value)} />
      </label>

      {error && <p className="error">{error}</p>}
      <button className="primary big" onClick={generar} disabled={cargando}>
        {cargando ? "Claude está armando tu rutina…" : "Generar rutina"}
      </button>
    </section>
  );
}
