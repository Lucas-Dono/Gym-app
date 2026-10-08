"use client";

import { useEffect, useState } from "react";
import type { SesionEnCurso } from "../lib/storage";
import type { EjercicioRutina, RegistroEjercicio, SesionGuardada } from "../lib/types";
import ExerciseModal from "./ExerciseModal";
import ExerciseImages from "./ExerciseImages";

const AJUSTES_RAPIDOS = [
  "Me quedan solo 20 minutos",
  "Estoy más cansado de lo que pensaba",
  "Tengo 20 minutos más",
  "El gimnasio está lleno, quiero ejercicios con mancuernas",
];

const MOTIVOS_CAMBIO = ["La máquina está ocupada", "Me molesta al hacerlo", "No tengo ese equipo", "Prefiero otro"];

export default function RoutineView({
  sesion,
  ajustando,
  error,
  onAjustar,
  onChange,
  onGuardar,
  onDescartar,
}: {
  sesion: SesionEnCurso;
  /** Texto del ajuste que la IA está procesando ("" si ninguno). */
  ajustando: string;
  error: string;
  onAjustar: (texto: string) => void;
  /** Recibe una función sobre el estado más reciente, para no pisar cambios concurrentes. */
  onChange: (cambio: (s: SesionEnCurso) => SesionEnCurso) => void;
  onGuardar: (s: SesionGuardada) => void;
  onDescartar: () => void;
}) {
  const { rutina, registro, timer } = sesion;
  const cierre = sesion.cierre ?? { abierto: false, sensacion: "" as SesionGuardada["sensacion"], comentario: "" };
  const [ficha, setFicha] = useState<EjercicioRutina | null>(null);
  const [ajusteLibre, setAjusteLibre] = useState("");
  const [cambiando, setCambiando] = useState<string | null>(null);

  const regDe = (r: SesionEnCurso["registro"], e: EjercicioRutina): RegistroEjercicio =>
    r[e.id] ?? { id: e.id, nombre: e.nombre, completado: false, peso: "", reps: "" };
  const reg = (e: EjercicioRutina) => regDe(registro, e);

  function setReg(e: EjercicioRutina, cambios: Partial<RegistroEjercicio>) {
    onChange((s) => ({ ...s, registro: { ...s.registro, [e.id]: { ...regDe(s.registro, e), ...cambios } } }));
  }

  const setTimer = (t: SesionEnCurso["timer"]) => onChange((s) => ({ ...s, timer: t }));
  const setCierre = (c: Partial<typeof cierre>) => onChange((s) => ({ ...s, cierre: { ...cierre, ...s.cierre, ...c } }));

  const hechos = rutina.ejercicios.filter((e) => reg(e).completado);

  function ajustar(texto: string) {
    if (!texto.trim()) return;
    onAjustar(texto);
    setAjusteLibre("");
    setCambiando(null);
  }

  function guardar() {
    onGuardar({
      fecha: new Date().toISOString(),
      titulo: rutina.titulo,
      enfoque: rutina.enfoque,
      minutos: Math.max(1, Math.round((Date.now() - new Date(sesion.inicio).getTime()) / 60000)),
      energia: sesion.input.energia,
      ejercicios: rutina.ejercicios.map(reg),
      sensacion: cierre.sensacion,
      comentario: cierre.comentario,
    });
  }

  return (
    <>
      <section className="card hero">
        <div className="hero-top">
          <div>
            <h2>{rutina.titulo}</h2>
            <p className="muted">
              {rutina.enfoque} · ~{rutina.duracionEstimadaMin} min · {rutina.ejercicios.length} ejercicios
            </p>
          </div>
          <span className="progress">
            {hechos.length}/{rutina.ejercicios.length}
          </span>
        </div>
        <p>{rutina.porQue}</p>
      </section>

      <Bloques titulo="Calentamiento" items={rutina.calentamiento} />

      <ol className="exercises">
        {rutina.ejercicios.map((e, i) => {
          const r = reg(e);
          return (
            <li key={e.id + i} className={r.completado ? "card ex done" : "card ex"}>
              <ExerciseImages imagenes={e.imagenes ?? []} alt={e.nombre} onClick={() => setFicha(e)} />
              <div className="ex-body">
                <div className="ex-head">
                  <h3>
                    <span className="num">{i + 1}</span> {e.nombre}
                  </h3>
                  <label className="check">
                    <input type="checkbox" checked={r.completado} onChange={(ev) => setReg(e, { completado: ev.target.checked })} />
                    Hecho
                  </label>
                </div>
                <p className="muted small">{e.musculos.join(" · ")}</p>
                <div className="stats">
                  <span>
                    <strong>{e.series}</strong> series
                  </span>
                  <span>
                    <strong>{e.repeticiones}</strong> reps
                  </span>
                  <span>
                    RIR <strong>{e.rir}</strong>
                  </span>
                  <button className="link" onClick={() => setTimer({ fin: Date.now() + e.descansoSeg * 1000, total: e.descansoSeg })}>
                    ⏱ {e.descansoSeg}s descanso
                  </button>
                </div>
                {e.notas && <p className="note">{e.notas}</p>}
                <div className="log">
                  <input placeholder="Peso (ej. 20 kg)" value={r.peso} onChange={(ev) => setReg(e, { peso: ev.target.value })} />
                  <input placeholder="Reps hechas (ej. 10,9,8)" value={r.reps} onChange={(ev) => setReg(e, { reps: ev.target.value })} />
                </div>
                <div className="actions">
                  <button className="secondary" onClick={() => setFicha(e)}>
                    ▶ Técnica y video
                  </button>
                  <button className="ghost" onClick={() => setCambiando(cambiando === e.id ? null : e.id)} disabled={!!ajustando}>
                    ⇄ Cambiar
                  </button>
                </div>
                {cambiando === e.id && (
                  <div className="chips">
                    {MOTIVOS_CAMBIO.map((m) => (
                      <button key={m} className="chip" disabled={!!ajustando} onClick={() => ajustar(`Reemplaza solo "${e.nombre}" por otro ejercicio equivalente. Motivo: ${m}.`)}>
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <Bloques titulo="Vuelta a la calma" items={rutina.vueltaALaCalma} />

      {rutina.consejos.length > 0 && (
        <section className="card">
          <h3>Consejos</h3>
          <ul className="list">
            {rutina.consejos.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3>¿Cambió algo sobre la marcha?</h3>
        <p className="muted small">La IA reajusta lo que falta y mantiene lo que ya hiciste.</p>
        <div className="chips">
          {AJUSTES_RAPIDOS.map((a) => (
            <button key={a} className="chip" disabled={!!ajustando} onClick={() => ajustar(a)}>
              {a}
            </button>
          ))}
        </div>
        <div className="row">
          <input
            placeholder="Cuéntale qué pasó…"
            value={ajusteLibre}
            onChange={(e) => setAjusteLibre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ajustar(ajusteLibre)}
          />
          <button className="secondary" disabled={!!ajustando || !ajusteLibre.trim()} onClick={() => ajustar(ajusteLibre)}>
            Ajustar
          </button>
        </div>
        {ajustando && <p className="muted small">Reajustando: “{ajustando}”…</p>}
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        {!cierre.abierto ? (
          <div className="row">
            <button className="primary big" onClick={() => setCierre({ abierto: true })}>
              Terminar sesión
            </button>
            <button className="ghost" onClick={() => confirm("¿Descartar esta rutina?") && onDescartar()}>
              Descartar
            </button>
          </div>
        ) : (
          <>
            <h3>¿Cómo te fue?</h3>
            <div className="chips">
              {(
                [
                  ["facil", "Fácil"],
                  ["bien", "Bien"],
                  ["dura", "Muy dura"],
                ] as const
              ).map(([v, l]) => (
                <button key={v} className={cierre.sensacion === v ? "chip on" : "chip"} onClick={() => setCierre({ sensacion: v })}>
                  {l}
                </button>
              ))}
            </div>
            <input placeholder="Comentario (opcional): dormí poco, subí peso en press…" value={cierre.comentario} onChange={(e) => setCierre({ comentario: e.target.value })} />
            <div className="row">
              <button className="primary big" onClick={guardar}>
                Guardar en el historial
              </button>
              <button className="ghost" onClick={() => setCierre({ abierto: false })}>
                Seguir entrenando
              </button>
            </div>
          </>
        )}
      </section>

      {timer && <RestTimer {...timer} onDone={() => setTimer(null)} />}
      {ficha && <ExerciseModal ejercicio={ficha} onClose={() => setFicha(null)} />}
    </>
  );
}

function Bloques({ titulo, items }: { titulo: string; items: { actividad: string; duracion: string }[] }) {
  if (!items.length) return null;
  return (
    <section className="card">
      <h3>{titulo}</h3>
      <ul className="list">
        {items.map((b) => (
          <li key={b.actividad}>
            {b.actividad} <span className="muted">· {b.duracion}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RestTimer({ fin, total, onDone }: { fin: number; total: number; onDone: () => void }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const quedan = Math.max(0, Math.ceil((fin - ahora) / 1000));
  useEffect(() => {
    if (quedan === 0) {
      try {
        navigator.vibrate?.(300);
      } catch {}
    }
  }, [quedan]);
  return (
    <div className="timer" role="status">
      <div className="bar" style={{ width: `${(quedan / total) * 100}%` }} />
      <span>{quedan > 0 ? `Descanso: ${quedan}s` : "¡A la siguiente serie!"}</span>
      <button className="link" onClick={onDone}>
        Cerrar
      </button>
    </div>
  );
}
