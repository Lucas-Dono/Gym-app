"use client";

import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (r.ok) window.location.href = "/";
    else {
      setError("Contraseña incorrecta.");
      setCargando(false);
    }
  }

  return (
    <main className="app">
      <header className="top">
        <h1>
          Rutina <span>del día</span>
        </h1>
      </header>
      <form className="card form" onSubmit={entrar}>
        <h2>Ingresa la contraseña</h2>
        <input type="password" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button className="primary big" disabled={cargando || !password}>
          Entrar
        </button>
      </form>
    </main>
  );
}
