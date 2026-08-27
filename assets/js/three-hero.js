// ============================================================================
// Maverick Expeditions — Lift-off: an interactive 3D hot-air balloon
//
// The model (assets/models/balloon.glb) is a real Blender build — a
// teardrop envelope with gore-panel vertex colours, a woven-texture wicker
// basket, rigging ropes and an emissive burner — carrying one baked idle
// animation (a slow bob, wind-sway and a basket that swings slightly out of
// phase). This module just mounts it: load, light, loop the animation, and
// let the visitor drag it around with damped orbit controls.
//
// Progressive enhancement throughout: if WebGL/module scripts/the GLB fetch
// fail for any reason, the section still reads fine as a gradient card with
// drifting CSS clouds (see .liftoff__stage in style.css) — this script never
// touches markup outside its own mount point.
// ============================================================================

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

(function () {
  "use strict";

  var stage = document.querySelector("[data-liftoff-stage]");
  var mount = document.querySelector("[data-liftoff-scene]");
  if (!stage || !mount) return;

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // -- WebGL availability check -------------------------------------------
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power"
    });
  } catch (e) {
    return; // no WebGL — leave the CSS fallback in place
  }

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = false;
  mount.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(2.6, 1.1, 4.4);

  // -- lighting: a soft sky/ground fill plus one warm key light, echoing
  //    the gradient world used for the Blender preview render -------------
  var hemi = new THREE.HemisphereLight(0xdcefff, 0x2a2010, 1.15);
  scene.add(hemi);

  var key = new THREE.DirectionalLight(0xfff4e0, 2.1);
  key.position.set(4, 5, 3);
  scene.add(key);

  var rim = new THREE.DirectionalLight(0x9fd0ff, 0.6);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  var glow = new THREE.PointLight(0xffb15c, 0.9, 6, 2);
  glow.position.set(0, -0.4, 0.6);
  scene.add(glow);

  // -- controls -------------------------------------------------------------
  var controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.3, 0);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.55;
  controls.minPolarAngle = Math.PI * 0.28;
  controls.maxPolarAngle = Math.PI * 0.62;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.9;
  controls.update();

  controls.addEventListener("start", function () {
    stage.classList.add("is-interacted");
  });

  // -- load the model ---------------------------------------------------
  var mixer = null;
  var loader = new GLTFLoader();

  loader.load(
    "assets/models/balloon.glb",
    function (gltf) {
      var model = gltf.scene;

      // auto-frame: centre the model and settle the camera/target on its
      // real footprint rather than a hand-tuned guess, so re-exports from
      // Blender never need this file touched.
      var box = new THREE.Box3().setFromObject(model);
      var size = box.getSize(new THREE.Vector3());
      var center = box.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;

      var height = Math.max(size.y, 0.001);
      var targetHeight = 3.1;
      var scale = targetHeight / height;
      model.scale.setScalar(scale);

      scene.add(model);

      controls.target.set(0, height * scale * 0.42, 0);
      camera.position.set(
        height * scale * 0.62,
        height * scale * 0.5,
        height * scale * 1.05
      );
      controls.update();

      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach(function (clip) {
          var action = mixer.clipAction(clip);
          action.play();
        });
        if (reduceMotion) mixer.timeScale = 0;
      }

      stage.classList.add("is-ready");
      mount.classList.add("is-active");
      onResize();
      if (!running) start();
    },
    undefined,
    function () {
      // GLB failed to fetch/parse — quietly keep the CSS gradient fallback.
      renderer.dispose();
    }
  );

  // -- sizing ---------------------------------------------------------------
  function onResize() {
    var w = mount.clientWidth || 1;
    var h = mount.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(onResize).observe(mount);
  } else {
    window.addEventListener("resize", onResize);
  }
  onResize();

  // -- render loop, paused when the stage is off-screen ----------------------
  var running = false;
  var raf = 0;
  var clock = new THREE.Clock();

  function frame() {
    raf = requestAnimationFrame(frame);
    var dt = clock.getDelta();
    if (mixer) mixer.update(dt);
    controls.update();
    renderer.render(scene, camera);
  }

  function start() {
    if (running) return;
    running = true;
    clock.start();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) start();
          else stop();
        });
      },
      { threshold: 0.05 }
    ).observe(stage);
  } else {
    start();
  }
})();
