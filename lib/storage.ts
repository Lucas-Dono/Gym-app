"use client";
import type { Perfil, Rutina, SesionGuardada, RegistroEjercicio, SesionInput } from "./types";

// Todo se guarda en el navegador: perfil, historial y la sesión en curso.
const KEYS = {
  perfil: "gym.perfil",
  historial: "gym.historial",
  enCurso: "gym.enCurso",
  pendiente: "gym.pendiente",
  borrador: "gym.borrador",
};

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
  /** Temporizador de descanso activo (fin en ms desde epoch). */
  timer?: { fin: number; total: number } | null;
  /** Formulario de cierre a medio completar. */
  cierre?: { abierto: boolean; sensacion: SesionGuardada["sensacion"]; comentario: string };
}

/** Pedido a la IA en curso: se guarda para retomarlo si se cambia de pestaña o se cierra la app. */
export type Pendiente =
  | { tipo: "rutina"; input: SesionInput; body: PedidoRutina; desde: string }
  | { tipo: "ajuste"; texto: string; body: PedidoRutina; desde: string };

export interface PedidoRutina {
  perfil: Perfil;
  sesion: SesionInput;
  historial: SesionGuardada[];
  rutinaActual?: Rutina;
  hechos?: string[];
  ajuste?: string;
}

export const BORRADOR_INICIAL: SesionInput = {
  minutos: 60,
  energia: "normal",
  lugar: "gimnasio",
  enfoque: "auto",
  molestias: "",
  notas: "",
};

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
  pendiente: () => leer<Pendiente | null>(KEYS.pendiente, null),
  guardarPendiente: (p: Pendiente | null) => escribir(KEYS.pendiente, p),
  borrador: () => ({ ...BORRADOR_INICIAL, ...leer<Partial<SesionInput>>(KEYS.borrador, {}) }),
  guardarBorrador: (b: SesionInput) => escribir(KEYS.borrador, b),
};
