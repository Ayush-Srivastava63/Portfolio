import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════
   PRELOADER — Molecular structure drawing animation
   ═══════════════════════════════════════════════════════════ */
function Preloader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('drawing'); // drawing → text → fade

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setPhase('fade');
          setTimeout(() => onComplete(), 800);
          return 100;
        }
        return prev + 1.5;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [onComplete]);

  // Benzene ring + side chains for chemical engineering theme
  const molecules = [
    // Hexagonal ring (benzene)
    { x1: 150, y1: 80, x2: 185, y2: 60 },
    { x1: 185, y1: 60, x2: 220, y2: 80 },
    { x1: 220, y1: 80, x2: 220, y2: 120 },
    { x1: 220, y1: 120, x2: 185, y2: 140 },
    { x1: 185, y1: 140, x2: 150, y2: 120 },
    { x1: 150, y1: 120, x2: 150, y2: 80 },
    // Side chains
    { x1: 150, y1: 80, x2: 115, y2: 60 },
    { x1: 115, y1: 60, x2: 80, y2: 80 },
    { x1: 220, y1: 80, x2: 255, y2: 60 },
    { x1: 255, y1: 60, x2: 280, y2: 40 },
    { x1: 220, y1: 120, x2: 260, y2: 140 },
    { x1: 260, y1: 140, x2: 300, y2: 130 },
    { x1: 150, y1: 120, x2: 115, y2: 145 },
    { x1: 115, y1: 145, x2: 75, y2: 140 },
    { x1: 185, y1: 140, x2: 185, y2: 180 },
    { x1: 185, y1: 180, x2: 220, y2: 200 },
  ];

  const nodes = [
    { cx: 150, cy: 80 }, { cx: 185, cy: 60 }, { cx: 220, cy: 80 },
    { cx: 220, cy: 120 }, { cx: 185, cy: 140 }, { cx: 150, cy: 120 },
    { cx: 115, cy: 60 }, { cx: 80, cy: 80 }, { cx: 255, cy: 60 },
    { cx: 280, cy: 40 }, { cx: 260, cy: 140 }, { cx: 300, cy: 130 },
    { cx: 115, cy: 145 }, { cx: 75, cy: 140 }, { cx: 185, cy: 180 },
    { cx: 220, cy: 200 },
  ];

  const loadingText = 'LOADING';
  const splitIndex = Math.floor((progress / 100) * loadingText.length);

  return (
    <div className={`preloader ${phase === 'fade' ? 'hidden' : ''}`}>
      <svg className="preloader-molecule" viewBox="0 0 380 240">
        {molecules.map((mol, i) => {
          const lineProgress = Math.min(1, Math.max(0, (progress - (i * 4)) / 15));
          return (
            <line
              key={i}
              x1={mol.x1} y1={mol.y1}
              x2={mol.x2} y2={mol.y2}
              style={{
                strokeDashoffset: 100 - (lineProgress * 100),
                stroke: `rgba(255,255,255,${0.15 + lineProgress * 0.25})`,
              }}
            />
          );
        })}
        {nodes.map((node, i) => {
          const nodeProgress = Math.min(1, Math.max(0, (progress - (i * 3)) / 20));
          return (
            <circle
              key={i}
              cx={node.cx} cy={node.cy}
              r={2.5}
              style={{
                opacity: nodeProgress,
                fill: `rgba(255,255,255,${0.3 + nodeProgress * 0.3})`,
              }}
            />
          );
        })}
      </svg>
      <div className="preloader-text">
        <span>{loadingText.slice(0, splitIndex)}</span>
        {loadingText.slice(splitIndex)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   3D MOLECULE CANVAS — Interactive reactor/molecule visual
   ═══════════════════════════════════════════════════════════ */
function MoleculeCanvas({ width = 400, height = 400 }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // Create particles in a sphere shape
    const particles = [];
    const numParticles = 200;
    for (let i = 0; i < numParticles; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 100 + Math.random() * 20;
      particles.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        origR: r,
        theta,
        phi,
        size: 1 + Math.random() * 2,
      });
    }

    // Hexagonal surface points
    const hexPoints = [];
    for (let i = 0; i < 80; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 95;
      hexPoints.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
      });
    }

    let time = 0;

    function render() {
      time += 0.008;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const rotX = time * 0.3 + mouseRef.current.y * 0.002;
      const rotY = time * 0.5 + mouseRef.current.x * 0.002;

      // Project and draw particles
      const projected = particles.map((p, i) => {
        // Rotate
        let x = p.x, y = p.y, z = p.z;
        // Rotate Y
        let x2 = x * Math.cos(rotY) - z * Math.sin(rotY);
        let z2 = x * Math.sin(rotY) + z * Math.cos(rotY);
        // Rotate X
        let y2 = y * Math.cos(rotX) - z2 * Math.sin(rotX);
        let z3 = y * Math.sin(rotX) + z2 * Math.cos(rotX);

        const scale = 300 / (300 + z3);
        return {
          px: cx + x2 * scale,
          py: cy + y2 * scale,
          z: z3,
          scale,
          size: p.size * scale,
          index: i,
        };
      });

      // Sort by z-depth
      projected.sort((a, b) => a.z - b.z);

      // Draw connections between nearby particles
      ctx.lineWidth = 0.3;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].px - projected[j].px;
          const dy = projected[i].py - projected[j].py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 40) {
            const alpha = (1 - dist / 40) * 0.15;
            ctx.strokeStyle = `rgba(140, 160, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(projected[i].px, projected[i].py);
            ctx.lineTo(projected[j].px, projected[j].py);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      projected.forEach(p => {
        const alpha = 0.3 + (p.z + 120) / 240 * 0.5;
        const blueChannel = 180 + Math.floor((p.z + 120) / 240 * 75);
        ctx.fillStyle = `rgba(100, 140, ${blueChannel}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Glow effect at center
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 130);
      gradient.addColorStop(0, 'rgba(80, 120, 200, 0.08)');
      gradient.addColorStop(0.5, 'rgba(60, 100, 180, 0.03)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      animRef.current = requestAnimationFrame(render);
    }

    render();

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      };
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [width, height]);

  return <canvas ref={canvasRef} style={{ width, height }} />;
}

