import { z } from "zod/v4";

export type Lugar = "gimnasio" | "casa" | "peso-corporal";
export type Energia = "baja" | "normal" | "alta";
export type Experiencia = "principiante" | "intermedio" | "avanzado";

export interface Perfil {
  alturaCm: number;
  pesoKg: number;
  edad: number | null;
  experiencia: Experiencia;
  diasPorSemana: number;
}

export interface SesionInput {
  minutos: number;
  energia: Energia;
  lugar: Lugar;
  enfoque: string; // "auto" o un grupo muscular / tipo de día
  molestias: string;
  notas: string;
}

/** Lo que el usuario registra al terminar (o mientras hace) una sesión. */
export interface RegistroEjercicio {
  id: string;
  nombre: string;
  completado: boolean;
  peso: string;
  reps: string;
}

export interface SesionGuardada {
  fecha: string; // ISO
  titulo: string;
  enfoque: string;
  minutos: number;
  energia: Energia;
  ejercicios: RegistroEjercicio[];
  sensacion: "dura" | "bien" | "facil" | "";
  comentario: string;
}

// --- Esquemas de salida estructurada de Claude ---

export const EjercicioSchema = z.object({
  id: z.string().describe("id exacto del catálogo"),
  nombre: z.string().describe("nombre del ejercicio en español"),
  musculos: z.array(z.string()).describe("músculos principales, en español"),
  series: z.number().int(),
  repeticiones: z.string().describe('rango, p. ej. "8-12"'),
  descansoSeg: z.number().int(),
  rir: z.string().describe('repeticiones en reserva, p. ej. "1-2"'),
  notas: z.string().describe("indicación breve de ejecución o progresión"),
});

export const BloqueSchema = z.object({
  actividad: z.string(),
  duracion: z.string(),
});

export const RutinaSchema = z.object({
  titulo: z.string(),
  enfoque: z.string().describe("grupos musculares trabajados hoy"),
  duracionEstimadaMin: z.number().int(),
  porQue: z.string().describe("por qué esta rutina encaja con el día, en 1-2 frases"),
  calentamiento: z.array(BloqueSchema),
  ejercicios: z.array(EjercicioSchema),
  vueltaALaCalma: z.array(BloqueSchema),
  consejos: z.array(z.string()).describe("2-3 consejos breves: progresión, comida, descanso"),
});

export type EjercicioRutina = z.infer<typeof EjercicioSchema> & { imagenes?: string[] };
export type Rutina = Omit<z.infer<typeof RutinaSchema>, "ejercicios"> & {
  ejercicios: EjercicioRutina[];
};

export const FichaSchema = z.object({
  nombre: z.string(),
  musculos: z.array(z.string()),
  descripcion: z.string(),
  pasos: z.array(z.string()),
  erroresComunes: z.array(z.string()),
  consejos: z.array(z.string()),
  respiracion: z.string(),
  videoUrl: z.string().describe("URL de YouTube encontrada en la búsqueda, o cadena vacía"),
  videoTitulo: z.string(),
});

export interface FichaEjercicio extends Omit<z.infer<typeof FichaSchema>, "videoUrl" | "videoTitulo"> {
  id: string;
  imagenes: string[];
  video: { id: string; titulo: string } | null;
  busquedaYoutube: string;
}
