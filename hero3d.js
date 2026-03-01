(function () {
  const canvas = document.getElementById("hero3dCanvas");
  if (!canvas || typeof window.THREE === "undefined") {
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0e0f14, 0.028);

  const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 220);
  camera.position.set(0, 4.8, 18);
  camera.rotation.x = -0.2;

  const ambient = new THREE.AmbientLight(0xc6b08a, 0.55);
  scene.add(ambient);

  const moonLight = new THREE.DirectionalLight(0xa9c7ff, 0.6);
  moonLight.position.set(-11, 14, -12);
  scene.add(moonLight);

  const warmLight = new THREE.DirectionalLight(0xc78e4d, 0.45);
  warmLight.position.set(10, 6, 10);
  scene.add(warmLight);

  function buildDune(width, depth, amp, color, yOffset) {
    const geo = new THREE.PlaneGeometry(width, depth, 110, 110);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const waveA = Math.sin((x + y) * 0.12) * amp;
      const waveB = Math.cos(y * 0.16) * amp * 0.65;
      const ridge = Math.sin(x * 0.25) * amp * 0.45;
      pos.setZ(i, waveA + waveB + ridge);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.95,
      metalness: 0.03,
      flatShading: false
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = yOffset;
    return mesh;
  }

  const duneBack = buildDune(95, 80, 1.5, 0x5f472f, -3.8);
  duneBack.position.z = -18;
  scene.add(duneBack);

  const duneMid = buildDune(90, 65, 1.3, 0x7d5e3d, -4.5);
  duneMid.position.z = -7;
  scene.add(duneMid);

  const duneFront = buildDune(95, 55, 1.15, 0xa27a4b, -5.2);
  duneFront.position.z = 8;
  scene.add(duneFront);

  const starsCount = 1400;
  const starsGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starsCount * 3);
  for (let i = 0; i < starsCount; i += 1) {
    const i3 = i * 3;
    starPositions[i3] = (Math.random() - 0.5) * 180;
    starPositions[i3 + 1] = Math.random() * 70 + 10;
    starPositions[i3 + 2] = -Math.random() * 170;
  }
  starsGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));

  const starsMat = new THREE.PointsMaterial({
    color: 0xf6f7ff,
    size: 0.1,
    transparent: true,
    opacity: 0.88,
    depthWrite: false
  });

  const stars = new THREE.Points(starsGeo, starsMat);
  scene.add(stars);

  function makeSmokeTexture() {
    const size = 128;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255,255,255,0.35)");
    grad.addColorStop(0.4, "rgba(210,195,170,0.16)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(c);
    texture.needsUpdate = true;
    return texture;
  }

  const smokeTexture = makeSmokeTexture();
  const smokeMat = new THREE.SpriteMaterial({ map: smokeTexture, transparent: true, depthWrite: false });
  const smokeGroup = new THREE.Group();
  scene.add(smokeGroup);

  const smokes = [];
  for (let i = 0; i < 32; i += 1) {
    const sprite = new THREE.Sprite(smokeMat.clone());
    sprite.position.set((Math.random() - 0.5) * 42, Math.random() * 2.8 - 2.6, Math.random() * 20 - 4);
    const size = 2.2 + Math.random() * 3.2;
    sprite.scale.set(size, size, size);
    sprite.material.opacity = 0.08 + Math.random() * 0.11;
    smokeGroup.add(sprite);
    smokes.push({
      sprite,
      drift: 0.08 + Math.random() * 0.12,
      spin: (Math.random() - 0.5) * 0.13
    });
  }

  const mouse = { x: 0, y: 0 };
  window.addEventListener("mousemove", (event) => {
    mouse.x = event.clientX / window.innerWidth - 0.5;
    mouse.y = event.clientY / window.innerHeight - 0.5;
  });

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  window.addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  function animate() {
    const t = clock.getElapsedTime();

    stars.rotation.y = t * 0.006;
    stars.rotation.x = Math.sin(t * 0.09) * 0.025;

    duneMid.position.x = Math.sin(t * 0.07) * 0.4;
    duneFront.position.x = Math.cos(t * 0.08) * 0.45;

    for (let i = 0; i < smokes.length; i += 1) {
      const smoke = smokes[i];
      smoke.sprite.position.x += smoke.drift * 0.0035;
      smoke.sprite.position.y += Math.sin(t * 0.25 + i) * 0.0008;
      smoke.sprite.material.rotation += smoke.spin * 0.0009;
      if (smoke.sprite.position.x > 25) {
        smoke.sprite.position.x = -25;
      }
    }

    if (!reduceMotion) {
      camera.position.x += (mouse.x * 1.4 - camera.position.x) * 0.02;
      camera.position.y += ((4.8 - mouse.y * 0.7) - camera.position.y) * 0.02;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
})();
