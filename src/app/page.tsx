"use client";

import { motion, Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

// ─── Animation Variants ───────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { delay: i * 0.12, duration: 0.8, ease: "easeOut" },
  }),
};

const navFade: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

// ─── Headline Words (animated word-by-word) ───────────────────────────────────

const headlineWords = ["Study", "smarter.", "Prove", "it."];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F4EC" }}>
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="relative z-20 flex items-center justify-between px-8 lg:px-16 py-6">
        {/* Logo mark */}
        <motion.div
          variants={navFade}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#2D2A26" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F8F4EC"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <span
              className="text-lg font-bold tracking-tight"
              style={{ color: "#2D2A26", fontFamily: "var(--font-space-mono)" }}
            >
              acers
            </span>
          </Link>
        </motion.div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-10">
          {["Features", "How it works", "Pricing"].map((label, i) => (
            <motion.a
              key={label}
              href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-sm font-medium transition-colors hover:opacity-70"
              style={{
                color: "#2D2A26",
                fontFamily: "var(--font-space-mono)",
              }}
              variants={navFade}
              initial="hidden"
              animate="visible"
              custom={i + 1}
            >
              {label}
            </motion.a>
          ))}
          <motion.div
            variants={navFade}
            initial="hidden"
            animate="visible"
            custom={4}
          >
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-bold transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{
                backgroundColor: "#2D2A26",
                color: "#F8F4EC",
                fontFamily: "var(--font-space-mono)",
              }}
            >
              Get started
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      <section className="relative px-8 lg:px-16 pt-8 lg:pt-16 pb-24 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-0 items-center max-w-[1400px] mx-auto">
          {/* ── Left Column: Text Content ─────────────────────────────────── */}
          <div className="flex flex-col justify-center space-y-8 lg:pr-16 z-10">
            {/* Eyebrow */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
            >
              <span
                className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
                style={{
                  backgroundColor: "#EDE8DE",
                  color: "#8A7D6B",
                  fontFamily: "var(--font-space-mono)",
                }}
              >
                Active recall, reimagined
              </span>
            </motion.div>

            {/* Headline (word-by-word animation) */}
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight"
              style={{
                color: "#2D2A26",
                fontFamily: "var(--font-space-mono)",
              }}
            >
              {headlineWords.map((word, i) => (
                <motion.span
                  key={word}
                  className="inline-block mr-4"
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={i + 1}
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            {/* Subheading */}
            <motion.p
              className="text-lg md:text-xl max-w-md leading-relaxed"
              style={{
                color: "#6B6358",
                fontFamily: "var(--font-geist-sans)",
              }}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={5}
            >
              Upload anything you&apos;re studying. We&apos;ll test you until
              you actually know it.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-wrap gap-4 pt-2"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={6}
            >
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-bold transition-all hover:scale-[1.03] active:scale-[0.97] shadow-lg"
                style={{
                  backgroundColor: "#2D2A26",
                  color: "#F8F4EC",
                  fontFamily: "var(--font-space-mono)",
                }}
              >
                Start studying free
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-bold transition-all hover:scale-[1.03] active:scale-[0.97] border-2"
                style={{
                  borderColor: "#2D2A26",
                  color: "#2D2A26",
                  fontFamily: "var(--font-space-mono)",
                }}
              >
                See how it works
              </a>
            </motion.div>
          </div>

          {/* ── Right Column: Hero Image ──────────────────────────────────── */}
          <motion.div
            className="relative lg:absolute lg:right-0 lg:top-0 lg:bottom-0 lg:w-[55%]"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            <div className="relative w-full h-[500px] lg:h-full overflow-hidden rounded-3xl lg:rounded-l-3xl lg:rounded-r-none">
              {/* Fallback image for users who prefer reduced motion */}
              <div className="absolute inset-0 hidden motion-reduce:block">
                <Image
                  src="/hero-study.jpg"
                  alt="Student studying at a warm, sunset-lit desk with books, a notebook, and coffee"
                  fill
                  priority
                  className="object-cover"
                  style={{
                    filter: "saturate(0.85) sepia(0.08) brightness(1.02)",
                  }}
                />
              </div>

              {/* The video for users with motion allowed */}
              <motion.div
                className="absolute inset-0 motion-reduce:hidden"
                animate={{
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 30,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{
                    filter: "saturate(0.85) sepia(0.08) brightness(1.02)",
                  }}
                >
                  <source src="/hero-study.mp4" type="video/mp4" />
                </video>
              </motion.div>

              {/* Warm glow overlay on lamp area */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 30% 40% at 35% 35%, rgba(255, 210, 120, 0.15), transparent 70%)",
                }}
                animate={{
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Left-edge gradient fade into page background (Desktop only) */}
              <div
                className="absolute inset-y-0 left-0 w-48 pointer-events-none hidden lg:block"
                style={{
                  background:
                    "linear-gradient(to right, #F8F4EC 0%, #F8F4EC80 40%, transparent 100%)",
                }}
              />

              {/* Top gradient fade into page background (Mobile only) */}
              <div
                className="absolute inset-x-0 top-0 h-24 pointer-events-none block lg:hidden"
                style={{
                  background:
                    "linear-gradient(to bottom, #F8F4EC 0%, #F8F4EC80 40%, transparent 100%)",
                }}
              />

              {/* Bottom subtle gradient for depth */}
              <div
                className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to top, #F8F4EC40 0%, transparent 100%)",
                }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features Section ───────────────────────────────────────────────── */}
      <section id="features" className="px-8 lg:px-16 py-24">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center space-y-4 mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
              style={{
                backgroundColor: "#EDE8DE",
                color: "#8A7D6B",
                fontFamily: "var(--font-space-mono)",
              }}
            >
              Features
            </span>
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{
                color: "#2D2A26",
                fontFamily: "var(--font-space-mono)",
              }}
            >
              Every tool to prove mastery
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                ),
                title: "Smart Study Workspace",
                description:
                  "Upload any material. Highlight, ask questions, and get instant AI explanations — all without leaving your reading flow.",
              },
              {
                icon: (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                ),
                title: "Recall Checkpoints",
                description:
                  "Timed interruptions that blur your material and ask you to recall what you just read. No more fake confidence.",
              },
              {
                icon: (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ),
                title: "3 Assessment Modes",
                description:
                  "Teach it back, spot AI hallucinations, or work through progressive cases. Each one tests a different dimension of mastery.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="rounded-2xl p-8 space-y-4 transition-all hover:scale-[1.02]"
                style={{ backgroundColor: "#FFFDF8" }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  delay: i * 0.15,
                  duration: 0.7,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "#EDE8DE", color: "#2D2A26" }}
                >
                  {feature.icon}
                </div>
                <h3
                  className="text-lg font-bold"
                  style={{
                    color: "#2D2A26",
                    fontFamily: "var(--font-space-mono)",
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#6B6358" }}
                >
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works Section ───────────────────────────────────────────── */}
      <section id="how-it-works" className="px-8 lg:px-16 py-24">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center space-y-4 mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              className="inline-block rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
              style={{
                backgroundColor: "#EDE8DE",
                color: "#8A7D6B",
                fontFamily: "var(--font-space-mono)",
              }}
            >
              How it works
            </span>
            <h2
              className="text-3xl md:text-4xl font-bold"
              style={{
                color: "#2D2A26",
                fontFamily: "var(--font-space-mono)",
              }}
            >
              Four steps to real learning
            </h2>
          </motion.div>

          <div className="space-y-12">
            {[
              {
                step: "01",
                title: "Upload your material",
                description:
                  "Drop a PDF or type a topic. We extract the key concepts so you can focus on learning, not organizing.",
              },
              {
                step: "02",
                title: "Study with an AI co-pilot",
                description:
                  "Read through your material in a smart workspace. Highlight anything confusing and get instant explanations.",
              },
              {
                step: "03",
                title: "Get tested when it matters",
                description:
                  "Recall checkpoints interrupt you at the right moments to make sure you're actually retaining — not just scrolling.",
              },
              {
                step: "04",
                title: "Prove you know it",
                description:
                  "Choose an assessment format: teach it back, spot hallucinations, or solve a progressive case study. Build your learning profile.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="flex gap-8 items-start"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  delay: i * 0.1,
                  duration: 0.7,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span
                  className="text-4xl font-bold shrink-0 w-16"
                  style={{
                    color: "#D4CFC5",
                    fontFamily: "var(--font-space-mono)",
                  }}
                >
                  {item.step}
                </span>
                <div className="space-y-2">
                  <h3
                    className="text-xl font-bold"
                    style={{
                      color: "#2D2A26",
                      fontFamily: "var(--font-space-mono)",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-base leading-relaxed max-w-lg"
                    style={{ color: "#6B6358" }}
                  >
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ────────────────────────────────────────────────────── */}
      <section className="px-8 lg:px-16 py-24">
        <motion.div
          className="max-w-3xl mx-auto text-center rounded-3xl p-12 md:p-16 space-y-8"
          style={{ backgroundColor: "#2D2A26" }}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{
              color: "#F8F4EC",
              fontFamily: "var(--font-space-mono)",
            }}
          >
            Stop re-reading.
            <br />
            Start proving.
          </h2>
          <p className="text-base max-w-md mx-auto" style={{ color: "#A39E94" }}>
            Join the students who are replacing passive studying with active
            recall and real assessments.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full px-10 py-4 text-sm font-bold transition-all hover:scale-[1.03] active:scale-[0.97]"
            style={{
              backgroundColor: "#F8F4EC",
              color: "#2D2A26",
              fontFamily: "var(--font-space-mono)",
            }}
          >
            Get started — it&apos;s free
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="px-8 lg:px-16 py-12 border-t" style={{ borderColor: "#E8E2D8" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ backgroundColor: "#2D2A26" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F8F4EC"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <span
              className="text-sm font-bold"
              style={{
                color: "#2D2A26",
                fontFamily: "var(--font-space-mono)",
              }}
            >
              acers
            </span>
          </div>
          <p className="text-sm" style={{ color: "#A39E94" }}>
            © {new Date().getFullYear()} Acers. Built for learners who want
            proof.
          </p>
        </div>
      </footer>
    </div>
  );
}
