import React, { useEffect, useRef } from 'react';

export default function SnowEffect({ liberatedCount, totalCount = 16 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let mouse = { x: -1000, y: -1000, radius: 140 };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const progressRatio = liberatedCount / totalCount;
    // Particle counts
    const totalFlakes = Math.max(40, Math.floor(130 * (1 - progressRatio * 0.5)));

    // Create particles with depth layers (z-axis: 1 = near/fast, 3 = far/slow)
    const particles = Array.from({ length: totalFlakes }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      z: Math.random() * 2 + 1, // depth factor
      radius: Math.random() * 2.8 + 0.6,
      speedY: Math.random() * 1.6 + 0.6,
      speedX: (Math.random() - 0.5) * 1.4,
      alpha: Math.random() * 0.7 + 0.2,
      pulse: Math.random() * Math.PI * 2,
      isEmber: progressRatio > 0.3 && Math.random() < progressRatio * 0.7
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.pulse += 0.03;
        const currentAlpha = p.alpha + Math.sin(p.pulse) * 0.15;

        // Base physics
        p.y += p.speedY * p.z;
        p.x += (p.speedX + Math.sin(p.pulse * 0.5) * 0.4) * p.z;

        // Interactive mouse wind repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < mouse.radius) {
          const force = (1 - dist / mouse.radius) * 3;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }

        // Wrap edges
        if (p.y > canvas.height + 10) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
          p.isEmber = progressRatio > 0.3 && Math.random() < progressRatio * 0.7;
        }
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.x < -10) p.x = canvas.width + 10;

        ctx.beginPath();
        const r = Math.max(0.5, p.radius * p.z * 0.8);
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);

        if (p.isEmber) {
          // Warm solar liberation embers (Golden / Emerald)
          ctx.fillStyle = `rgba(251, 191, 36, ${Math.max(0.1, currentAlpha)})`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#fbbf24';
        } else {
          // Frosty Cryo-crystal blizzard flakes (Neon Cyan / Electric Blue)
          ctx.fillStyle = `rgba(186, 230, 253, ${Math.max(0.1, currentAlpha)})`;
          ctx.shadowBlur = p.z > 2 ? 8 : 4;
          ctx.shadowColor = '#00f0ff';
        }
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [liberatedCount, totalCount]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-80"
    />
  );
}
