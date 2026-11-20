"use client";
import type { Category } from "@/lib/client";

export const ALL = "all";

type Props = { categories: Category[]; selected: string; onSelect: (id: string) => void };

/** Lista de categorías: columna lateral en escritorio, fila deslizable en móvil. */
export function CategoryNav({ categories, selected, onSelect }: Props) {
  const options = [{ id: ALL, name: "Toda la carta" }, ...categories.map(c => ({ id: c.id, name: c.name }))];
  return (
    <nav className="carta-categories" aria-label="Categorías de la carta">
      <h2>Categorías</h2>
      <ul>
        {options.map(option => (
          <li key={option.id}>
            <button
              type="button"
              aria-pressed={selected === option.id}
              className={selected === option.id ? "active" : undefined}
              onClick={() => onSelect(option.id)}
            >
              {option.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
