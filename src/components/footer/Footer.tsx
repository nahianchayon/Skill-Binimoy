import { Github, Linkedin, Twitter, Youtube } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";

const columns = [
  {
    title: "About",
    links: ["Our story", "Careers", "Press", "Impact report"],
  },
  {
    title: "Resources",
    links: ["Guides", "Skill blog", "Mentor handbook", "Frequently Asked Questions (FAQ)"],
  },
  {
    title: "Community",
    links: ["Events", "Ambassadors", "Forums", "Leaderboard"],
  },
  {
    title: "Support",
    links: ["Contact", "Help Center & FAQ", "Trust & safety", "Status"],
  },
  {
    title: "Legal",
    links: ["Privacy policy", "Terms of service", "Cookies", "Licenses"],
  },
];

const socials = [
  { label: "Twitter", Icon: Twitter },
  { label: "LinkedIn", Icon: Linkedin },
  { label: "GitHub", Icon: Github },
  { label: "YouTube", Icon: Youtube },
];

export function Footer() {
  return (
    <footer className="bg-surface border-t">
      <div className="container-x py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              Skill Binimoy is a knowledge exchange network where teaching is currency and
              reputation is portable.
            </p>

            <form
              className="mt-8"
              onSubmit={(e) => {
                e.preventDefault();
                toast.success("You're subscribed", {
                  description: "Weekly skill drops land in your inbox every Tuesday.",
                });
                (e.currentTarget as HTMLFormElement).reset();
              }}
            >
              <label htmlFor="newsletter" className="text-sm font-semibold">
                Newsletter
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="newsletter"
                  type="email"
                  required
                  placeholder="you@email.com"
                  className="bg-background border-border focus:border-primary/50 focus:ring-primary/20 h-11 min-w-0 flex-1 rounded-xl border px-4 text-sm outline-none focus:ring-4"
                />
                <Button type="submit" variant="hero">
                  Subscribe
                </Button>
              </div>
            </form>

            <ul className="mt-8 flex gap-2">
              {socials.map(({ label, Icon }) => (
                <li key={label}>
                  <a
                    href="#"
                    aria-label={label}
                    className="border-border text-muted-foreground hover:border-primary/40 hover:text-primary grid size-11 place-items-center rounded-xl border transition-colors"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-bold">{col.title}</h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      {link.includes("FAQ") ? (
                        <Link
                          to="/faq"
                          className="text-muted-foreground hover:text-primary text-sm transition-colors"
                        >
                          {link}
                        </Link>
                      ) : (
                        <a
                          href="#"
                          className="text-muted-foreground hover:text-primary text-sm transition-colors"
                        >
                          {link}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-border text-muted-foreground mt-14 flex flex-col gap-3 border-t pt-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Skill Binimoy. All rights reserved.</p>
          <p>Learn. Teach. Grow Together.</p>
        </div>
      </div>
    </footer>
  );
}
