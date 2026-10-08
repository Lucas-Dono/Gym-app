import { NextResponse } from "next/server";
import { IAError, generarRutina, type PedidoRutina } from "../../../lib/ia";

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
    const msg = err instanceof IAError ? err.message : "No se pudo generar la rutina.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
