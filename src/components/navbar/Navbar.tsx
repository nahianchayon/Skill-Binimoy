import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Explore", hash: "#categories" },
  { label: "Categories", hash: "#categories" },
  { label: "Teach", hash: "#how-it-works" },
  { label: "Community", hash: "#testimonials" },
  { label: "About", hash: "#features" },
  { label: "FAQ", to: "/faq" },
  { label: "Contact", hash: "#cta" },
];

const notifications = [
  { title: "New session request", body: "Tanvir Hasan wants to swap Go for UI design." },
  { title: "Course milestone", body: "You completed 60% of Design Systems that Scale." },
  { title: "Reputation up", body: "You earned the Mentor Level 2 badge." },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "glass shadow-soft border-b" : "border-b border-transparent bg-transparent",
      )}
    >
      <nav className="container-x flex h-18 items-center gap-4" aria-label="Main">
        <Logo />

        <ul className="ml-4 hidden items-center gap-1 xl:flex">
          {navItems.map((item) => (
            <li key={item.label}>
              {item.to ? (
                <Link
                  to={item.to}
                  activeOptions={{ exact: true }}
                  activeProps={{ className: "text-primary" }}
                  className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  href={item.hash}
                  className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <label className="relative hidden lg:block">
            <span className="sr-only">Search skills, mentors and courses</span>
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search skills…"
              className="bg-surface/70 border-border focus:border-primary/50 focus:ring-primary/20 h-10 w-56 rounded-xl border pr-3 pl-9 text-sm transition-all outline-none focus:w-64 focus:ring-4"
            />
          </label>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={toggle}
          >
            {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Notifications"
                className="relative"
              >
                <Bell aria-hidden="true" />
                <span className="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 rounded-2xl">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.map((n) => (
                <DropdownMenuItem
                  key={n.title}
                  className="flex-col items-start gap-1 rounded-xl py-2.5"
                >
                  <span className="text-sm font-semibold">{n.title}</span>
                  <span className="text-muted-foreground text-xs">{n.body}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden items-center gap-2 sm:flex">
            <Button variant="ghost" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button variant="hero" asChild>
              <Link to="/login">Sign up</Link>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            className="xl:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass overflow-hidden border-t xl:hidden"
          >
            <ul className="container-x flex flex-col gap-1 py-4">
              {navItems.map((item) => (
                <li key={item.label}>
                  {item.to ? (
                    <Link
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="hover:bg-accent block rounded-xl px-4 py-3 text-sm font-medium"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      href={item.hash ?? "/"}
                      onClick={() => setOpen(false)}
                      className="hover:bg-accent block rounded-xl px-4 py-3 text-sm font-medium"
                    >
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
              <li className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="outline" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button variant="hero" asChild>
                  <Link to="/login">Sign up</Link>
                </Button>
              </li>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
