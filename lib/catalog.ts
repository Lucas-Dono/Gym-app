import fs from "node:fs";
import path from "node:path";
import type { Lugar } from "./types";

// Catálogo de ejercicios de free-exercise-db (dominio público, https://github.com/yuhonas/free-exercise-db).
// Cada ejercicio trae dos fotos (posición inicial y final) que usamos como imágenes de técnica.
export interface RawExercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

let cache: { list: RawExercise[]; byId: Map<string, RawExercise> } | null = null;

function load() {
  if (!cache) {
    const file = path.join(process.cwd(), "data", "exercises.raw.json");
    const list = JSON.parse(fs.readFileSync(file, "utf8")) as RawExercise[];
    cache = { list, byId: new Map(list.map((e) => [e.id, e])) };
  }
  return cache;
}

export function getExercise(id: string): RawExercise | undefined {
  return load().byId.get(id);
}

export function imageUrls(ex: RawExercise): string[] {
  return ex.images.map((img) => IMAGE_BASE + img);
}

const EQUIPO_POR_LUGAR: Record<Lugar, (string | null)[] | null> = {
  gimnasio: null, // todo vale
  casa: ["dumbbell", "body only", "bands", "kettlebells", "exercise ball", null],
  "peso-corporal": ["body only", null],
};

/** Ejercicios de fuerza aptos para hipertrofia, filtrados por el equipo disponible. */
export function trainingCatalog(lugar: Lugar): RawExercise[] {
  const allowed = EQUIPO_POR_LUGAR[lugar];
  return load().list.filter(
    (e) =>
      ["strength", "powerlifting", "plyometrics"].includes(e.category) &&
      e.level !== "expert" &&
      (allowed === null || allowed.includes(e.equipment)),
  );
}

/** Una línea compacta por ejercicio para que Claude elija por id. */
export function catalogText(lugar: Lugar): string {
  return trainingCatalog(lugar)
    .map((e) => {
      const sec = e.secondaryMuscles.length ? ` (+${e.secondaryMuscles.join(",")})` : "";
      return `${e.id} | ${e.equipment ?? "none"} | ${e.primaryMuscles.join(",")}${sec} | ${e.mechanic ?? "-"} | ${e.level}`;
    })
    .join("\n");
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Corrige ids mal escritos buscando la coincidencia más cercana por nombre normalizado. */
export function resolveId(id: string): RawExercise | undefined {
  const exact = getExercise(id);
  if (exact) return exact;
  const n = normalize(id);
  return load().list.find((e) => normalize(e.id) === n || normalize(e.name) === n);
}
