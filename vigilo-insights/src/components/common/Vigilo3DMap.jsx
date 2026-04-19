import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export function Vigilo3DMap({ activeZones = 21, ping = '14ms' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Check theme initially
    const checkIsDark = () => {
      if (document.documentElement.classList.contains('dark')) return true;
      if (document.documentElement.classList.contains('light')) return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    };

    let currentIsDark = checkIsDark();

    let W = mountRef.current.clientWidth;
    let H = mountRef.current.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    mountRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.set(0, 0, 7);
    camera.lookAt(0, 0, 0);

    const panelGroup = new THREE.Group();
    scene.add(panelGroup);

    const materials = {};

    const panelGeo = new THREE.BoxGeometry(4.8, 3.0, 0.08);
    materials.panelSides = new THREE.MeshBasicMaterial({ transparent: true });
    materials.panelFront = new THREE.MeshBasicMaterial({ transparent: true });
    materials.panelBack = new THREE.MeshBasicMaterial({ transparent: true });

    const panelMats = [
      materials.panelSides, materials.panelSides, materials.panelSides, materials.panelSides,
      materials.panelFront, materials.panelBack
    ];
    const panel = new THREE.Mesh(panelGeo, panelMats);
    panelGroup.add(panel);

    const edgeGeo = new THREE.EdgesGeometry(panelGeo);
    materials.edge = new THREE.LineBasicMaterial({ transparent: true });
    panelGroup.add(new THREE.LineSegments(edgeGeo, materials.edge));

    const gridInner = new THREE.Group();
    gridInner.position.z = 0.045;
    panelGroup.add(gridInner);

    materials.grid = new THREE.LineBasicMaterial({ transparent: true });
    materials.axes = new THREE.LineBasicMaterial({ transparent: true });

    for (let x = -2.4; x <= 2.4; x += 0.6) {
      if (Math.abs(x) < 0.01) continue;
      gridInner.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, -1.5, 0), new THREE.Vector3(x, 1.5, 0)]), materials.grid));
    }
    for (let y = -1.5; y <= 1.5; y += 0.5) {
      if (Math.abs(y) < 0.01) continue;
      gridInner.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.4, y, 0), new THREE.Vector3(2.4, y, 0)]), materials.grid));
    }

    gridInner.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.5, 0), new THREE.Vector3(0, 1.5, 0)]), materials.axes));
    gridInner.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.4, 0, 0), new THREE.Vector3(2.4, 0, 0)]), materials.axes));

    const wavePts = [];
    for (let i = 0; i <= 100; i++) {
      const x = -2.4 + (i / 100) * 4.8;
      const y = Math.sin(x * 2) * 0.3 + Math.cos(x * 1.5) * 0.2;
      wavePts.push(new THREE.Vector3(x, y, 0.05));
    }
    materials.wave = new THREE.LineBasicMaterial({ transparent: true });
    const waveLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(wavePts), materials.wave);
    panelGroup.add(waveLine);

    materials.conn = new THREE.LineDashedMaterial({ transparent: true, dashSize: 0.05, gapSize: 0.05 });

    const dotData = [
      { x: -1.2, y: 0.4, colorLight: 0x4f46e5, colorDark: 0x6366f1, speed: 2.0 },
      { x: -0.4, y: -0.6, colorLight: 0xdb2777, colorDark: 0xec4899, speed: 1.5 },
      { x: 0.8, y: -0.2, colorLight: 0xdc2626, colorDark: 0xef4444, speed: 2.5 },
      { x: 0.3, y: -1.0, colorLight: 0xd97706, colorDark: 0xf59e0b, speed: 1.2 },
      { x: 1.6, y: 0.7, colorLight: 0x059669, colorDark: 0x10b981, speed: 1.8 },
    ];

    const connGeo = new THREE.BufferGeometry();
    const connPts = [
      new THREE.Vector3(dotData[0].x, dotData[0].y, 0.05),
      new THREE.Vector3(dotData[1].x, dotData[1].y, 0.05),
      new THREE.Vector3(dotData[3].x, dotData[3].y, 0.05),
      new THREE.Vector3(dotData[2].x, dotData[2].y, 0.05),
      new THREE.Vector3(dotData[4].x, dotData[4].y, 0.05)
    ];
    connGeo.setFromPoints(connPts);
    const connLine = new THREE.Line(connGeo, materials.conn);
    connLine.computeLineDistances();
    panelGroup.add(connLine);

    const dots = [];
    dotData.forEach((d) => {
      const size = 0.06;
      const group = new THREE.Group();
      group.position.set(d.x, d.y, 0.06);

      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const glowMat = new THREE.MeshBasicMaterial({ transparent: true });
      const ring1Mat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
      const ring2Mat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });

      d.mats = { core: coreMat, glow: glowMat, ring1: ring1Mat, ring2: ring2Mat };

      group.add(new THREE.Mesh(new THREE.CircleGeometry(size, 32), coreMat));
      group.add(new THREE.Mesh(new THREE.CircleGeometry(size * 2.5, 32), glowMat));

      const r1 = new THREE.Mesh(new THREE.RingGeometry(size + 0.02, size + 0.04, 32), ring1Mat);
      const r2 = new THREE.Mesh(new THREE.RingGeometry(size + 0.08, size + 0.1, 32), ring2Mat);

      group.add(r1);
      group.add(r2);
      panelGroup.add(group);

      dots.push({ r1, r2, ...d });
    });

    const pCount = 100;
    const pArr = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pArr[i * 3] = (Math.random() - 0.5) * 10;
      pArr[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pArr[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));

    const cCanvas = document.createElement('canvas');
    cCanvas.width = 16; cCanvas.height = 16;
    const cCtx = cCanvas.getContext('2d');
    cCtx.beginPath(); cCtx.arc(8, 8, 8, 0, Math.PI * 2); cCtx.fillStyle = "white"; cCtx.fill();
    materials.particles = new THREE.PointsMaterial({
      size: 0.05, transparent: true, map: new THREE.CanvasTexture(cCanvas), depthWrite: false
    });

    const particles = new THREE.Points(pGeo, materials.particles);
    scene.add(particles);

    panelGroup.rotation.y = -0.15;
    panelGroup.rotation.x = -0.08;

    const applyTheme = (isDark) => {
      const blendMode = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;

      materials.panelSides.color.setHex(isDark ? 0x111628 : 0xffffff);
      materials.panelSides.opacity = isDark ? 0.3 : 0.8;

      materials.panelFront.color.setHex(isDark ? 0x0a0d1e : 0xffffff);
      materials.panelFront.opacity = isDark ? 0.6 : 0.9;

      materials.panelBack.color.setHex(isDark ? 0x050712 : 0xf8fafc);
      materials.panelBack.opacity = isDark ? 0.7 : 0.95;

      materials.edge.color.setHex(isDark ? 0x6366f1 : 0x94a3b8);
      materials.edge.opacity = isDark ? 0.5 : 0.4;
      materials.edge.blending = blendMode;

      materials.grid.color.setHex(isDark ? 0x6366f1 : 0xcbd5e1);
      materials.grid.opacity = isDark ? 0.3 : 0.5;
      materials.grid.blending = blendMode;

      materials.axes.color.setHex(isDark ? 0x6366f1 : 0x94a3b8);
      materials.axes.opacity = isDark ? 0.5 : 0.8;
      materials.axes.blending = blendMode;

      materials.wave.color.setHex(isDark ? 0x0ea5e9 : 0x0284c7);
      materials.wave.opacity = isDark ? 0.7 : 0.4;
      materials.wave.blending = blendMode;

      materials.conn.color.setHex(isDark ? 0x818cf8 : 0x94a3b8);
      materials.conn.opacity = isDark ? 0.4 : 0.6;
      materials.conn.blending = blendMode;

      materials.particles.color.setHex(isDark ? 0x818cf8 : 0x64748b);
      materials.particles.opacity = isDark ? 0.3 : 0.2;
      materials.particles.blending = blendMode;

      dots.forEach(d => {
        const color = isDark ? d.colorDark : d.colorLight;
        d.mats.core.color.setHex(color);
        d.mats.glow.color.setHex(color);
        d.mats.glow.blending = blendMode;
        d.mats.ring1.color.setHex(color);
        d.mats.ring1.blending = blendMode;
        d.mats.ring2.color.setHex(color);
        d.mats.ring2.blending = blendMode;
      });
    };

    applyTheme(currentIsDark);

    // Watch for theme changes on html element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const newIsDark = checkIsDark();
          if (newIsDark !== currentIsDark) {
            currentIsDark = newIsDark;
            applyTheme(currentIsDark);
          }
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });

    // Watch media query
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaQuery = (e) => {
      const newIsDark = checkIsDark();
      if (newIsDark !== currentIsDark) {
        currentIsDark = newIsDark;
        applyTheme(currentIsDark);
      }
    };
    mql.addEventListener('change', handleMediaQuery);

    const clock = new THREE.Clock();
    let animationId;

    function animate() {
      animationId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Smooth figure-8 style rocking — both positive and negative on all axes
      panelGroup.rotation.y = -0.15 + Math.sin(t * 0.4) * 0.11;
      panelGroup.rotation.x = Math.sin(t * 0.25) * 0.10;
      panelGroup.rotation.z = Math.sin(t * 0.15) * 0.02;
      panelGroup.position.y = Math.sin(t * 0.5) * 0.08;
      panelGroup.position.z = Math.sin(t * 0.35) * 0.12;

      const positions = waveLine.geometry.attributes.position.array;
      for (let i = 0; i <= 100; i++) {
        const x = -2.4 + (i / 100) * 4.8;
        positions[i * 3 + 1] = Math.sin(x * 2 + t) * 0.2 + Math.cos(x * 3 - t * 0.5) * 0.15;
      }
      waveLine.geometry.attributes.position.needsUpdate = true;

      dots.forEach((d, i) => {
        const p = t * d.speed + (i * 10);
        const scale1 = 1 + (Math.sin(p) * 0.5 + 0.5) * 0.5;
        const scale2 = 1.1 + (Math.sin(p * 0.8) * 0.5 + 0.5) * 0.8;

        d.r1.scale.setScalar(scale1);
        d.r2.scale.setScalar(scale2);

        const baseRing1 = currentIsDark ? 0.6 : 0.8;
        const baseRing2 = currentIsDark ? 0.3 : 0.4;
        const baseGlow = currentIsDark ? 0.3 : 0.15;

        d.mats.ring1.opacity = baseRing1 * (1 - (scale1 - 1) / 0.5);
        d.mats.ring2.opacity = baseRing2 * (1 - (scale2 - 1.1) / 0.8);
        d.mats.glow.opacity = baseGlow + Math.sin(p) * 0.15;
      });

      particles.rotation.y = t * 0.02;
      particles.rotation.x = t * 0.01;

      renderer.render(scene, camera);
    }
    animate();

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        W = entry.contentRect.width;
        H = entry.contentRect.height;
        renderer.setSize(W, H);
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(mountRef.current);

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      mql.removeEventListener('change', handleMediaQuery);
      resizeObserver.disconnect();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[300px] lg:min-h-[400px] rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.08),inset_0_0_20px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.3),inset_0_0_20px_rgba(99,102,241,0.1)] border border-black/10 dark:border-white/5 transition-all duration-300">
      <div className="absolute top-6 left-6 text-[#475569] dark:text-white/60 text-[11px] font-semibold tracking-wider uppercase z-10 transition-colors duration-300">
        System Link: Active / Ping: {ping}
      </div>
      <div ref={mountRef} className="absolute inset-0 block [&>canvas]:w-full [&>canvas]:h-full" />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-[#0d1020]/85 backdrop-blur-md border border-black/10 dark:border-white/10 rounded-full px-6 py-2.5 flex items-center gap-2.5 shadow-lg z-10 text-[#0f172a] dark:text-[#e2e8f0] text-[13px] font-medium whitespace-nowrap transition-colors duration-300">
        <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981] animate-pulse"></span>
        Live • {activeZones} active zones monitored
      </div>
    </div>
  );
}
