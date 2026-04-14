import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Hls from "hls.js";

const HLS_SRC = "https://stream.mux.com/4IMYGcL01xjs7ek5ANO17JC4VQVUTsojZlnw4fXzwSxc.m3u8";

function HLSVideo() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: true });
      hls.loadSource(HLS_SRC);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = HLS_SRC;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
      });
    }
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}

export default function CTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative w-full h-screen overflow-hidden flex items-center justify-center z-10">
      {/* HLS Video BG */}
      <HLSVideo />

      {/* Top gradient */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent z-[1]" />
      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent z-[1]" />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30 z-[1]" />

      {/* Content */}
      <div ref={ref} className="relative z-10 text-center max-w-3xl mx-auto px-8">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-[-2px] mb-6 text-foreground"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Ready to{" "}
          <span
            className="italic font-normal"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            Transform
          </span>{" "}
          Your Brand?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="text-lg text-muted-foreground mb-10"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Let's build something extraordinary together.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.28, ease: "easeOut" }}
          className="flex items-center justify-center gap-4 flex-wrap"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-foreground text-background rounded-full px-10 py-4 text-sm font-semibold tracking-wide cursor-pointer"
            style={{ fontFamily: "var(--font-body)" }}
          >
            START A PROJECT
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="liquid-glass-strong rounded-full px-10 py-4 text-sm font-semibold tracking-wide text-foreground cursor-pointer"
            style={{ fontFamily: "var(--font-body)" }}
          >
            BOOK A CALL
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
