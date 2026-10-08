import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { catalogText, getExercise, imageUrls, resolveId } from "./catalog";
import {
  FichaSchema,
  RutinaSchema,
  type FichaEjercicio,
  type Lugar,
  type Perfil,
  type Rutina,
  type SesionGuardada,
  type SesionInput,
} from "./types";

const MODEL = "claude-opus-5-5";
// Si un clasificador de seguridad rechaza la petición, la API la reintenta en el modelo recomendado.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

// Se crea al primer uso para poder mostrar un error claro si falta la clave.
let _client: Anthropic | null = null;
const client = () => (_client ??= new Anthropic());

export class ClaudeError extends Error {}

const LUGAR_TEXTO: Record<Lugar, string> = {
  gimnasio: "gimnasio completo (barras, mancuernas, poleas, máquinas)",
  casa: "casa con mancuernas, bandas y kettlebell",
  "peso-corporal": "solo peso corporal, sin equipo",
};

function systemPrompt(lugar: Lugar): Anthropic.Beta.BetaTextBlockParam[] {
  return [
    {
      type: "text",
      text: `Sos un entrenador personal experto en hipertrofia. Armás la sesión de gimnasio de HOY para una persona según el tiempo que tiene, cómo se siente y lo que entrenó los días anteriores. Respondés siempre en español, claro y breve.

Criterios:
- Objetivo: ganar músculo. Priorizá ejercicios compuestos al principio y aislamiento después; 10-20 series semanales por grupo muscular; la mayoría de las series a 1-3 repeticiones en reserva (RIR); rangos de 6-15 repeticiones; descansos de 90-180 s en compuestos y 60-90 s en aislamiento.
- Ajustá el volumen al tiempo: contá ~2-3 min por serie incluyendo descanso, más calentamiento y vuelta a la calma. La duración estimada no puede superar el tiempo disponible.
- Energía baja: menos series, RIR más alto, evitá movimientos muy técnicos o pesados; podés usar máquinas o mancuernas. Energía alta: podés sumar una serie o un ejercicio.
- No repitas el mismo grupo muscular principal que se entrenó fuerte en las últimas 48 h si hay alternativa. Rotá (empuje / tracción / piernas, o torso / pierna) mirando el historial.
- Si el historial registra peso y repeticiones de un ejercicio, sugerí en "notas" una progresión concreta (más peso o más repeticiones).
- Si hay molestias o dolor, evitá cargar esa zona y elegí variantes seguras; nunca des diagnósticos médicos.
- Elegí SOLO ejercicios del catálogo de abajo y copiá su id exacto en "id". Traducí el nombre al español en "nombre".
- En "consejos" incluí al menos uno de alimentación cuando el objetivo es subir de peso (superávit calórico moderado, ~1,6-2,2 g de proteína por kg).

Equipo disponible: ${LUGAR_TEXTO[lugar]}.

Catálogo (id | equipo | músculos principales (+secundarios) | mecánica | nivel):
${catalogText(lugar)}`,
      cache_control: { type: "ephemeral" },
    },
  ];
}

