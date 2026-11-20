import { Flame, HeartHandshake, Soup, Trees } from "lucide-react";

const experiences = [
  { Icon: Flame, title: "Cocina a leña y carbón", text: "Los sabores de la cocina tradicional cajamarquina." },
  { Icon: Soup, title: "Sabores del valle", text: "El quesillo, las papas y las hierbas de nuestra mesa." },
  { Icon: Trees, title: "Ambiente campestre", text: "Una pausa para compartir en familia y con amigos." },
  { Icon: HeartHandshake, title: "Atención con cariño", text: "La calidez de una mesa servida en casa." }
];

export function Experiences() {
  return (
    <section className="posada-section experience-content" aria-labelledby="experiences-title">
      <div className="section-header">
        <h2 id="experiences-title">La experiencia de La Posada</h2>
      </div>
      <div className="experiences-grid">
        {experiences.map(({ Icon, title, text }) => (
          <article className="experience-card" key={title}>
            <Icon className="experience-icon" size={26} strokeWidth={1.55} aria-hidden="true" />
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
