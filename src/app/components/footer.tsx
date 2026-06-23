import { Github, Mail } from "lucide-react";
import { useLanguage } from "@/app/contexts/language-context";
import { Logo } from "@/app/components/logo";

export function Footer() {
  const { t } = useLanguage();
  const productLinks = [
    { label: t("footer.products.insight"), href: "/insight" },
    { label: t("footer.products.ads"), href: "/talent-reach" },
    { label: t("footer.products.credit"), href: "/points" },
  ];

  return (
    <footer className="bg-background px-4 pb-8 pt-14 text-muted-foreground sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <Logo className="size-8" />
              <span className="text-lg font-semibold leading-none">
                <span className="text-chart-2">Open</span>
                <span className="text-primary">Share</span>
              </span>
            </div>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              {t("footer.description")}
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/opensharehq"
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-9 items-center justify-center rounded-lg border border-border bg-card outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="GitHub"
              >
                <Github className="size-4" strokeWidth={1.5} />
              </a>
              <a
                href="mailto:contact@open-share.com"
                className="flex size-9 items-center justify-center rounded-lg border border-border bg-card outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Email"
              >
                <Mail className="size-4" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="mb-4 font-semibold text-foreground">{t("footer.products")}</h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 font-semibold text-foreground">{t("footer.company")}</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:contact@open-share.com"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {t("footer.company.contact")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              {t("footer.copyright")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("footer.slogan")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
