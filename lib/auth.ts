// Protección opcional con contraseña: si APP_PASSWORD está definida, hay que entrar con ella.
export const COOKIE = "gym_auth";

export async function tokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode(`gym-app:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
