# Rutina del día

App web de gimnasio enfocada en ganar músculo. Le dices cuánto tiempo tienes, cómo está tu energía y dónde entrenas, y la IA arma la rutina del día teniendo en cuenta lo que entrenaste antes. Durante la sesión puedes registrar pesos y repeticiones, cambiar un ejercicio (máquina ocupada, molestia) o pedir un reajuste ("me quedan 20 minutos") y la IA rehace lo que falta.

Cada ejercicio trae:
- **Imágenes** de la posición inicial y final (catálogo libre [free-exercise-db](https://github.com/yuhonas/free-exercise-db), dominio público).
- **Ficha de técnica** en español escrita por la IA: pasos, errores comunes, consejos y respiración.
- **Video de YouTube** que la IA busca en la web; solo se aceptan videos que aparecieron en los resultados reales de búsqueda y se comprueba con YouTube que se pueden embeber. Si no hay uno válido, se muestra un enlace de búsqueda.

El perfil (180 cm, 69 kg por defecto), el historial y la sesión en curso se guardan en el navegador. Las fichas se guardan en `data/cache/fichas.json` para no buscar dos veces el mismo ejercicio.

## Cómo usarla

Necesitas Node.js 20 o superior y una clave de [OpenRouter](https://openrouter.ai/settings/keys).

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
   - `OPENROUTER_API_KEY`: tu clave de OpenRouter.
   - `APP_PASSWORD`: una contraseña para que solo tú puedas usar la app (y tu clave).
4. "Deploy". Abre la dirección que te da Vercel en el celular, ingresa la contraseña y usa "Agregar a pantalla de inicio".

Si `APP_PASSWORD` está vacía, la app no pide contraseña (cómodo para usarla en tu computadora).

## Modelos y costo

La IA se usa a través de OpenRouter. Por defecto prueba, en orden, modelos **gratuitos** (`google/gemma-4-31b-it:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `openrouter/free`) y, solo si fallan o llegan a su límite diario, `anthropic/claude-haiku-5.5`, que cuesta menos de medio centavo de dólar por rutina. Puedes cambiar la lista con `OPENROUTER_MODELS`.

La búsqueda del video usa el buscador web de OpenRouter (unos US$0,02 la primera vez que abres cada ejercicio; después queda guardado). Si prefieres no gastar en eso, pon `VIDEO_SEARCH=off` y la ficha mostrará un enlace a la búsqueda de YouTube.

Los modelos gratuitos de OpenRouter cambian con el tiempo; si uno deja de existir, la app pasa al siguiente de la lista.

## Estructura

- `lib/ia.ts`: llamadas a OpenRouter (rutina en JSON validado, ficha y búsqueda del video).
- `lib/catalog.ts`: catálogo de ejercicios e imágenes.
- `app/api/routine`, `app/api/exercise`: endpoints.
- `components/`: interfaz.
