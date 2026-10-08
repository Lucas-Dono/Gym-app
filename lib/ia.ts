import type { z } from "zod/v4";
import { z as zod } from "zod/v4";
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

// Todas las llamadas pasan por OpenRouter (https://openrouter.ai), que da acceso a muchos modelos con una sola clave.
// Se prueban los modelos en orden; si uno falla (caído, sin cupo o respuesta inválida) se pasa al siguiente.
// DeepSeek V4 Flash cuesta ~US$0,001 por rutina. Se puede cambiar la lista con OPENROUTER_MODELS (separados por coma).
const MODELOS_POR_DEFECTO = ["deepseek/deepseek-v4-flash", "qwen/qwen3.8-flash", "deepseek/deepseek-v4.1-flash"];

function modelos(): string[] {
  const env = process.env.OPENROUTER_MODELS?.split(",").map((m) => m.trim()).filter(Boolean);
  return env?.length ? env : MODELOS_POR_DEFECTO;
}

export class IAError extends Error {}

interface Mensaje {
  role: "system" | "user";
  content: string | { type: "text"; text: string; cache_control?: { type: "ephemeral" } }[];
}

interface Respuesta {
  model?: string;
  choices?: {
    finish_reason?: string;
    message?: {
      content?: string | null;
      annotations?: { type: string; url_citation?: { url: string; title?: string } }[];
    };
  }[];
  error?: { code?: number; message?: string };
}

