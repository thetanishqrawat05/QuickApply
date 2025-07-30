import { Link, useLocation } from "wouter";
import { Logo } from "./logo";
import { Button } from "./button";
import { Badge } from "./badge";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/", description: "Enhanced Auto Apply" },
  { name: "Basic Apply", href: "/basic-apply", description: "Simple application tool" },
  { name: "Manual Apply", href: "/auto-apply", description: "Step-by-step workflow" },
  { name: "Enhanced Apply", href: "/enhanced-apply", description: "Email approval system" },
];

export function ModernHeader() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <Logo size="md" className="hover:scale-105 transition-transform duration-200" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "relative h-9 px-4 text-sm font-medium transition-colors",
                      isActive && "gradient-primary text-white shadow-medium"
                    )}
                  >
                    {item.name}
                    {isActive && (
                      <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                    )}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <Badge
              variant="secondary"
              className="px-3 py-1 text-xs font-medium bg-accent/50 text-accent-foreground border-0"
            >
              ✨ AI-Powered
            </Badge>
            <Button
              size="sm"
              className="gradient-primary shadow-medium hover:shadow-strong transition-all duration-200 pulse-glow"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-card/95 backdrop-blur-sm rounded-lg mt-2 shadow-medium border border-border/40">
              {navigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start text-left",
                        isActive && "gradient-primary text-white"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs opacity-70">{item.description}</span>
                      </div>
                    </Button>
                  </Link>
                );
              })}
              <div className="pt-2 border-t border-border/40">
                <Button
                  size="sm"
                  className="w-full gradient-primary shadow-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}