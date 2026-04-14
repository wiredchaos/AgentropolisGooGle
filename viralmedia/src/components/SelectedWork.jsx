import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const PROJECTS = [
  {
    title: "Nova Finance",
    category: "Brand & Web Design",
    image: "https://motionsites.ai/assets/hero-grow-ai-preview-BlQ8tAQ-.gif",
  },
  {
    title: "Pulse Health",
    category: "AI Web Development",
    image: "https://motionsites.ai/assets/hero-evr-ventures-preview-DZxeVFEX.gif",
  },
  {
    title: "Drift Studios",
    category: "Website Optimization",
    image: "https://motionsites.ai/assets/hero-wealth-preview-B70idl_u.gif",
  },
  {
    title: "Arc Commerce",
    category: "Brand & Development",
    image: "https://motionsites.ai/assets/hero-neuralyn-preview-Br4FRDQA.gif",
  },
];

function ProjectCard({ project, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
    >
      {/* Image */}
      <div className="aspect-[4/3] liquid-glass rounded-2xl overflow-hidden mb-4">
        <img
          src={project.image}
          alt={project.title}
          className="w-full h-full object-cover"
        />
      </div>
      {/* Meta */}
      <h3
        className="text-xl font-medium text-foreground"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {project.title}
      </h3>
      <p
        className="text-sm text-muted-foreground mt-1"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {project.category}
      </p>
    </motion.div>
  );
}

export default function SelectedWork() {
  return (
    <section id="work" className="bg-background py-32 pb-16 px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <h2
          className="text-4xl md:text-5xl font-medium tracking-[-2px] text-center mb-4 text-foreground"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Selected{" "}
          <span
            className="italic font-normal"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Work
          </span>
        </h2>
        <p
          className="text-muted-foreground text-lg text-center max-w-2xl mx-auto mb-16"
          style={{ fontFamily: "var(--font-body)" }}
        >
          A curated collection of projects where bold design meets intelligent
          technology.
        </p>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PROJECTS.map((project, i) => (
            <ProjectCard key={project.title} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
