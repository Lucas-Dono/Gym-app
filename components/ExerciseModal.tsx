"use client";

import { useEffect, useState } from "react";
import type { EjercicioRutina, FichaEjercicio } from "../lib/types";
import { pedirFicha } from "./api";

export default function ExerciseModal({ ejercicio, onClose }: { ejercicio: EjercicioRutina; onClose: () => void }) {
  const [ficha, setFicha] = useState<FichaEjercicio | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    pedirFicha(ejercicio.id)
      .then((f) => vivo && setFicha(f))
      .catch((e) => vivo && setError(e.message));
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      vivo = false;
      window.removeEventListener("keydown", esc);
    };
  }, [ejercicio.id, onClose]);

  const imagenes = ficha?.imagenes ?? ejercicio.imagenes ?? [];

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={ejercicio.nombre} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{ficha?.nombre ?? ejercicio.nombre}</h2>
          <button className="ghost" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {imagenes.length > 0 && (
          <div className="frames">
            {imagenes.map((src, i) => (
              <figure key={src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${ejercicio.nombre}, ${i === 0 ? "posición inicial" : "posición final"}`} />
                <figcaption>{i === 0 ? "Posición inicial" : "Posición final"}</figcaption>
              </figure>
            ))}
          </div>
        )}

        {error && <p className="error">{error}</p>}
        {!ficha && !error && <p className="muted loading">La IA está buscando la técnica y un buen video…</p>}

        {ficha && (
          <>
            {ficha.video ? (
              <div className="video">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ficha.video.id}`}
                  title={ficha.video.titulo || "Video de técnica"}
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <p className="muted small">
                  {ficha.video.titulo} ·{" "}
                  <a href={`https://www.youtube.com/watch?v=${ficha.video.id}`} target="_blank" rel="noreferrer">
                    Abrir en YouTube
                  </a>
                </p>
              </div>
            ) : (
              <p className="muted small">
                No encontré un video verificado.{" "}
                <a href={ficha.busquedaYoutube} target="_blank" rel="noreferrer">
                  Buscar en YouTube
                </a>
              </p>
            )}

            <p>{ficha.descripcion}</p>
            <p className="muted small">Músculos: {ficha.musculos.join(", ")}</p>

            <h3>Paso a paso</h3>
            <ol className="list">
              {ficha.pasos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>

            <h3>Errores comunes</h3>
            <ul className="list warn">
              {ficha.erroresComunes.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>

            <h3>Consejos</h3>
            <ul className="list">
              {ficha.consejos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>

            <h3>Respiración</h3>
            <p>{ficha.respiracion}</p>
          </>
        )}
      </div>
    </div>
  );
}
