"use client";

/** Alterna entre la foto de posición inicial y final para mostrar el movimiento. */
export default function ExerciseImages({ imagenes, alt, onClick }: { imagenes: string[]; alt: string; onClick?: () => void }) {
  if (!imagenes.length) {
    return (
      <button className="ex-img empty" onClick={onClick} aria-label={`Ver técnica de ${alt}`}>
        🏋️
      </button>
    );
  }
  return (
    <button className="ex-img" onClick={onClick} aria-label={`Ver técnica de ${alt}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imagenes[0]} alt={`${alt}: posición inicial`} loading="lazy" />
      {imagenes[1] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagenes[1]} alt={`${alt}: posición final`} loading="lazy" className="frame2" />
      )}
    </button>
  );
}
