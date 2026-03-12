const Background = (() => {
  let canvas;
  let ctx;
  let nodes = [];
  let animationId = 0;
  let initialized = false;
  let running = false;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let themeObserver;

  const mouse = {
    x: 0,
    y: 0,
    active: false,
    influence: 0
  };

  const palette = {
    bg: "#05070d",
    primaryBase: "#becddd",
    primary: "rgba(169, 223, 231, 0.72)",
    primarySoft: "rgba(169, 223, 231, 0.22)",
    accentBase: "#ddd3e6",
    accent: "rgba(220, 181, 231, 0.68)",
    accentSoft: "rgba(220, 181, 231, 0.18)",
    highlightBase: "#ffffff",
    highlight: "rgba(236, 249, 251, 0.85)"
  };

  const CONFIG = {
    minSpeed: 0.08,
    maxSpeed: 0.34,
    baseConnectionDistance: 116,
    mouseConnectionDistance: 180,
    baseMouseRadius: 130,
    maxMouseRadius: 220,
    nodeDensity: 0.000055,
    minNodes: 48,
    maxNodes: 132
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomSign() {
    return Math.random() > 0.5 ? 1 : -1;
  }

  function alpha(color, value) {
    const rgb = parseColor(color);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${value})`;
  }

  function parseColor(value) {
    const raw = String(value || "").trim();

    if (/^#([0-9a-f]{3})$/i.test(raw)) {
      const [, shortHex] = raw.match(/^#([0-9a-f]{3})$/i);
      return {
        r: parseInt(shortHex[0] + shortHex[0], 16),
        g: parseInt(shortHex[1] + shortHex[1], 16),
        b: parseInt(shortHex[2] + shortHex[2], 16)
      };
    }

    if (/^#([0-9a-f]{6})$/i.test(raw)) {
      const [, longHex] = raw.match(/^#([0-9a-f]{6})$/i);
      return {
        r: parseInt(longHex.slice(0, 2), 16),
        g: parseInt(longHex.slice(2, 4), 16),
        b: parseInt(longHex.slice(4, 6), 16)
      };
    }

    const rgbMatch = raw.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbMatch) {
      const [r = 255, g = 255, b = 255] = rgbMatch[1]
        .split(",")
        .slice(0, 3)
        .map((part) => Number.parseFloat(part.trim()) || 0);
      return { r, g, b };
    }

    return { r: 255, g: 255, b: 255 };
  }

  function getNodeCount() {
    const count = Math.floor(width * height * CONFIG.nodeDensity);
    return clamp(count, CONFIG.minNodes, CONFIG.maxNodes);
  }

  function createNode() {
    const variant = Math.random() > 0.8 ? "star" : "dot";
    const useAccent = Math.random() > 0.5;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: randomBetween(CONFIG.minSpeed, CONFIG.maxSpeed) * randomSign(),
      vy: randomBetween(CONFIG.minSpeed, CONFIG.maxSpeed) * randomSign(),
      radius: variant === "star" ? randomBetween(1.1, 2.2) : randomBetween(1.4, 3.1),
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: randomBetween(0.008, 0.024),
      variant,
      color: useAccent ? palette.accent : palette.primary,
      glow: useAccent ? palette.accentSoft : palette.primarySoft
    };
  }

  function createNodes() {
    nodes = Array.from({ length: getNodeCount() }, createNode);
  }

  function createCanvas() {
    if (canvas) {
      return;
    }

    canvas = document.createElement("canvas");
    canvas.id = "backgroundCanvas";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: "0",
      display: "none"
    });

    document.body.prepend(canvas);
    ctx = canvas.getContext("2d");
    resize();
  }

  function resize() {
    if (!canvas) {
      return;
    }

    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createNodes();
  }

  function updatePalette() {
    const styles = getComputedStyle(document.body);
    palette.bg = styles.getPropertyValue("--bg").trim() || "#05070d";

    palette.primaryBase = styles.getPropertyValue("--primary").trim() || "#becddd";
    palette.accentBase = styles.getPropertyValue("--accent").trim() || "#ddd3e6";
    palette.highlightBase = styles.getPropertyValue("--bg-highlight").trim() || "#ffffff";

    palette.primary = alpha(palette.primaryBase, 0.64);
    palette.primarySoft = alpha(palette.primaryBase, 0.18);
    palette.accent = alpha(palette.accentBase, 0.54);
    palette.accentSoft = alpha(palette.accentBase, 0.14);
    palette.highlight = alpha(palette.highlightBase, 0.8);

    for (const node of nodes) {
      const useAccent = node.variant === "star" ? Math.random() > 0.35 : Math.random() > 0.55;
      node.color = useAccent ? palette.accent : palette.primary;
      node.glow = useAccent ? palette.accentSoft : palette.primarySoft;
    }
  }

  function observeTheme() {
    if (themeObserver || typeof MutationObserver === "undefined") {
      return;
    }

    themeObserver = new MutationObserver(() => {
      updatePalette();
    });

    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"]
    });
  }

  function handlePointerMove(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.active = true;
    mouse.influence = 1;
  }

  function handlePointerLeave() {
    mouse.active = false;
  }

  function applyMouseInfluence(node) {
    if (!mouse.active) {
      return;
    }

    const dx = mouse.x - node.x;
    const dy = mouse.y - node.y;
    const distance = Math.hypot(dx, dy);
    const radius = CONFIG.baseMouseRadius + mouse.influence * (CONFIG.maxMouseRadius - CONFIG.baseMouseRadius);

    if (distance === 0 || distance > radius) {
      return;
    }

    const force = (1 - distance / radius) * 0.012;
    node.vx += dx * force * 0.002;
    node.vy += dy * force * 0.002;
  }

  function updateNodes() {
    mouse.influence += ((mouse.active ? 1 : 0) - mouse.influence) * 0.08;

    for (const node of nodes) {
      applyMouseInfluence(node);

      node.x += node.vx;
      node.y += node.vy;
      node.twinkle += node.twinkleSpeed;

      node.vx *= 0.996;
      node.vy *= 0.996;

      if (Math.abs(node.vx) < CONFIG.minSpeed) {
        node.vx += CONFIG.minSpeed * randomSign() * 0.18;
      }
      if (Math.abs(node.vy) < CONFIG.minSpeed) {
        node.vy += CONFIG.minSpeed * randomSign() * 0.18;
      }

      if (node.x < -20) node.x = width + 20;
      if (node.x > width + 20) node.x = -20;
      if (node.y < -20) node.y = height + 20;
      if (node.y > height + 20) node.y = -20;
    }
  }

  function drawConnections() {
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);

        let limit = CONFIG.baseConnectionDistance;
        let useHighlight = false;
        if (mouse.active) {
          const mouseDistanceA = Math.hypot(mouse.x - a.x, mouse.y - a.y);
          const mouseDistanceB = Math.hypot(mouse.x - b.x, mouse.y - b.y);
          if (mouseDistanceA < CONFIG.maxMouseRadius || mouseDistanceB < CONFIG.maxMouseRadius) {
            limit = CONFIG.mouseConnectionDistance;
            useHighlight = true;
          }
        }

        if (distance > limit) {
          continue;
        }

        const strength = 1 - distance / limit;
        const lineAlpha = 0.03 + strength * 0.1 + mouse.influence * 0.035;
        const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        const startColor = useHighlight
          ? palette.highlightBase
          : a.variant === "star"
            ? palette.accentBase
            : palette.primaryBase;
        const endColor = useHighlight
          ? palette.highlightBase
          : b.variant === "star"
            ? palette.accentBase
            : palette.primaryBase;
        gradient.addColorStop(
          0,
          alpha(startColor, useHighlight ? lineAlpha * 1.2 : lineAlpha)
        );
        gradient.addColorStop(
          1,
          alpha(endColor, useHighlight ? lineAlpha : lineAlpha * 0.78)
        );

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 0.6 + strength * 1.15;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  function drawStar(node, intensity) {
    const outer = node.radius + intensity * 1.2;
    ctx.strokeStyle = alpha(
      node.variant === "star" ? palette.accentBase : palette.highlightBase,
      0.18 + intensity * 0.14
    );
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(node.x - outer, node.y);
    ctx.lineTo(node.x + outer, node.y);
    ctx.moveTo(node.x, node.y - outer);
    ctx.lineTo(node.x, node.y + outer);
    ctx.stroke();
  }

  function drawNodes() {
    for (const node of nodes) {
      const pulse = (Math.sin(node.twinkle) + 1) * 0.5;
      const intensity = 0.35 + pulse * 0.65;
      const radius = node.radius + intensity * 0.8;

      ctx.shadowBlur = 10 + intensity * 10;
      ctx.shadowColor = node.glow;
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (node.variant === "star") {
        drawStar(node, intensity);
      }
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }

  function render() {
    if (!running || !ctx) {
      return;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);

    updateNodes();
    drawConnections();
    drawNodes();

    animationId = window.requestAnimationFrame(render);
  }

  function addListeners() {
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("mouseleave", handlePointerLeave);
    window.addEventListener("blur", handlePointerLeave);
  }

  function setup() {
    if (initialized || !document.body) {
      return;
    }

    initialized = true;
    createCanvas();
    createNodes();
    updatePalette();
    observeTheme();
    addListeners();
    show();
  }

  function show() {
    if (!canvas) {
      return;
    }

    canvas.style.display = "block";
    if (running) {
      return;
    }

    running = true;
    render();
  }

  function hide() {
    if (!canvas) {
      return;
    }

    canvas.style.display = "none";
    running = false;
    window.cancelAnimationFrame(animationId);
  }

  return { setup, show, hide, updatePalette };
})();

export function initBackground() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      Background.setup();
    });
    return;
  }

  Background.setup();
}