async function llamar(modelo: string, body: Record<string, unknown>): Promise<Respuesta> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new IAError("Falta la clave OPENROUTER_API_KEY (en .env.local o en las variables de Vercel).");
  const r = await fetch(`${process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1"}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/Lucas-Dono/gym-app",
      "X-Title": "Rutina del dia",
    },
    body: JSON.stringify({ model: modelo, ...body }),
    signal: AbortSignal.timeout(120_000),
  });
  const data = (await r.json().catch(() => ({}))) as Respuesta;
  if (r.status === 401) throw new IAError("La clave OPENROUTER_API_KEY no es válida.");
  if (!r.ok || data.error) {
    throw new Error(`${modelo}: ${r.status} ${data.error?.message ?? "error desconocido"}`);
  }
  return data;
}

/** Quita lo que algunos proveedores rechazan en modo estricto ($schema y los límites de entero seguro de zod). */
function limpiarEsquema(nodo: unknown): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(nodo, (k, v) =>
      k === "$schema" || ((k === "minimum" || k === "maximum") && Math.abs(v) === Number.MAX_SAFE_INTEGER) ? undefined : v,
    ),
  );
}

/** Saca el primer objeto JSON del texto (los modelos a veces lo envuelven en ```json ... ```). */
function extraerJson(texto: string): unknown {
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (inicio < 0 || fin <= inicio) throw new Error("la respuesta no tiene JSON");
  return JSON.parse(texto.slice(inicio, fin + 1));
}

/** Pide una respuesta JSON que cumpla `schema`, probando cada modelo hasta que uno responda bien. */
async function pedirJson<S extends z.ZodType>(
  schema: S,
  nombre: string,
  mensajes: Mensaje[],
  maxTokens: number,
): Promise<z.infer<S>> {
  const jsonSchema = limpiarEsquema(zod.toJSONSchema(schema));
  const instruccion = `Responde SOLO con un objeto JSON válido (sin texto antes ni después) que cumpla este esquema:\n${JSON.stringify(jsonSchema)}`;
  const errores: string[] = [];
  for (const modelo of modelos()) {
    const msgs = mensajes.map((m) => ({ ...m, content: conCache(m.content, modelo) }));
    msgs.push({ role: "user", content: instruccion });
    try {
      const res = await llamar(modelo, {
        messages: msgs,
        max_tokens: maxTokens,
        temperature: 0.4,
        response_format: { type: "json_schema", json_schema: { name: nombre, strict: true, schema: jsonSchema } },
      });
      const texto = res.choices?.[0]?.message?.content ?? "";
      const parsed = schema.safeParse(extraerJson(texto));
      if (parsed.success) return parsed.data;
      errores.push(`${modelo}: JSON con formato incorrecto`);
    } catch (err) {
      if (err instanceof IAError) throw err;
      errores.push(err instanceof Error ? err.message : String(err));
    }
  }
  console.error("Todos los modelos fallaron:", errores);
  throw new IAError(mensajeDeFallo(errores));
}

function mensajeDeFallo(errores: string[]): string {
  const todo = errores.join(" | ");
  if (/402|credit/i.test(todo)) return "No hay créditos suficientes en OpenRouter. Cargá saldo en openrouter.ai/credits.";
  if (/429|rate/i.test(todo)) return "Demasiadas consultas seguidas. Esperá un minuto y probá de nuevo.";
  return "Ningún modelo pudo responder ahora. Probá de nuevo en un momento.";
}

/** El catálogo es largo y no cambia: en modelos de Anthropic se marca para la caché de prompt (más barato). */
function conCache(content: Mensaje["content"], modelo: string): Mensaje["content"] {
  if (typeof content !== "string" || !modelo.startsWith("anthropic/") || content.length < 4000) return content;
  return [{ type: "text", text: content, cache_control: { type: "ephemeral" } }];
}

const LUGAR_TEXTO: Record<Lugar, string> = {
  gimnasio: "gimnasio completo (barras, mancuernas, poleas, máquinas)",
  casa: "casa con mancuernas, bandas y kettlebell",
  "peso-corporal": "solo peso corporal, sin equipo",
};

function systemPrompt(lugar: Lugar): string {
  return `Sos un entrenador personal experto en hipertrofia. Armás la sesión de gimnasio de HOY para una persona según el tiempo que tiene, cómo se siente y lo que entrenó los días anteriores. Respondés siempre en español, claro y breve.

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
${catalogText(lugar)}`;
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

  const rutina = await pedirJson(
    RutinaSchema,
    "rutina",
    [
      { role: "system", content: systemPrompt(sesion.lugar) },
      { role: "user", content: pedido },
    ],
    8000,
  );
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

/**
 * Busca en la web (plugin de búsqueda de OpenRouter, ~US$0,02 por ejercicio, una sola vez gracias a la caché)
 * un video de técnica en YouTube y verifica que exista y se pueda embeber.
 * Con VIDEO_SEARCH=off no se busca y la ficha muestra un enlace a la búsqueda de YouTube.
 */
async function buscarVideo(nombreEn: string): Promise<{ id: string; titulo: string } | null> {
  if (process.env.VIDEO_SEARCH === "off") return null;
  const titulos = new Map<string, string>();
  let elegido: string | null = null;
  for (const modelo of modelos()) {
    try {
      const res = await llamar(modelo, {
        messages: [
          {
            role: "user",
            content: `Busca en YouTube (site:youtube.com) el mejor video que explique la técnica correcta del ejercicio "${nombreEn}". Prefiere videos en español de entrenadores o fisioterapeutas reconocidos, cortos y claros; si no hay buenos en español, uno en inglés. Responde solo con la URL de YouTube del video elegido y su título.`,
          },
        ],
        max_tokens: 1000,
        plugins: [{ id: "web", max_results: 5, search_prompt: "Resultados de búsqueda web:" }],
      });
      const msg = res.choices?.[0]?.message;
      for (const a of msg?.annotations ?? []) {
        const id = a.url_citation ? youtubeId(a.url_citation.url) : null;
        if (id && !titulos.has(id)) titulos.set(id, a.url_citation?.title ?? "");
      }
      elegido = youtubeId(msg?.content ?? "");
      break;
    } catch (err) {
      if (err instanceof IAError) throw err;
      console.error("Búsqueda de video falló:", err);
    }
  }

  // Solo aceptamos videos que aparecieron en los resultados reales de la búsqueda (o que YouTube confirma que existen).
  const candidatos = [...new Set([...(elegido ? [elegido] : []), ...titulos.keys()])];
  for (const id of candidatos.slice(0, 4)) {
    const titulo = await oembedTitle(id);
    if (titulo === null) continue;
    if (titulo === "" && !titulos.has(id)) continue; // no se pudo comprobar y no vino de la búsqueda
    return { id, titulo: titulo || titulos.get(id) || "" };
  }
  return null;
}

async function escribirFicha(id: string) {
  const ex = getExercise(id)!;
  return pedirJson(
    FichaSchema,
    "ficha",
    [
      {
        role: "user",
        content: `Escribe en español una ficha de técnica para el ejercicio "${ex.name}" (equipo: ${ex.equipment ?? "ninguno"}; músculos: ${[...ex.primaryMuscles, ...ex.secondaryMuscles].join(", ")}), orientada a hipertrofia.
Instrucciones de referencia (en inglés):
${ex.instructions.join("\n")}

Incluye: nombre en español, músculos en español, una descripción de 1-2 frases, 4-7 pasos claros, 3-5 errores comunes, 2-4 consejos para sentir el músculo y progresar, y cómo respirar.`,
      },
    ],
    3000,
  );
}

export async function fichaEjercicio(id: string): Promise<FichaEjercicio> {
  const ex = getExercise(id);
  if (!ex) throw new IAError("Ejercicio no encontrado en el catálogo.");
  const [ficha, video] = await Promise.all([escribirFicha(id), buscarVideo(ex.name).catch(() => null)]);
  return {
    ...ficha,
    id,
    imagenes: imageUrls(ex),
    video,
    busquedaYoutube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} técnica correcta`)}`,
  };
}
