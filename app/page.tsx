"use client";

import { useEffect, useRef, useState } from "react";
import { PERFIL_INICIAL, storage, type Pendiente, type SesionEnCurso } from "../lib/storage";
import type { Perfil, SesionGuardada, SesionInput } from "../lib/types";
import { pedirRutina } from "../components/api";
import SessionForm from "../components/SessionForm";
import RoutineView from "../components/RoutineView";
import History from "../components/History";
import ProfileForm from "../components/ProfileForm";

type Tab = "entrenar" | "historial" | "perfil";

export default function Home() {
  const [cargado, setCargado] = useState(false);
  const [tab, setTab] = useState<Tab>("entrenar");
  const [perfil, setPerfil] = useState<Perfil>(PERFIL_INICIAL);
  const [historial, setHistorial] = useState<SesionGuardada[]>([]);
  const [enCurso, setEnCurso] = useState<SesionEnCurso | null>(null);
  const [borrador, setBorrador] = useState<SesionInput | null>(null);
  // El pedido a la IA vive acá (no en cada pestaña) y se guarda, así no se pierde al cambiar de pestaña ni al cerrar.
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [error, setError] = useState("");
  const enVuelo = useRef<string | null>(null);

  // localStorage solo existe en el navegador: cargamos después del primer render.
  useEffect(() => {
    setPerfil(storage.perfil());
    setHistorial(storage.historial());
    setEnCurso(storage.enCurso());
    setBorrador(storage.borrador());
    const p = storage.pendiente();
    // La app se cerró o recargó mientras la IA trabajaba: se vuelve a pedir (si no es de hace más de media hora).
    if (p && Date.now() - new Date(p.desde).getTime() < 30 * 60_000) lanzar(p);
    else storage.guardarPendiente(null);
    setCargado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cada cambio de la sesión en curso se guarda al instante.
  useEffect(() => {
    if (cargado) storage.guardarEnCurso(enCurso);
  }, [enCurso, cargado]);

  useEffect(() => {
    if (cargado && borrador) storage.guardarBorrador(borrador);
  }, [borrador, cargado]);

  function lanzar(p: Pendiente) {
    if (enVuelo.current === p.desde) return;
    enVuelo.current = p.desde;
    setPendiente(p);
    storage.guardarPendiente(p);
    setError("");
    pedirRutina(p.body)
      .then((rutina) => {
        if (enVuelo.current !== p.desde) return; // llegó tarde: ya hay otro pedido más nuevo
        if (p.tipo === "rutina") {
          setEnCurso({ input: p.input, rutina, registro: {}, inicio: new Date().toISOString() });
        } else {
          // Se usa el estado más reciente para no pisar lo que se registró mientras la IA trabajaba.
          setEnCurso((actual) => (actual ? { ...actual, rutina } : actual));
        }
      })
      .catch((e: Error) => enVuelo.current === p.desde && setError(e.message))
      .finally(() => {
        if (enVuelo.current !== p.desde) return;
        enVuelo.current = null;
        setPendiente(null);
        storage.guardarPendiente(null);
      });
  }

  function generar(input: SesionInput) {
    lanzar({ tipo: "rutina", input, body: { perfil, sesion: input, historial }, desde: new Date().toISOString() });
  }

  function ajustar(texto: string) {
    if (!enCurso || !texto.trim()) return;
    const hechos = enCurso.rutina.ejercicios.filter((e) => enCurso.registro[e.id]?.completado).map((e) => e.nombre);
    lanzar({
      tipo: "ajuste",
      texto,
      body: { perfil, sesion: enCurso.input, historial, rutinaActual: enCurso.rutina, hechos, ajuste: texto },
      desde: new Date().toISOString(),
    });
  }

  function guardarSesion(s: SesionGuardada) {
    const h = [s, ...historial].slice(0, 60);
    setHistorial(h);
    storage.guardarHistorial(h);
    setEnCurso(null);
    setTab("historial");
  }

  if (!cargado || !borrador) return null;

  const generando = pendiente?.tipo === "rutina";
  const ajustando = pendiente?.tipo === "ajuste" ? pendiente.texto : "";

  return (
    <main className="app">
      <header className="top">
        <h1>
          Rutina <span>del día</span>
        </h1>
        <nav className="tabs" role="tablist">
          {(
            [
              ["entrenar", generando ? "Entrenar ⏳" : "Entrenar"],
              ["historial", "Historial"],
              ["perfil", "Perfil"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Las pestañas se ocultan en lugar de desmontarse, así conservan su estado. */}
      <div hidden={tab !== "entrenar"}>
        {enCurso ? (
          <RoutineView
            sesion={enCurso}
            ajustando={ajustando}
            error={error}
            onAjustar={ajustar}
            onChange={(cambio) => setEnCurso((actual) => (actual ? cambio(actual) : actual))}
            onGuardar={guardarSesion}
            onDescartar={() => {
              enVuelo.current = null;
              setPendiente(null);
              storage.guardarPendiente(null);
              setEnCurso(null);
            }}
          />
        ) : (
          <SessionForm
            input={borrador}
            onInput={setBorrador}
            historial={historial}
            generando={generando}
            error={error}
            onGenerar={generar}
          />
        )}
      </div>

      <div hidden={tab !== "historial"}>
        <History
          historial={historial}
          onBorrar={(i) => {
            const h = historial.filter((_, j) => j !== i);
            setHistorial(h);
            storage.guardarHistorial(h);
          }}
        />
      </div>

      <div hidden={tab !== "perfil"}>
        <ProfileForm
          perfil={perfil}
          onChange={(p) => {
            setPerfil(p);
            storage.guardarPerfil(p);
          }}
        />
      </div>
    </main>
  );
}