function describirHistorial(historial: SesionGuardada[]): string {
  if (!historial.length) return "Sin sesiones registradas todavía.";
  return historial
    .slice(0, 8)
    .map((s) => {
      const dias = Math.round((Date.now() - new Date(s.fecha).getTime()) / 86_400_000);
      const cuando = dias === 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`;
      const ej = s.ejercicios
        .map(
          (e) =>
            `${e.nombre} (${e.id})${e.completado ? "" : " [no hecho]"}${e.peso ? `, ${e.peso}` : ""}${e.reps ? ` x ${e.reps}` : ""}`,
        )
        .join("; ");
      const sens = s.sensacion ? ` Sensación: ${s.sensacion}.` : "";
      const com = s.comentario ? ` Comentario: ${s.comentario}.` : "";
      return `- ${cuando}: ${s.enfoque}, ${s.minutos} min, energía ${s.energia}.${sens}${com} Ejercicios: ${ej}`;
    })
    .join("\n");
}

export interface PedidoRutina {
  perfil: Perfil;
  sesion: SesionInput;
  historial: SesionGuardada[];
  /** Para ajustes sobre la marcha: la rutina en curso, qué ya se hizo y qué cambió. */
  rutinaActual?: Rutina;
  hechos?: string[];
  ajuste?: string;
}

export async function generarRutina(p: PedidoRutina): Promise<Rutina> {
  const { perfil, sesion } = p;
  const imc = perfil.pesoKg / (perfil.alturaCm / 100) ** 2;
  let pedido = `Perfil: ${perfil.alturaCm} cm, ${perfil.pesoKg} kg (IMC ${imc.toFixed(1)})${perfil.edad ? `, ${perfil.edad} años` : ""}, nivel ${perfil.experiencia}, entrena ${perfil.diasPorSemana} días por semana. Objetivo: ganar masa muscular.

Hoy: ${sesion.minutos} minutos disponibles, energía ${sesion.energia}.
Enfoque pedido: ${sesion.enfoque === "auto" ? "elegilo vos según el historial" : sesion.enfoque}.
Molestias: ${sesion.molestias || "ninguna"}.
Notas: ${sesion.notas || "ninguna"}.

Historial reciente:
${describirHistorial(p.historial)}`;

  if (p.rutinaActual && p.ajuste) {
    pedido += `

La sesión YA está en curso con esta rutina:
${JSON.stringify({ ...p.rutinaActual, ejercicios: p.rutinaActual.ejercicios.map(({ imagenes, ...e }) => e) })}
Ejercicios ya completados (mantenelos tal cual al principio de la lista): ${p.hechos?.length ? p.hechos.join(", ") : "ninguno"}.
Cambio pedido: ${p.ajuste}
Devolvé la rutina completa actualizada, cambiando solo lo necesario para resolver el pedido.`;
  } else {
    pedido += "\n\nArmá la sesión de hoy.";
  }

  let res;
  try {
    res = await client().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      output_config: { effort: "medium", format: betaZodOutputFormat(RutinaSchema) },
      system: systemPrompt(sesion.lugar),
      messages: [{ role: "user", content: pedido }],
    });
  } catch (err) {
    throw toClaudeError(err);
  }
  if (res.stop_reason === "refusal" || !res.parsed_output) {
    throw new ClaudeError("Claude no pudo armar la rutina. Probá de nuevo.");
  }

  const rutina = res.parsed_output;
  return {
    ...rutina,
    ejercicios: rutina.ejercicios.map((e) => {
      const ex = resolveId(e.id);
      return ex ? { ...e, id: ex.id, imagenes: imageUrls(ex) } : { ...e, imagenes: [] };
    }),
  };
}

// --- Ficha de técnica de un ejercicio ---

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** Título del video según YouTube; null si no existe o no se puede embeber; "" si no se pudo comprobar. */
async function oembedTitle(videoId: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (r.status === 401 || r.status === 403 || r.status === 404) return null; // privado, borrado o no embebible
    if (!r.ok) return "";
    return ((await r.json()) as { title?: string }).title ?? "";
  } catch {
    return ""; // sin conexión con YouTube: confiamos en el resultado de la búsqueda
  }
}

/** Busca con Claude (web search) un video de técnica en YouTube y verifica que exista y se pueda embeber. */
async function buscarVideo(nombreEn: string): Promise<{ id: string; titulo: string } | null> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Buscá en YouTube el mejor video que explique la técnica correcta del ejercicio "${nombreEn}". Preferí videos en español de entrenadores o fisioterapeutas reconocidos, cortos y claros; si no hay buenos en español, uno en inglés. Respondé con la URL del video elegido y su título, nada más.`,
    },
  ];
  const vistos: { url: string; title: string }[] = [];
  let texto = "";
  for (let i = 0; i < 3; i++) {
    let res;
    try {
      res = await client().beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        ...FALLBACK,
        output_config: { effort: "low" },
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3, allowed_domains: ["youtube.com"] }],
        messages,
      });
    } catch (err) {
      console.error("Búsqueda de video falló:", err);
      break;
    }
    for (const block of res.content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) if (r.type === "web_search_result") vistos.push({ url: r.url, title: r.title });
      }
      if (block.type === "text") texto += block.text;
    }
    if (res.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: res.content });
  }

  // Solo aceptamos ids que aparecieron en los resultados reales de la búsqueda.
  const titulos = new Map<string, string>();
  for (const v of vistos) {
    const id = youtubeId(v.url);
    if (id && !titulos.has(id)) titulos.set(id, v.title);
  }
  const idsVistos = [...titulos.keys()];
  const elegido = youtubeId(texto);
  const candidatos = [...new Set([...(elegido && idsVistos.includes(elegido) ? [elegido] : []), ...idsVistos])];
  for (const id of candidatos.slice(0, 4)) {
    const titulo = await oembedTitle(id);
    if (titulo !== null) return { id, titulo: titulo || titulos.get(id) || "" };
  }
  return null;
}

async function escribirFicha(id: string) {
  const ex = getExercise(id)!;
  try {
    const res = await client().beta.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      ...FALLBACK,
      output_config: { effort: "low", format: betaZodOutputFormat(FichaSchema) },
      messages: [
        {
          role: "user",
          content: `Escribí en español una ficha de técnica para el ejercicio "${ex.name}" (equipo: ${ex.equipment ?? "ninguno"}; músculos: ${[...ex.primaryMuscles, ...ex.secondaryMuscles].join(", ")}), orientada a hipertrofia.
Instrucciones de referencia (en inglés):
${ex.instructions.join("\n")}

Incluí: nombre en español, músculos en español, una descripción de 1-2 frases, 4-7 pasos claros, 3-5 errores comunes, 2-4 consejos para sentir el músculo y progresar, y cómo respirar. Dejá videoUrl y videoTitulo vacíos.`,
        },
      ],
    });
    if (!res.parsed_output) throw new ClaudeError("Claude no pudo escribir la ficha.");
    return res.parsed_output;
  } catch (err) {
    throw toClaudeError(err);
  }
}

export async function fichaEjercicio(id: string): Promise<FichaEjercicio> {
  const ex = getExercise(id);
  if (!ex) throw new ClaudeError("Ejercicio no encontrado en el catálogo.");
  const [ficha, video] = await Promise.all([escribirFicha(id), buscarVideo(ex.name)]);
  const { videoUrl, videoTitulo, ...resto } = ficha;
  return {
    ...resto,
    id,
    imagenes: imageUrls(ex),
    video,
    busquedaYoutube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} técnica correcta`)}`,
  };
}

function toClaudeError(err: unknown): Error {
  if (err instanceof ClaudeError) return err;
  if (err instanceof Anthropic.AuthenticationError) {
    return new ClaudeError("Falta o es inválida la clave ANTHROPIC_API_KEY en .env.local.");
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new ClaudeError("Demasiadas consultas seguidas a Claude. Esperá un momento y reintentá.");
  }
  if (err instanceof Anthropic.APIError) {
    return new ClaudeError(`Error de la API de Claude: ${err.message}`);
  }
  if (err instanceof Error && /api key|apiKey|authentication/i.test(err.message)) {
    return new ClaudeError("Falta la clave ANTHROPIC_API_KEY en .env.local.");
  }
  return err instanceof Error ? err : new Error(String(err));
}
