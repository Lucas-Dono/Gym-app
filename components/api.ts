"use client";

import type { FichaEjercicio, Perfil, Rutina, SesionGuardada, SesionInput } from "../lib/types";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const data = await r.json().catch(() => ({ error: "Respuesta inválida del servidor." }));
  if (!r.ok) throw new Error(data.error ?? "Algo salió mal.");
  return data as T;
}

export async function pedirRutina(body: {
  perfil: Perfil;
  sesion: SesionInput;
  historial: SesionGuardada[];
  rutinaActual?: Rutina;
  hechos?: string[];
  ajuste?: string;
}): Promise<Rutina> {
  const { rutina } = await call<{ rutina: Rutina }>("/api/routine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return rutina;
}

const fichas = new Map<string, Promise<FichaEjercicio>>();

export function pedirFicha(id: string): Promise<FichaEjercicio> {
  if (!fichas.has(id)) {
    const p = call<{ ficha: FichaEjercicio }>(`/api/exercise?id=${encodeURIComponent(id)}`).then((d) => d.ficha);
    p.catch(() => fichas.delete(id));
    fichas.set(id, p);
  }
  return fichas.get(id)!;
}
