# Rutina del día

App web de gimnasio enfocada en ganar músculo. Le dices cuánto tiempo tienes, cómo está tu energía y dónde entrenas, y Claude arma la rutina del día teniendo en cuenta lo que entrenaste antes. Durante la sesión puedes registrar pesos y repeticiones, cambiar un ejercicio (máquina ocupada, molestia) o pedir un reajuste ("me quedan 20 minutos") y Claude rehace lo que falta.

Cada ejercicio trae:
- **Imágenes** de la posición inicial y final (catálogo libre [free-exercise-db](https://github.com/yuhonas/free-exercise-db), dominio público).
- **Ficha de técnica** en español escrita por Claude: pasos, errores comunes, consejos y respiración.
- **Video de YouTube** que Claude busca en la web; solo se aceptan videos que aparecieron en los resultados reales de búsqueda y se comprueba con YouTube que se pueden embeber. Si no hay uno válido, se muestra un enlace de búsqueda.

El perfil (180 cm, 69 kg por defecto), el historial y la sesión en curso se guardan en el navegador. Las fichas se guardan en `data/cache/fichas.json` para no buscar dos veces el mismo ejercicio.

## Cómo usarla

Necesitas Node.js 20 o superior y una clave de la API de Anthropic.

```bash
npm install
cp .env.example .env.local   # y pega tu clave en ANTHROPIC_API_KEY
npm run dev
```

Abre http://localhost:3000 (desde el celular, usa la IP de tu computadora en la misma red: `npm run dev -- -H 0.0.0.0`).

## Usarla desde el celular (Vercel)

1. Entra a https://vercel.com con tu cuenta de GitHub.
2. "Add New… > Project" e importa este repositorio.
3. En "Environment Variables" agrega:
   - `ANTHROPIC_API_KEY`: tu clave de Anthropic.
   - `APP_PASSWORD`: una contraseña para que solo tú puedas usar la app (y tu clave).
4. "Deploy". Abre la dirección que te da Vercel en el celular, ingresa la contraseña y usa "Agregar a pantalla de inicio".

Si `APP_PASSWORD` está vacía, la app no pide contraseña (cómodo para usarla en tu computadora).

## Costo aproximado

Usa el modelo `claude-opus-5-5`. Generar o reajustar una rutina es una consulta (el catálogo de ejercicios se envía con caché de prompt). La primera vez que abres la técnica de un ejercicio son dos consultas (ficha + búsqueda web del video); después queda en caché.

## Estructura

- `lib/claude.ts`: llamadas a Claude (rutina con salida estructurada, ficha y búsqueda del video).
- `lib/catalog.ts`: catálogo de ejercicios e imágenes.
- `app/api/routine`, `app/api/exercise`: endpoints.
- `components/`: interfaz.