/* ═══════════════════════════════════════════════════════════
   PROJECT CARD VISUAL — Animated canvas backgrounds
   ═══════════════════════════════════════════════════════════ */
function ProjectVisual({ type, width = 500, height = 300 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    let time = 0;

    function renderCSTR() {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Reactor vessel outline
      ctx.strokeStyle = 'rgba(230, 57, 70, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(width * 0.3, height * 0.15, width * 0.4, height * 0.7, 20);
      ctx.stroke();

      // Stirrer
      const stirrerY = height * 0.5;
      ctx.save();
      ctx.translate(width * 0.5, stirrerY);
      ctx.rotate(time * 3);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.lineTo(30, 0);
      ctx.moveTo(-20, -8);
      ctx.lineTo(-20, 8);
      ctx.moveTo(20, -8);
      ctx.lineTo(20, 8);
      ctx.stroke();
      ctx.restore();

      // Particles flowing inside reactor
      for (let i = 0; i < 30; i++) {
        const angle = time * 2 + (i / 30) * Math.PI * 2;
        const r = 30 + Math.sin(time + i) * 20;
        const px = width * 0.5 + Math.cos(angle) * r;
        const py = height * 0.5 + Math.sin(angle) * r * 0.6;
        const alpha = 0.3 + Math.sin(time + i * 0.5) * 0.2;
        ctx.fillStyle = `rgba(230, 57, 70, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Inlet pipe
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.3);
      ctx.lineTo(width * 0.3, height * 0.3);
      ctx.stroke();

      // Outlet pipe
      ctx.beginPath();
      ctx.moveTo(width * 0.7, height * 0.7);
      ctx.lineTo(width, height * 0.7);
      ctx.stroke();

      // Flow arrows on inlet
      for (let i = 0; i < 3; i++) {
        const x = ((time * 40 + i * 50) % (width * 0.3));
        ctx.fillStyle = 'rgba(100, 160, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(x, height * 0.3, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Temperature indicator
      ctx.fillStyle = 'rgba(230, 57, 70, 0.15)';
      const tempHeight = height * 0.5 * (0.6 + Math.sin(time * 0.5) * 0.2);
      ctx.fillRect(width * 0.75, height * 0.85 - tempHeight, 8, tempHeight);

      animRef.current = requestAnimationFrame(renderCSTR);
    }

    function renderHeatConduction() {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      const cols = 25;
      const rows = 12;
      const cellW = width / cols;
      const cellH = height / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Temperature distribution: hot on left, cool on right, time-varying
          const x = c / cols;
          const y = r / rows;
          const temp = Math.exp(-x * 2) * Math.sin(Math.PI * y) *
            (1 - Math.exp(-time * 0.5)) +
            Math.sin(time + x * 3) * 0.1;
          const normalizedTemp = Math.max(0, Math.min(1, temp));

          // Hot = red, cold = blue
          const red = Math.floor(normalizedTemp * 230);
          const blue = Math.floor((1 - normalizedTemp) * 180);
          const alpha = 0.3 + normalizedTemp * 0.5;

          ctx.fillStyle = `rgba(${red}, ${Math.floor(normalizedTemp * 50)}, ${blue}, ${alpha})`;
          ctx.fillRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
        }
      }

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 0.5;
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cellW, 0);
        ctx.lineTo(c * cellW, height);
        ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * cellH);
        ctx.lineTo(width, r * cellH);
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(renderHeatConduction);
    }

    if (type === 'cstr') renderCSTR();
    else renderHeatConduction();

    return () => cancelAnimationFrame(animRef.current);
  }, [type, width, height]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}

/* ═══════════════════════════════════════════════════════════
   SCROLL REVEAL — Wrapper component for scroll animations
   ═══════════════════════════════════════════════════════════ */
function Reveal({ children, delay = 0, direction = 'up' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const variants = {
    hidden: {
      opacity: 0,
      y: direction === 'up' ? 60 : direction === 'down' ? -60 : 0,
      x: direction === 'left' ? 60 : direction === 'right' ? -60 : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════ */
function Navbar({ onMenuOpen }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      className="navbar"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      style={{
        background: scrolled ? 'rgba(14, 16, 40, 0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'background 0.4s ease, backdrop-filter 0.4s ease',
      }}
    >
      <a href="#top" className="nav-logo">
        <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill="var(--red)" />
          <circle cx="24" cy="16" r="6" fill="var(--navy-dark)" />
          <path d="M20 16 L16 34 Q24 40 32 34 L28 16" fill="var(--navy-dark)" />
          <circle cx="24" cy="30" r="3" fill="var(--red)" />
        </svg>
      </a>

      <div className="nav-center">

      </div>

      <div className="nav-toggle" onClick={onMenuOpen}>
        <span className="nav-toggle-line" />
        <span className="nav-toggle-dot" />
        <span className="nav-toggle-line" style={{ height: '10px' }} />
      </div>
    </motion.nav>
  );
}

/* ═══════════════════════════════════════════════════════════
   MOBILE MENU
   ═══════════════════════════════════════════════════════════ */
function MobileMenu({ isOpen, onClose }) {
  const links = [
    { label: 'About', href: '#about' },
    { label: 'Projects', href: '#projects' },
    { label: 'Skills', href: '#skills' },
    { label: 'Education', href: '#education' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <div className={`mobile-menu ${isOpen ? 'open' : ''}`}>
      <button className="mobile-menu-close" onClick={onClose}>✕</button>
      {links.map((link, i) => (
        <motion.a
          key={link.label}
          href={link.href}
          onClick={onClose}
          initial={{ opacity: 0, y: 30 }}
          animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
        >
          {link.label}
        </motion.a>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════════════════════ */
function HeroSection() {
  return (
    <section className="hero" id="top">
      <div className="hero-grid">
        <motion.div
          className="hero-title hero-title-chemical"
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          AYUSH RAJ
        </motion.div>

        <motion.div
          className="hero-title hero-title-engineer"
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          CHEMICAL
        </motion.div>

        <motion.div
          className="hero-title hero-title-portfolio"
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          ENGINEER.
        </motion.div>

        <motion.div
          className="hero-canvas-area"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.8 }}
        >
          <MoleculeCanvas width={380} height={380} />
        </motion.div>
      </div>

      <motion.div
        className="hero-bottom"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <a
          className="hero-latest-project"
          href="https://drive.google.com/file/d/1a8HtN44EB91p6S_ufd1INBM60AYOtIS9/view?usp=sharing" target="_blank"
        >
          <span>Download Resume</span>
          <span className="arrow">→</span>
          <span>pdf</span>

        </a>

        <div className="hero-description">
          B.Tech Chemical Engineering at NIT Hamirpur. Focused on process simulation,
          reactor design, and numerical modeling of complex chemical systems.
        </div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   ABOUT SECTION
   ═══════════════════════════════════════════════════════════ */
function AboutSection() {
  return (
    <section className="about-section" id="about">
      <div className="about-inner">
        <div>
          <Reveal>
            <div className="about-label">
              <span className="dot" />
              <span>About</span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="about-left-text">
              Currently pursuing B.Tech
              in Chemical Engineering
              at NIT Hamirpur with
              CGPA 8.08, building
              hands-on expertise in
              process simulation.
            </div>
          </Reveal>
        </div>

        <div>
          <Reveal delay={0.2}>
            <h2 className="about-statement">
              Passionate about process modeling, numerical analysis, and reactor design
              turning theoretical chemical engineering into practical simulations that solve
              real-world problems.
            </h2>
          </Reveal>
          <Reveal delay={0.4}>
            <div className="about-links">
              <a className="about-link" href="#education">Education</a>
              <a className="about-link" href="#skills">Skills</a>
              <a className="about-link" href="#projects">Projects</a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROJECTS SECTION
   ═══════════════════════════════════════════════════════════ */
function ProjectsSection() {
  const projects = [
    {
      number: '01',
      title: 'CSTR Steady-State Design Simulator',
      subtitle: 'Saponification Reaction',
      platform: 'Python',
      bullets: [
        'Developed a steady-state CSTR simulator for saponification of ethyl acetate',
        'Evaluated residence time, reactor volume, and reaction rates as functions of conversion',
        'Optimized operating temperature by integrating Arrhenius kinetics',
      ],
      tags: ['Python', 'Arrhenius Kinetics', 'Numerical Methods'],
      link: 'https://github.com/Ayush-Srivastava63/cstr',
    },
    {
      number: '02',
      title: 'Transient Heat Conduction Simulation',
      subtitle: 'Numerical Modeling',
      platform: 'MATLAB',
      bullets: [
        'Implemented finite difference method to solve 1-D transient heat conduction equation',
        'Developed MATLAB scripts to compute temperature distribution over time',
        'Validated stability criteria under different boundary conditions',
      ],
      tags: ['MATLAB', 'Finite Difference', 'PDE'],
      link: 'https://github.com/Ayush-Srivastava63/Transient-Heat-Conduction',
    },
  ];

  return (
    <section className="projects-section" id="projects">
      <div className="projects-inner">
        <Reveal>
          <div className="projects-header">
            <h2 className="section-header">
              PROJECTS<span className="accent">.</span>
            </h2>
          </div>
        </Reveal>

        <div className="projects-list">
          {projects.map((project, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div className="project-item">
                <div className="project-item-header">
                  <div className="project-item-number">{project.number}</div>
                  <div className="project-item-meta">
                    <h3 className="project-item-title">{project.title}</h3>
                    <div className="project-item-subtitle">{project.subtitle} — {project.platform}</div>
                  </div>
                  <a href={project.link} className="project-item-link" target="_blank" rel="noopener noreferrer">
                    View Github <span>→</span>
                  </a>
                </div>
                <div className="project-item-body">
                  <ul className="project-item-bullets">
                    {project.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                  <div className="project-item-tags">
                    {project.tags.map(tag => (
                      <span key={tag} className="project-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   SKILLS SECTION
   ═══════════════════════════════════════════════════════════ */
function SkillsSection() {
  const categories = [
    {
      number: '01',
      title: 'Core Concepts',
      text: 'Material & Energy Balances, VLE, Distillation, Heat Exchanger Design, Transient Heat Conduction.',
      items: ['Material & Energy Balances', 'VLE', 'Distillation', 'Heat Exchanger Design', 'Transient Conduction'],
    },
    {
      number: '02',
      title: 'Software',
      text: 'Industry-standard simulation tools for process modeling, analysis, and design.',
      items: ['Aspen Plus', 'DWSIM', 'Aspen HYSYS', 'MATLAB', 'MS Excel (Solver, Data Analysis)'],
    },
    {
      number: '03',
      title: 'Programming',
      text: 'Computational methods for numerical analysis and engineering problem solving.',
      items: ['MATLAB (Numerical Methods)', 'Python'],
    },
    {
      number: '04',
      title: 'Engineering Tools',
      text: 'Process design documentation and simulation workflows.',
      items: ['Process Flow Diagrams (PFD)', 'Basic Process Simulation'],
    },
  ];

  return (
    <section className="skills-section" id="skills">
      <div className="skills-inner">
        <Reveal>
          <div className="skills-static-header">
            <h2 className="section-header">
              TECHNICAL SKILLS<span className="accent">.</span>
            </h2>
          </div>
        </Reveal>

        <div className="skills-grid">
          {categories.map((cat, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="skill-card">
                <div className="skill-card-number">{cat.number}</div>
                <div className="skill-card-title">{cat.title}</div>
                <div className="skill-card-text">{cat.text}</div>
                <div className="skill-card-items">
                  {cat.items.map(item => (
                    <span key={item} className="skill-item">{item}</span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   CERTIFICATIONS SECTION
   ═══════════════════════════════════════════════════════════ */
function CertificationsSection() {
  const certs = [
    {
      number: '01',
      title: 'APA Group — Engineering for New Energy',
      platform: 'View Certificate',
      description: 'Solar PV plant concept design, engineering documentation, technical review & safety evaluation for renewable energy integration.',
      link: 'https://drive.google.com/file/d/1RkOKyk-aCAX2ekDlWIGqoFxl0VHnGoAp/view?usp=sharing',
    },
    {
      number: '02',
      title: 'Siemens Mobility — Operations Industrial Engineer',
      platform: 'View Certificate',
      description: 'Manufacturing workflow optimization, facility layout design, and industrial engineering principles for high-speed rail production systems.',
      link: 'https://drive.google.com/file/d/1xSmanBm7YCt6D12v766EE2FJcgtT-Lmo/view?usp=sharing',
    },
  ];

  return (
    <section className="certs-section" id="certifications">
      <div className="certs-inner">
        <Reveal>
          <div className="certs-header">
            <h2 className="section-header">
              CERTIFICATIONS<span className="accent">.</span>
            </h2>
          </div>
        </Reveal>

        <div className="certs-list">
          {certs.map((cert, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <a href={cert.link} className="cert-item" target="_blank" rel="noopener noreferrer">
                <div className="cert-number">{cert.number}</div>
                <div className="cert-content">
                  <h3>{cert.title}</h3>
                  <p>{cert.description}</p>
                </div>
                <div className="cert-link">
                  {cert.platform} <span>→</span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   ACHIEVEMENTS SECTION
   ═══════════════════════════════════════════════════════════ */
function AchievementsSection() {
  const items = [
    {
      icon: '',
      title: 'Simulation Projects',
      text: 'Completed multiple simulation-based projects in Aspen Plus and MATLAB, strengthening practical understanding of process modeling and numerical analysis.',
    },
    {
      icon: '',
      title: 'Process Experimentation',
      text: 'Analyzed experimental data from heat exchanger, distillation, and fluid flow setups using engineering correlations and material balance principles.',
    },
    {
      icon: '',
      title: 'Technical Engagement',
      text: 'Actively participated in multiple technical workshops on process simulation, energy systems, and computational tools beyond academic curriculum.',
    },
  ];

  return (
    <section className="achievements-section" id="achievements">
      <div className="achievements-inner">
        <Reveal>
          <div className="achievements-header">
            <h2 className="section-header">
              ACHIEVEMENTS<span className="accent">.</span>
            </h2>
          </div>
        </Reveal>

        <div className="achievements-grid">
          {items.map((item, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div className="achievement-card">
                <div className="achievement-icon">{item.icon}</div>
                <div className="achievement-title">{item.title}</div>
                <div className="achievement-text">{item.text}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   EDUCATION SECTION
   ═══════════════════════════════════════════════════════════ */
function EducationSection() {
  const coursework = [
    'Chemical Process Calculations',
    'Thermodynamics',
    'Fluid Mechanics',
    'Heat Transfer',
    'Mass Transfer',
    'Engineering Mathematics',
  ];

  return (
    <section className="education-section" id="education">
      <div className="education-inner">
        <Reveal>
          <div className="education-header">
            <h2 className="section-header">
              EDUCATION<span className="accent">.</span>
            </h2>
          </div>
        </Reveal>

        <div className="education-content">
          <Reveal delay={0.1}>
            <div className="education-card">
              <div className="education-card-label">Institute</div>
              <div className="education-card-title">NIT Hamirpur</div>
              <div className="education-card-subtitle">B.Tech in Chemical Engineering</div>
              <div className="education-details">
                <div className="edu-detail">
                  <span className="edu-detail-label">CGPA</span>
                  <span className="edu-detail-value"><span className="highlight">8.08</span></span>
                </div>
                <div className="edu-detail">
                  <span className="edu-detail-label">Duration</span>
                  <span className="edu-detail-value">Aug 2024 — July 2028</span>
                </div>
                <div className="edu-detail">
                  <span className="edu-detail-label">Location</span>
                  <span className="edu-detail-value">Hamirpur, India</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="education-card">
              <div className="education-card-label">Coursework</div>
              <div className="coursework-card-title">Relevant Subjects</div>
              <div className="coursework-grid">
                {coursework.map(course => (
                  <span key={course} className="coursework-item">{course}</span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONTACT / FOOTER SECTION
   ═══════════════════════════════════════════════════════════ */
function ContactSection() {
  return (
    <>
      <section className="contact-section" id="contact">
        <div className="contact-inner">
          <Reveal>
            <a href="mailto:oiuiuoi@gmail.com" className="contact-title">
              LET'S TALK
            </a>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="contact-links">
              <a href="mailto:oiuiuoi@gmail.com" className="contact-link-item">Email</a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="contact-link-item">LinkedIn</a>
              {/* <a href="tel:+9187979878" className="contact-link-item">Phone</a> */}
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="contact-link-item">Github</a>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-left">
            <a href="#about" className="footer-link">About</a>
            <a href="#projects" className="footer-link">Projects</a>
            <a href="#skills" className="footer-link">Skills</a>
            <a href="#education" className="footer-link">Education</a>
            <a href="#contact" className="footer-link">Contact</a>
          </div>

        </div>
      </footer>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   FLOATING BUTTON
   ═══════════════════════════════════════════════════════════ */
function FloatingButton() {
  return (
    <motion.a
      href="#contact"
      className="floating-btn"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.5, duration: 0.5, type: 'spring' }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </motion.a>
  );
}

/* ═══════════════════════════════════════════════════════════
   APP — Main Application
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const handlePreloaderComplete = useCallback(() => {
    setLoading(false);
  }, []);

  return (
    <>
      <AnimatePresence>
        {loading && <Preloader onComplete={handlePreloaderComplete} />}
      </AnimatePresence>

      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Navbar onMenuOpen={() => setMenuOpen(true)} />
          <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
          <FloatingButton />

          <HeroSection />
          <AboutSection />
          <ProjectsSection />
          <SkillsSection />
          <CertificationsSection />
          <AchievementsSection />
          <EducationSection />
          <ContactSection />
        </motion.div>
      )}
    </>
  );
}
