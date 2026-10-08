"use client";
import type { Perfil, Rutina, SesionGuardada, RegistroEjercicio, SesionInput } from "./types";

// Todo se guarda en el navegador: perfil, historial y la sesión en curso.
const KEYS = { perfil: "gym.perfil", historial: "gym.historial", enCurso: "gym.enCurso" };

export const PERFIL_INICIAL: Perfil = {
  alturaCm: 180,
  pesoKg: 69,
  edad: null,
  experiencia: "principiante",
  diasPorSemana: 4,
};

export interface SesionEnCurso {
  input: SesionInput;
  rutina: Rutina;
  registro: Record<string, RegistroEjercicio>;
  inicio: string;
}

function leer<T>(key: string, def: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : def;
  } catch {
    return def;
  }
}

function escribir(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible */
  }
}

export const storage = {
  perfil: () => leer<Perfil>(KEYS.perfil, PERFIL_INICIAL),
  guardarPerfil: (p: Perfil) => escribir(KEYS.perfil, p),
  historial: () => leer<SesionGuardada[]>(KEYS.historial, []),
  guardarHistorial: (h: SesionGuardada[]) => escribir(KEYS.historial, h),
  enCurso: () => leer<SesionEnCurso | null>(KEYS.enCurso, null),
  guardarEnCurso: (s: SesionEnCurso | null) => escribir(KEYS.enCurso, s),
};
