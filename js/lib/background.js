const Background = (() => {
  let canvas;
  let ctx;
  let nodes = [];
  let constellationImage;
  let constellationImageLoaded = false;
  let constellationSprites = [];
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
    influence: 0,
    spriteTargetX: 0,
    spriteTargetY: 0,
    spriteOffsetX: 0,
    spriteOffsetY: 0
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
    maxNodes: 132,
    minConstellations: 12,
    maxConstellations: 15,
    minConstellationWidth: 84,
    maxConstellationWidth: 220,
    minConstellationSpeed: 0.018,
    maxConstellationSpeed: 0.075
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

  function getConstellationCount() {
    if (width >= 1500 || height >= 950) {
      return CONFIG.maxConstellations;
    }

    return CONFIG.minConstellations;
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

  function loadConstellationImage() {
    if (constellationImage) {
      return;
    }

    constellationImage = new Image();
    constellationImage.decoding = "async";
    constellationImage.addEventListener("load", () => {
      constellationImageLoaded = true;
      createConstellationSprites();
    });
    constellationImage.src = new URL("../../assets/pory-constellation.png", import.meta.url).href;
  }

  function getConstellationSpriteRadius(sprite) {
    return Math.max(sprite.width, sprite.height) * 0.42;
  }

  function findConstellationPosition(sprite, existing) {
    let fallback = {
      x: Math.random() * width,
      y: Math.random() * height
    };

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const candidate = {
        x: randomBetween(sprite.width * 0.5, Math.max(sprite.width * 0.5, width - sprite.width * 0.5)),
        y: randomBetween(sprite.height * 0.5, Math.max(sprite.height * 0.5, height - sprite.height * 0.5))
      };
      fallback = candidate;

      const spriteRadius = getConstellationSpriteRadius(sprite);
      const overlaps = existing.some((other) => {
        const distance = Math.hypot(candidate.x - other.x, candidate.y - other.y);
        return distance < spriteRadius + getConstellationSpriteRadius(other) + 26;
      });

      if (!overlaps) {
        return candidate;
      }
    }

    return fallback;
  }

  function createConstellationSprite(existing) {
    const depth = randomBetween(0.58, 1.12);
    const aspectRatio = constellationImage.naturalHeight / constellationImage.naturalWidth;
    const widthScale = randomBetween(CONFIG.minConstellationWidth, CONFIG.maxConstellationWidth) * depth;
    const heightScale = widthScale * aspectRatio;
    const sprite = {
      depth,
      width: widthScale,
      height: heightScale,
      vx: randomBetween(CONFIG.minConstellationSpeed, CONFIG.maxConstellationSpeed) * depth * randomSign(),
      vy: randomBetween(CONFIG.minConstellationSpeed * 0.2, CONFIG.maxConstellationSpeed * 0.45) * depth * randomSign(),
      swayX: randomBetween(8, 24) * (1.3 - depth * 0.28),
      swayY: randomBetween(4, 16) * (1.25 - depth * 0.24),
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: randomBetween(0.0015, 0.004) * (1.2 - depth * 0.12),
      opacity: 0.12 + depth * 0.18,
      glow: 4 + depth * 7
    };

    const position = findConstellationPosition(sprite, existing);
    sprite.x = position.x;
    sprite.y = position.y;
    return sprite;
  }

  function createConstellationSprites() {
    if (!constellationImageLoaded || !width || !height) {
      return;
    }

    const next = [];
    const spriteCount = getConstellationCount();

    for (let index = 0; index < spriteCount; index += 1) {
      next.push(createConstellationSprite(next));
    }

    constellationSprites = next.sort((a, b) => a.depth - b.depth);
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
    createConstellationSprites();
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
    mouse.spriteTargetX = (event.clientX - width * 0.5) / Math.max(width, 1);
    mouse.spriteTargetY = (event.clientY - height * 0.5) / Math.max(height, 1);
  }

  function handlePointerLeave() {
    mouse.active = false;
    mouse.spriteTargetX = 0;
    mouse.spriteTargetY = 0;
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
    mouse.spriteOffsetX += (mouse.spriteTargetX - mouse.spriteOffsetX) * 0.08;
    mouse.spriteOffsetY += (mouse.spriteTargetY - mouse.spriteOffsetY) * 0.08;

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

  function updateConstellationSprites() {
    if (!constellationImageLoaded) {
      return;
    }

    for (const sprite of constellationSprites) {
      sprite.x += sprite.vx;
      sprite.y += sprite.vy;
      sprite.phase += sprite.phaseSpeed;

      const wrapX = sprite.width * 0.6;
      const wrapY = sprite.height * 0.6;

      if (sprite.x < -wrapX) sprite.x = width + wrapX;
      if (sprite.x > width + wrapX) sprite.x = -wrapX;
      if (sprite.y < -wrapY) sprite.y = height + wrapY;
      if (sprite.y > height + wrapY) sprite.y = -wrapY;
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

  function drawConstellationSprites() {
    if (!constellationImageLoaded || !constellationSprites.length) {
      return;
    }

    for (const sprite of constellationSprites) {
      const driftX = Math.sin(sprite.phase) * sprite.swayX;
      const driftY = Math.cos(sprite.phase * 1.12) * sprite.swayY;
      const parallaxX = mouse.spriteOffsetX * 10 * sprite.depth;
      const parallaxY = mouse.spriteOffsetY * 6 * sprite.depth;
      const shimmer = (Math.sin(sprite.phase * 1.7) + 1) * 0.5;

      ctx.save();
      ctx.globalAlpha = clamp(sprite.opacity + shimmer * 0.06, 0.1, 0.38);
      ctx.shadowBlur = sprite.glow;
      ctx.shadowColor = alpha(palette.highlightBase, 0.12 + sprite.depth * 0.08);
      ctx.drawImage(
        constellationImage,
        sprite.x - sprite.width * 0.5 + driftX + parallaxX,
        sprite.y - sprite.height * 0.5 + driftY + parallaxY,
        sprite.width,
        sprite.height
      );
      ctx.restore();
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
    updateConstellationSprites();
    drawConstellationSprites();
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
    loadConstellationImage();
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
