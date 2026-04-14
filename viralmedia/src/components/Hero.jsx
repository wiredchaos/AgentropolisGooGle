import { useState } from "react";
import { motion } from "framer-motion";

const AVATARS = [
  "https://i.pravatar.cc/40?img=1",
  "https://i.pravatar.cc/40?img=2",
  "https://i.pravatar.cc/40?img=3",
];

export default function Hero() {
  const [email, setEmail] = useState("");

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover object-bottom -translate-y-[100px] md:translate-y-0"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260326_073936_8dd07fdb-4f6b-4220-a3f0-9dedfaab0c88.mp4"
          type="video/mp4"
        />
      </video>

      {/* Bottom gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-background to-transparent z-[1]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full px-8 pb-10 md:pb-20 max-w-6xl mx-auto">
        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex items-center gap-3 mb-5"
        >
          <div className="flex -space-x-2">
            {AVATARS.map((src, i) => (
              <img
                key={i}
                src={src}
                alt="brand avatar"
                className="w-8 h-8 rounded-full border-2 border-background object-cover"
              />
            ))}
          </div>
          <span className="text-muted-foreground text-sm" style={{ fontFamily: "var(--font-body)" }}>
            7,000+ brands already transformed
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-[-1px] md:tracking-[-2px] text-foreground mb-4 leading-tight"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Build Stunning with{" "}
          <span
            className="italic font-normal"
            style={{ fontFamily: "var(--font-accent)" }}
          >
            AI Magic
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-sm md:text-lg text-muted-foreground whitespace-normal md:whitespace-nowrap mb-8"
          style={{ fontFamily: "var(--font-body)" }}
        >
          AI-powered websites crafted for beauty, speed, and lasting performance.
        </motion.p>

        {/* Email form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="liquid-glass rounded-full p-1.5 md:p-2 max-w-lg w-full flex items-center gap-2"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm px-4 outline-none border-none"
            style={{ fontFamily: "var(--font-body)" }}
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="bg-foreground text-background rounded-full px-6 py-2.5 text-sm font-semibold shrink-0 cursor-pointer"
            style={{ fontFamily: "var(--font-body)" }}
          >
            SUBSCRIBE
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
