import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const TEXT =
  "We blend artificial intelligence with human creativity to craft digital experiences that captivate, convert, and scale — building ambitious brands that truly thrive and lead in the modern web.";

function ScrollRevealText({ text }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "start 0.3"],
  });

  const words = text.split(" ");

  return (
    <p
      ref={ref}
      className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-[-1px] leading-relaxed font-body text-center"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {words.map((word, i) => {
        const start = i / words.length;
        const end = (i + 1) / words.length;
        return (
          <WordSpan
            key={i}
            word={word}
            progress={scrollYProgress}
            start={start}
            end={end}
          />
        );
      })}
    </p>
  );
}

function WordSpan({ word, progress, start, end }) {
  const opacity = useTransform(progress, [start, end], [0.15, 1]);
  return (
    <motion.span
      style={{ opacity }}
      className="inline-block mr-[0.25em]"
    >
      {word}
    </motion.span>
  );
}

export default function About() {
  return (
    <section id="about" className="bg-background py-32 px-8">
      <div className="max-w-4xl mx-auto text-center">
        <ScrollRevealText text={TEXT} />
      </div>
    </section>
  );
}
