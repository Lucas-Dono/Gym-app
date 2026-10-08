"use client";

import { useEffect, useState } from "react";
import { storage, type SesionEnCurso } from "../lib/storage";
import type { Perfil, SesionGuardada } from "../lib/types";
import SessionForm from "../components/SessionForm";
import RoutineView from "../components/RoutineView";
import History from "../components/History";
import ProfileForm from "../components/ProfileForm";

type Tab = "entrenar" | "historial" | "perfil";

export default function Home() {
  const [tab, setTab] = useState<Tab>("entrenar");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [historial, setHistorial] = useState<SesionGuardada[]>([]);
  const [enCurso, setEnCurso] = useState<SesionEnCurso | null>(null);

  // localStorage solo existe en el navegador: cargamos después del primer render.
  useEffect(() => {
    setPerfil(storage.perfil());
    setHistorial(storage.historial());
    setEnCurso(storage.enCurso());
  }, []);

  function actualizarEnCurso(s: SesionEnCurso | null) {
    setEnCurso(s);
    storage.guardarEnCurso(s);
  }

  function guardarSesion(s: SesionGuardada) {
    const h = [s, ...historial].slice(0, 60);
    setHistorial(h);
    storage.guardarHistorial(h);
    actualizarEnCurso(null);
    setTab("historial");
  }

  if (!perfil) return null;

  return (
    <main className="app">
      <header className="top">
        <h1>
          Rutina <span>del día</span>
        </h1>
        <nav className="tabs" role="tablist">
          {(
            [
              ["entrenar", "Entrenar"],
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

      {tab === "entrenar" &&
        (enCurso ? (
          <RoutineView
            sesion={enCurso}
            perfil={perfil}
            historial={historial}
            onChange={actualizarEnCurso}
            onGuardar={guardarSesion}
            onDescartar={() => actualizarEnCurso(null)}
          />
        ) : (
          <SessionForm
            perfil={perfil}
            historial={historial}
            onRutina={(input, rutina) => actualizarEnCurso({ input, rutina, registro: {}, inicio: new Date().toISOString() })}
          />
        ))}

      {tab === "historial" && (
        <History
          historial={historial}
          onBorrar={(i) => {
            const h = historial.filter((_, j) => j !== i);
            setHistorial(h);
            storage.guardarHistorial(h);
          }}
        />
      )}

      {tab === "perfil" && (
        <ProfileForm
          perfil={perfil}
          onChange={(p) => {
            setPerfil(p);
            storage.guardarPerfil(p);
          }}
        />
      )}
    </main>
  );
}
