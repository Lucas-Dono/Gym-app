import fs from "node:fs";
import path from "node:path";
import type { FichaEjercicio } from "./types";

// Cada ficha se genera una sola vez: se guarda en memoria y en data/cache/fichas.json.
const FILE = path.join(process.cwd(), "data", "cache", "fichas.json");
let memoria: Record<string, FichaEjercicio> | null = null;

function cargar(): Record<string, FichaEjercicio> {
  if (!memoria) {
    try {
      memoria = JSON.parse(fs.readFileSync(FILE, "utf8"));
    } catch {
      memoria = {};
    }
  }
  return memoria!;
}

export function leerFicha(id: string): FichaEjercicio | undefined {
  return cargar()[id];
}

export function guardarFicha(ficha: FichaEjercicio) {
  const todo = cargar();
  todo[ficha.id] = ficha;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(todo, null, 2));
  } catch {
    // Sistema de archivos de solo lectura (p. ej. en un hosting serverless): queda en memoria.
  }
}
