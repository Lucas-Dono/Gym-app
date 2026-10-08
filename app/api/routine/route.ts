import { NextResponse } from "next/server";
import { ClaudeError, generarRutina, type PedidoRutina } from "../../../lib/claude";

export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json()) as PedidoRutina;
  if (!body?.perfil || !body?.sesion) {
    return NextResponse.json({ error: "Faltan datos del perfil o de la sesión." }, { status: 400 });
  }
  try {
    const rutina = await generarRutina(body);
    return NextResponse.json({ rutina });
  } catch (err) {
    console.error(err);
    const msg = err instanceof ClaudeError ? err.message : "No se pudo generar la rutina.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
