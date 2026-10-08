import { NextResponse } from "next/server";
import { leerFicha, guardarFicha } from "../../../lib/cache";
import { ClaudeError, fichaEjercicio } from "../../../lib/claude";

export const maxDuration = 300;

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id del ejercicio." }, { status: 400 });

  const enCache = leerFicha(id);
  if (enCache) return NextResponse.json({ ficha: enCache });

  try {
    const ficha = await fichaEjercicio(id);
    guardarFicha(ficha);
    return NextResponse.json({ ficha });
  } catch (err) {
    console.error(err);
    const msg = err instanceof ClaudeError ? err.message : "No se pudo cargar la ficha.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
