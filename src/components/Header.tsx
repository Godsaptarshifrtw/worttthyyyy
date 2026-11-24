import React, { useState, useEffect } from "react";
import { Activity, Menu, X, Target } from "lucide-react";
import Button from "./ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);

      // Update active section based on scroll position
      const sections = ["ats-optimizer", "features", "job-seekers", "companies"];
      const currentSection = sections.find((section) => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        }
        return false;
      });

      setActiveSection(currentSection || "");
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#ats-optimizer", label: "ATS Optimizer" },
    { href: "#features", label: "Features" },
    { href: "#job-seekers", label: "For Job Seekers" },
    { href: "#companies", label: "For Companies" },
  ];

  return (
    <header
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white shadow-lg py-3"
          : "bg-gradient-to-r from-blue-600 to-indigo-600 py-5"
      }`}
    >
      <div className="container mx-auto px-4 flex justify-between items-center">
        <motion.div
          className="flex items-center"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <Activity
            className={`h-8 w-8 ${
              isScrolled ? "text-blue-600" : "text-white"
            } mr-2`}
          />
          <Link
            to="/"
            className={`font-semibold text-xl ${
              isScrolled ? "text-slate-800" : "text-white"
            }`}
          >
            Worthy.ai
          </Link>
        </motion.div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`relative font-medium ${
                isScrolled
                  ? "text-slate-700 hover:text-blue-600"
                  : "text-white/90 hover:text-white"
              } transition-colors ${
                activeSection === link.href.slice(1)
                  ? isScrolled
                    ? "text-blue-600"
                    : "text-white"
                  : ""
              }`}
            >
              {link.label}
              {activeSection === link.href.slice(1) && (
                <motion.div
                  layoutId="activeSection"
                  className={`absolute -bottom-1 left-0 right-0 h-0.5 ${
                    isScrolled ? "bg-blue-600" : "bg-white"
                  }`}
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-3">
          <Link
            to="/dashboard"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              isScrolled
                ? "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                : "bg-white/20 text-white hover:bg-white/30 border border-white/30 backdrop-blur-xs"
            }`}
          >
            <Target className="h-4 w-4" />
            ATS Optimizer
            <span className="text-2xs px-1.5 py-0.5 rounded-full bg-purple-600 text-white font-bold uppercase tracking-wider">
              AI
            </span>
          </Link>

          <Link to="/dashboard">
            <Button
              variant={isScrolled ? "primary" : "white"}
              size="sm"
              className={
                isScrolled ? "" : "bg-white text-blue-600 hover:bg-blue-50"
              }
            >
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className={`md:hidden p-2 transition-colors ${
            isScrolled
              ? "text-slate-700 hover:text-blue-600"
              : "text-white hover:text-white/80"
          }`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`md:hidden ${
              isScrolled
                ? "bg-white border-t border-slate-100"
                : "bg-blue-700 border-t border-blue-600"
            }`}
          >
            <nav className="container mx-auto px-4 py-4 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`block py-2 font-medium transition-colors ${
                    isScrolled
                      ? "text-slate-700 hover:text-blue-600"
                      : "text-white/90 hover:text-white"
                  } ${
                    activeSection === link.href.slice(1)
                      ? isScrolled
                        ? "text-blue-600"
                        : "text-white"
                      : ""
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 space-y-3">
                <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant={isScrolled ? "primary" : "white"}
                    size="sm"
                    className={`w-full ${
                      isScrolled
                        ? ""
                        : "bg-white text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    Dashboard
                  </Button>
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
