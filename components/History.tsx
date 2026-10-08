"use client";

import type { SesionGuardada } from "../lib/types";

const SENSACION: Record<string, string> = { facil: "Fácil", bien: "Bien", dura: "Muy dura" };

export default function History({ historial, onBorrar }: { historial: SesionGuardada[]; onBorrar: (i: number) => void }) {
  if (!historial.length) {
    return (
      <section className="card">
        <h2>Historial</h2>
        <p className="muted">Todavía no guardaste sesiones. Al terminar una rutina, guárdala y la IA la usará para planificar la siguiente.</p>
      </section>
    );
  }

  const semana = historial.filter((s) => Date.now() - new Date(s.fecha).getTime() < 7 * 86_400_000).length;

  return (
    <>
      <section className="card">
        <h2>Historial</h2>
        <p className="muted">
          {semana} {semana === 1 ? "sesión" : "sesiones"} en los últimos 7 días · {historial.length} en total
        </p>
      </section>
      {historial.map((s, i) => (
        <section key={s.fecha} className="card">
          <div className="ex-head">
            <div>
              <h3>{s.titulo}</h3>
              <p className="muted small">
                {new Date(s.fecha).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })} · {s.minutos} min ·{" "}
                {s.enfoque}
                {s.sensacion && ` · ${SENSACION[s.sensacion]}`}
              </p>
            </div>
            <button className="ghost small" onClick={() => confirm("¿Borrar esta sesión?") && onBorrar(i)}>
              Borrar
            </button>
          </div>
          <ul className="list">
            {s.ejercicios.map((e) => (
              <li key={e.id} className={e.completado ? "" : "muted"}>
                {e.completado ? "✓" : "–"} {e.nombre}
                {(e.peso || e.reps) && (
                  <span className="muted">
                    {" "}
                    · {e.peso}
                    {e.peso && e.reps && " × "}
                    {e.reps}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {s.comentario && <p className="note">{s.comentario}</p>}
        </section>
      ))}
    </>
  );
}
