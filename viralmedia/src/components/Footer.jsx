const SERVICES = ["Brand Design", "AI Web Design", "AI Web Development", "Optimization"];
const COMPANY = ["About", "Work", "Blog", "Careers"];
const CONNECT = ["Twitter", "LinkedIn", "Instagram", "Dribbble"];

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border px-8 py-16">
      <div className="max-w-6xl mx-auto">
        {/* 4-col grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div>
            <span
              className="text-xl font-semibold tracking-tight text-foreground block mb-4"
              style={{ fontFamily: "var(--font-body)" }}
            >
              VIRALMEDIA
            </span>
            <p
              className="text-muted-foreground text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              AI-powered web design agency crafting digital experiences that
              convert.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4
              className="text-sm font-semibold text-foreground mb-4 tracking-wide uppercase"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Services
            </h4>
            <ul className="space-y-3">
              {SERVICES.map((s) => (
                <li key={s}>
                  <a
                    href="#"
                    className="text-muted-foreground text-sm hover:text-foreground transition-colors"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4
              className="text-sm font-semibold text-foreground mb-4 tracking-wide uppercase"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Company
            </h4>
            <ul className="space-y-3">
              {COMPANY.map((c) => (
                <li key={c}>
                  <a
                    href="#"
                    className="text-muted-foreground text-sm hover:text-foreground transition-colors"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4
              className="text-sm font-semibold text-foreground mb-4 tracking-wide uppercase"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Connect
            </h4>
            <ul className="space-y-3">
              {CONNECT.map((c) => (
                <li key={c}>
                  <a
                    href="#"
                    className="text-muted-foreground text-sm hover:text-foreground transition-colors"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p
            className="text-muted-foreground text-sm"
            style={{ fontFamily: "var(--font-body)" }}
          >
            © 2026 VIRALMEDIA. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-muted-foreground text-sm hover:text-foreground transition-colors"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-muted-foreground text-sm hover:text-foreground transition-colors"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
