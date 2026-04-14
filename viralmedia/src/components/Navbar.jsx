import { motion } from "framer-motion";

const NAV_LINKS = ["Work", "Services", "About", "Blog", "Contact"];

export default function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6"
    >
      {/* Logo */}
      <span className="text-xl font-semibold tracking-tight text-foreground" style={{ fontFamily: "var(--font-body)" }}>
        VIRALMEDIA
      </span>

      {/* Nav Links — hidden on mobile */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map((link) => (
          <a
            key={link}
            href={`#${link.toLowerCase()}`}
            className="px-4 py-2 text-sm font-medium text-foreground rounded-sm hover:bg-white/10 transition-colors"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {link}
          </a>
        ))}
      </div>

      {/* CTA Button */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="liquid-glass-strong rounded-full px-6 py-2.5 text-sm font-medium text-foreground cursor-pointer"
        style={{ fontFamily: "var(--font-body)" }}
      >
        Get Started
      </motion.button>
    </motion.nav>
  );
}
