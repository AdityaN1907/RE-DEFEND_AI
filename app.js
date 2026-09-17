/**
 * RE-DEFEND AI — Real-Time 3D Climate Stress Engine
 * Geospatial 3D Cyberpunk Visualization of Pune Infrastructure
 * Integrated with Real Dark Geospatial Map Tiles (CartoDB Dark Matter via MapLibre GL)
 */

// --- 1. LOCAL DATASET DEFINITION (PUNE INFRASTRUCTURE) ---
const PUNE_INFRASTRUCTURE = [
  {
    id: "node_01",
    name: "Parvati Water Works",
    type: "water",
    lat: 18.4967,
    lng: 73.8504,
    capacity: 100,
    dependency_node_ids: ["node_02"]
  },
  {
    id: "node_02",
    name: "Parvati MSEDCL 220kV Substation",
    type: "power",
    lat: 18.4982,
    lng: 73.8491,
    capacity: 100,
    dependency_node_ids: []
  },
  {
    id: "node_03",
    name: "Sassoon General Hospital",
    type: "hospital",
    lat: 18.5266,
    lng: 73.8744,
    capacity: 100,
    dependency_node_ids: ["node_04", "node_05"]
  },
  {
    id: "node_04",
    name: "Shivajinagar MSEDCL Substation",
    type: "power",
    lat: 18.5308,
    lng: 73.8474,
    capacity: 100,
    dependency_node_ids: []
  },
  {
    id: "node_05",
    name: "Pune Station Transit Hub & Underpass",
    type: "transit",
    lat: 18.5284,
    lng: 73.8739,
    capacity: 100,
    dependency_node_ids: []
  },
  {
    id: "node_06",
    name: "University Circle (Savitribai Phule Junction)",
    type: "transit",
    lat: 18.5416,
    lng: 73.8262,
    capacity: 100,
    dependency_node_ids: []
  },
  {
    id: "node_07",
    name: "Deenanath Mangeshkar Hospital",
    type: "hospital",
    lat: 18.5042,
    lng: 73.8344,
    capacity: 100,
    dependency_node_ids: ["node_08", "node_09"]
  },
  {
    id: "node_08",
    name: "Kothrud 132kV Substation",
    type: "power",
    lat: 18.5074,
    lng: 73.8077,
    capacity: 100,
    dependency_node_ids: []
  },
  {
    id: "node_09",
    name: "Sinhagad Road Junction (Rajaram Bridge)",
    type: "transit",
    lat: 18.4908,
    lng: 73.8341,
    capacity: 100,
    dependency_node_ids: []
  },
  {
    id: "node_10",
    name: "Swargate Multimodal Transit Hub",
    type: "transit",
    lat: 18.5018,
    lng: 73.8587,
    capacity: 100,
    dependency_node_ids: []
  },
  {
    id: "node_11",
    name: "Ruby Hall Clinic (Bund Garden)",
    type: "hospital",
    lat: 18.5327,
    lng: 73.8778,
    capacity: 100,
    dependency_node_ids: ["node_04", "node_05"]
  },
  {
    id: "node_12",
    name: "Hadapsar Industrial Substation",
    type: "power",
    lat: 18.5089,
    lng: 73.9259,
    capacity: 100,
    dependency_node_ids: []
  },
  {
    id: "node_13",
    name: "Lashkar Pumping Station (Cantonment)",
    type: "water",
    lat: 18.5173,
    lng: 73.8831,
    capacity: 100,
    dependency_node_ids: ["node_12"]
  }
];

// --- 2. CLIMATE STRESS & CASCADE SIMULATION ENGINE ---
class ClimateSimulationEngine {
  constructor() {
    this.nodes = {};
    this.inputs = {
      temp: 32,      // 30°C - 50°C
      rain: 25,      // 0 - 150 mm/hr
      gridLoad: 70   // 50% - 100%
    };
    this.previousStates = {};
    this.mitigationActive = false;

    this.init();
  }

  init() {
    PUNE_INFRASTRUCTURE.forEach(item => {
      this.nodes[item.id] = {
        ...item,
        operationalCapacity: 100.0,
        status: 'nominal', // 'nominal' | 'degraded' | 'failed'
        colorHex: '#10B981',
        failureReason: []
      };
      this.previousStates[item.id] = 100.0;
    });
  }

  setInputs(temp, rain, gridLoad) {
    this.inputs.temp = parseFloat(temp);
    this.inputs.rain = parseFloat(rain);
    this.inputs.gridLoad = parseFloat(gridLoad);
    this.mitigationActive = false;
    this.recalculate();
  }

  recalculate() {
    const { temp, rain, gridLoad } = this.inputs;

    // Reset base operational capacities
    Object.values(this.nodes).forEach(n => {
      n.operationalCapacity = 100.0;
      n.failureReason = [];
    });

    // 1. PRIMARY STRESS THRESHOLDS
    // Power Nodes: Fail (0%) if Temp > 40°C AND Grid Load > 85%
    const powerFailed = (temp > 40.0 && gridLoad > 85.0);

    // Transit Nodes: Fail (0%) if Monsoon Rain > 80 mm/hr
    const transitFailed = (rain > 80.0);

    Object.values(this.nodes).forEach(node => {
      if (node.type === 'power') {
        if (powerFailed) {
          node.operationalCapacity = 0.0;
          node.failureReason.push(`Thermal Overload (Temp: ${temp}°C > 40°C & Load: ${gridLoad}% > 85%)`);
        } else if (temp > 40.0) {
          node.operationalCapacity = 50.0; // High temp degradation
        } else if (rain >= 90.0) {
          node.operationalCapacity = 0.0;
          node.failureReason.push(`Substation Inundation (${rain} mm/hr >= 90 mm/hr)`);
        }
      } else if (node.type === 'transit') {
        if (transitFailed) {
          node.operationalCapacity = 0.0;
          node.failureReason.push(`Monsoon Submersion (${rain} mm/hr > 80 mm/hr)`);
        } else if (rain >= 40.0) {
          node.operationalCapacity = 60.0; // Traffic delay degradation
        }
      }
    });

    // 2. CASCADING RULES
    // • Power node fails (0%) -> Dependent Hospitals drop to 15% backup power; dependent Water Pumping drops to 0%.
    // • Transit node fails (0%) -> Hospital emergency accessibility drops by 50%.
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 5) {
      changed = false;
      iterations++;

      Object.values(this.nodes).forEach(node => {
        const prevCap = node.operationalCapacity;
        const deps = (node.dependency_node_ids || []).map(id => this.nodes[id]).filter(Boolean);

        if (node.type === 'water') {
          const powerDeps = deps.filter(d => d.type === 'power');
          const hasPowerLoss = powerDeps.some(d => d.operationalCapacity === 0.0);
          if (hasPowerLoss) {
            node.operationalCapacity = 0.0;
            node.failureReason = [`Cascading Power Failure from ${powerDeps.map(d => d.name).join(', ')}`];
          }
        } else if (node.type === 'hospital') {
          const powerDeps = deps.filter(d => d.type === 'power');
          const transitDeps = deps.filter(d => d.type === 'transit');

          const hasPowerLoss = powerDeps.some(d => d.operationalCapacity === 0.0);
          const hasTransitLoss = transitDeps.some(d => d.operationalCapacity === 0.0);

          if (hasPowerLoss && hasTransitLoss) {
            node.operationalCapacity = 15.0; // Backup generator + 50% accessibility constraint
            node.failureReason = [
              `Feeder Substation Offline -> Operating on 15% Backup Generator Power`,
              `Transit Corridors Submerged -> Emergency Ambulance Ingress cut by 50%`
            ];
          } else if (hasPowerLoss) {
            node.operationalCapacity = 15.0; // Drops to 15% backup power
            node.failureReason = [`Feeder Substation Offline -> Operating on 15% Backup Generator Power`];
          } else if (hasTransitLoss) {
            node.operationalCapacity = 50.0; // Accessibility drops by 50%
            node.failureReason = [`Transit Hub Inundated -> Ambulance Accessibility reduced by 50%`];
          }
        }

        if (node.operationalCapacity !== prevCap) {
          changed = true;
        }
      });
    }

    // Apply mitigation overrides if user requested
    if (this.mitigationActive) {
      Object.values(this.nodes).forEach(node => {
        if (node.type === 'hospital' && node.operationalCapacity < 100.0) {
          node.operationalCapacity = 90.0;
          node.failureReason = ["AI Mitigation: Auxiliary Gen-sets and Air-Ambulance Rerouting Active"];
        }
        if (node.type === 'water' && node.operationalCapacity === 0.0) {
          node.operationalCapacity = 75.0;
          node.failureReason = ["AI Mitigation: Mobile Solar-Diesel Microgrid Engaged"];
        }
      });
    }

    // Color State Mapping:
    // 100% Operational = Neon Green (#10B981)
    // 15%-50% Degraded = Gold Yellow (#F59E0B)
    // 0% Failed = Crimson Red (#EF4444)
    Object.values(this.nodes).forEach(node => {
      if (node.operationalCapacity <= 0.0) {
        node.status = 'failed';
        node.colorHex = '#EF4444';
      } else if (node.operationalCapacity <= 50.0) {
        node.status = 'degraded';
        node.colorHex = '#F59E0B';
      } else {
        node.status = 'nominal';
        node.colorHex = '#10B981';
      }
    });

    return this.nodes;
  }

  getOverallHealth() {
    const all = Object.values(this.nodes);
    if (!all.length) return 100;
    const avg = all.reduce((acc, curr) => acc + curr.operationalCapacity, 0) / all.length;
    return Math.round(avg);
  }

  getSectorBreakdown() {
    const types = { power: [], transit: [], water: [], hospital: [] };
    Object.values(this.nodes).forEach(n => {
      if (types[n.type]) types[n.type].push(n);
    });

    const summarize = list => {
      if (!list.length) return { avg: 100, active: 0, total: 0 };
      const avg = Math.round(list.reduce((acc, c) => acc + c.operationalCapacity, 0) / list.length);
      const active = list.filter(c => c.operationalCapacity > 0).length;
      return { avg, active, total: list.length };
    };

    return {
      power: summarize(types.power),
      transit: summarize(types.transit),
      water: summarize(types.water),
      hospital: summarize(types.hospital)
    };
  }

  generateAdvice() {
    const failed = Object.values(this.nodes).filter(n => n.operationalCapacity < 100.0);
    if (!failed.length) {
      return [
        {
          title: "All Pune Grid Nodes Nominal",
          desc: "Environmental parameters are within resilience tolerances. Substations, pumping works, and medical trauma centers operational.",
          type: "nominal",
          icon: "fa-circle-check"
        }
      ];
    }

    const advice = [];
    const powerFails = failed.filter(n => n.type === 'power' && n.operationalCapacity === 0);
    if (powerFails.length) {
      advice.push({
        title: `Substation Overload (${powerFails.length} Feeder Offlines)`,
        desc: `Prescriptive Action: Trigger transmission islanding for ${powerFails.map(p => p.name).join(', ')}. Divert 220kV load to Koyna hydro reserve feeder.`,
        type: "danger",
        icon: "fa-bolt"
      });
    }

    const hospDegraded = failed.filter(n => n.type === 'hospital');
    hospDegraded.forEach(h => {
      advice.push({
        title: `Critical Care Emergency: ${h.name}`,
        desc: `Prescriptive Action: Reroute mobile generators to Node #${h.id.replace('node_','')}. Prioritize ICU ventilator busbars; coordinate air-corridor ambulance access.`,
        type: "warning",
        icon: "fa-hospital"
      });
    });

    const transitFails = failed.filter(n => n.type === 'transit' && n.operationalCapacity === 0);
    if (transitFails.length) {
      advice.push({
        title: `Transit Corridors Submerged (${transitFails.length} Inundated)`,
        desc: `Prescriptive Action: Deploy NDRF high-clearance amphibious rescue transport through ${transitFails.map(t => t.name).join(' & ')}. Engage stormwater bypass pumps.`,
        type: "danger",
        icon: "fa-truck-droplet"
      });
    }

    const waterFails = failed.filter(n => n.type === 'water' && n.operationalCapacity === 0);
    if (waterFails.length) {
      advice.push({
        title: `Pumping Station Blackout (${waterFails.map(w => w.name).join(', ')})`,
        desc: `Prescriptive Action: Spin up auxiliary diesel pumps and dispatch municipal water tankers to Sassoon and Deenanath hospitals.`,
        type: "danger",
        icon: "fa-faucet-drip"
      });
    }

    return advice;
  }
}

// --- 3. IMMERSIVE GEOSPATIAL 3D MAP & THREE.JS VISUALIZER ---
class CyberpunkGeospatialVisualizer {
  constructor(mapContainerId, engine) {
    this.mapContainerId = mapContainerId;
    this.engine = engine;

    this.nodeMeshes = {};
    this.arcLines = [];
    this.autoRotate = true; // Auto-orbit enabled by default on load
    this.hoveredNode = null;

    // Center of Pune Metropolitan Grid (18.5204° N, 73.8567° E)
    this.centerLng = 73.8567;
    this.centerLat = 18.5204;

    this.initMap();
  }

  initMap() {
    // Initialize MapLibre GL with Esri World Street Map (100% Free, No API Key, No 403 blocks)
    this.map = new maplibregl.Map({
      container: this.mapContainerId,
      style: {
        version: 8,
        sources: {
          'esri-streets': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: '&copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
          }
        },
        layers: [
          {
            id: 'esri-streets-tiles',
            type: 'raster',
            source: 'esri-streets',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [this.centerLng, this.centerLat],
      zoom: 12.6,
      pitch: 48,
      bearing: -10,
      antialias: true,
      maxPitch: 80
    });

    this.map.on('load', () => {
      this.initThreeLayer();
      this.initMapInteractions();
      this.update3DVisuals();
    });
  }

  initThreeLayer() {
    const visualizer = this;

    // Geospatial Mercator projection anchor at Pune Center
    const modelOrigin = [this.centerLng, this.centerLat];
    const modelAltitude = 0;
    const modelRotate = [Math.PI / 2, 0, 0];

    const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
      modelOrigin,
      modelAltitude
    );

    const modelTransform = {
      translateX: modelAsMercatorCoordinate.x,
      translateY: modelAsMercatorCoordinate.y,
      translateZ: modelAsMercatorCoordinate.z,
      rotateX: modelRotate[0],
      rotateY: modelRotate[1],
      rotateZ: modelRotate[2],
      scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
    };

    this.modelTransform = modelTransform;
    this.modelOriginMercator = modelAsMercatorCoordinate;

    // Helper to project GPS lat/lng to 3D Cartesian meters relative to Pune anchor
    this.latLngToMeters = (lat, lng, elevation = 0) => {
      const coord = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
      const dx = (coord.x - modelAsMercatorCoordinate.x) / modelTransform.scale;
      const dz = (coord.y - modelAsMercatorCoordinate.y) / modelTransform.scale;
      return new THREE.Vector3(dx, elevation, dz);
    };

    const customThreeLayer = {
      id: '3d-geospatial-scene',
      type: 'custom',
      renderingMode: '3d',
      onAdd: function (map, gl) {
        visualizer.camera = new THREE.Camera();
        visualizer.scene = new THREE.Scene();

        // 1. Cinematic Cyberpunk Lighting
        const ambientLight = new THREE.AmbientLight(0x1E293B, 1.4);
        visualizer.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0x38BDF8, 2.0);
        mainLight.position.set(2000, 5000, 2000);
        visualizer.scene.add(mainLight);

        const blueBackLight = new THREE.DirectionalLight(0x2563EB, 1.4);
        blueBackLight.position.set(-2000, 3000, -2000);
        visualizer.scene.add(blueBackLight);

        // 2. Initialize 3D Node Pillars, Spheres, Ground Radar Rings & Arcs
        visualizer.initNodes();
        visualizer.initArcs();

        // 3. WebGL Renderer bound to MapLibre context
        visualizer.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true
        });
        visualizer.renderer.autoClear = false;
      },
      render: function (gl, matrix) {
        const rotationX = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(1, 0, 0),
          modelTransform.rotateX
        );
        const rotationY = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(0, 1, 0),
          modelTransform.rotateY
        );
        const rotationZ = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(0, 0, 1),
          modelTransform.rotateZ
        );

        const m = new THREE.Matrix4().fromArray(matrix);
        const l = new THREE.Matrix4()
          .makeTranslation(
            modelTransform.translateX,
            modelTransform.translateY,
            modelTransform.translateZ
          )
          .scale(
            new THREE.Vector3(
              modelTransform.scale,
              -modelTransform.scale,
              modelTransform.scale
            )
          )
          .multiply(rotationX)
          .multiply(rotationY)
          .multiply(rotationZ);

        visualizer.camera.projectionMatrix = m.multiply(l);

        // Animations on each frame
        const time = performance.now() * 0.001;

        // Auto-orbit map rotation
        if (visualizer.autoRotate) {
          visualizer.map.setBearing(visualizer.map.getBearing() + 0.12);
        }

        // Radar ring pulsing and failed node point light pulsing
        Object.values(visualizer.nodeMeshes).forEach(m => {
          if (m.groundRing) {
            const scale = 1.0 + Math.sin(time * 3 + m.phase) * 0.15;
            m.groundRing.scale.set(scale, scale, 1);
          }

          if (m.pointLight && m.pointLight.intensity > 0) {
            m.pointLight.intensity = 1.8 + Math.sin(time * 8) * 1.2;
            m.sphere.material.emissiveIntensity = 0.9 + Math.sin(time * 8) * 0.4;
          }
        });

        // Animate red dashed lines for failed dependencies
        visualizer.arcLines.forEach(arc => {
          if (arc.line.material === arc.failedMat) {
            arc.failedMat.opacity = 0.5 + Math.sin(time * 10) * 0.5;
          }
        });

        visualizer.renderer.resetState();
        visualizer.renderer.render(visualizer.scene, visualizer.camera);
        visualizer.map.triggerRepaint();
      }
    };

    this.map.addLayer(customThreeLayer);
  }

  // Create 3D text billboard sprite for node labels
  createLabelSprite(text, type) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 70;
    const ctx = canvas.getContext('2d');

    // Background pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.roundRect(6, 6, 288, 58, 14);
    ctx.fill();
    ctx.stroke();

    // Type badge
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText(`[${type.toUpperCase()}]`, 16, 42);

    // Name text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Inter, sans-serif';
    const shortName = text.length > 15 ? text.substring(0, 13) + '..' : text;
    ctx.fillText(shortName, 115, 42);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(400, 95, 1);
    return sprite;
  }

  initNodes() {
    const pillarHeight = 350; // 350 meters tall in real Pune geography
    const pillarGeo = new THREE.CylinderGeometry(40, 55, pillarHeight, 20);
    const sphereGeo = new THREE.SphereGeometry(75, 20, 20);
    const ringGeo = new THREE.RingGeometry(80, 140, 32);

    Object.values(this.engine.nodes).forEach((node, idx) => {
      const basePos = this.latLngToMeters(node.lat, node.lng, 0);
      const topPos = this.latLngToMeters(node.lat, node.lng, pillarHeight);

      const nodeGroup = new THREE.Group();

      // 1. Glowing 3D Cylinder / Status Pillar
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x10B981,
        emissive: 0x10B981,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(basePos.x, basePos.y + pillarHeight / 2, basePos.z);
      nodeGroup.add(pillar);

      // 2. Glowing Head Sphere
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x10B981,
        emissive: 0x10B981,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        metalness: 0.9
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(topPos);
      sphere.userData = { nodeId: node.id, nodeData: node };
      nodeGroup.add(sphere);

      // 3. Ground Radar Ring (Placed on real map surface)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x10B981,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const groundRing = new THREE.Mesh(ringGeo, ringMat);
      groundRing.rotation.x = -Math.PI / 2;
      groundRing.position.set(basePos.x, basePos.y + 5, basePos.z);
      nodeGroup.add(groundRing);

      // 4. Point Light for 0% Crimson Pulsing Failure State
      const pointLight = new THREE.PointLight(0xEF4444, 0, 1500);
      pointLight.position.set(topPos.x, topPos.y + 50, topPos.z);
      nodeGroup.add(pointLight);

      // 5. Floating 3D Billboard Label Sprite
      const label = this.createLabelSprite(node.name, node.type);
      label.position.set(topPos.x, topPos.y + 160, topPos.z);
      nodeGroup.add(label);

      this.scene.add(nodeGroup);

      this.nodeMeshes[node.id] = {
        group: nodeGroup,
        pillar,
        sphere,
        groundRing,
        pointLight,
        label,
        basePos,
        topPos,
        phase: (idx * Math.PI) / 4
      };
    });
  }

  initArcs() {
    this.arcLines = [];

    Object.values(this.engine.nodes).forEach(node => {
      const deps = node.dependency_node_ids || [];
      deps.forEach(depId => {
        if (!this.nodeMeshes[depId] || !this.nodeMeshes[node.id]) return;

        const pStart = this.nodeMeshes[depId].topPos;
        const pEnd = this.nodeMeshes[node.id].topPos;

        // Elevated 3D Bezier Arc Curve (THREE.CatmullRomCurve3)
        const distance = pStart.distanceTo(pEnd);
        const arcHeight = Math.max(350, distance * 0.35);
        const midPoint = pStart.clone().lerp(pEnd, 0.5);
        midPoint.y += arcHeight;

        const curve = new THREE.CatmullRomCurve3([pStart, midPoint, pEnd]);
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Normal Material: Glowing Cyan Energy Line
        const normalMat = new THREE.LineBasicMaterial({
          color: 0x06B6D4,
          transparent: true,
          opacity: 0.85,
          linewidth: 3
        });

        // Failed Material: Pulsing Red Dashed Beam
        const failedMat = new THREE.LineDashedMaterial({
          color: 0xEF4444,
          dashSize: 60,
          gapSize: 30,
          transparent: true,
          opacity: 1.0,
          linewidth: 4
        });

        const line = new THREE.Line(geometry, normalMat);
        line.computeLineDistances();
        this.scene.add(line);

        this.arcLines.push({
          parentId: depId,
          childId: node.id,
          line,
          geometry,
          normalMat,
          failedMat,
          curve
        });
      });
    });
  }

  update3DVisuals() {
    const nodes = this.engine.nodes;

    // 1. Update Node Cylinders, Spheres & Lights
    Object.keys(this.nodeMeshes).forEach(nodeId => {
      const meshRef = this.nodeMeshes[nodeId];
      const node = nodes[nodeId];
      if (!meshRef || !node) return;

      const color = new THREE.Color(node.colorHex);

      meshRef.pillar.material.color = color;
      meshRef.pillar.material.emissive = color;
      meshRef.sphere.material.color = color;
      meshRef.sphere.material.emissive = color;
      meshRef.groundRing.material.color = color;

      if (node.status === 'failed') {
        // 0% Failed = Crimson Red with active pulsing 3D point light
        meshRef.pointLight.color.set(0xEF4444);
        meshRef.pointLight.intensity = 2.5;
        meshRef.sphere.material.emissiveIntensity = 1.2;
      } else if (node.status === 'degraded') {
        // 15%-50% Degraded = Gold Yellow
        meshRef.pointLight.color.set(0xF59E0B);
        meshRef.pointLight.intensity = 0.5;
        meshRef.sphere.material.emissiveIntensity = 0.6;
      } else {
        // 100% Operational = Neon Green
        meshRef.pointLight.intensity = 0;
        meshRef.sphere.material.emissiveIntensity = 0.4;
      }
    });

    // 2. Update Connected 3D Arcs: If parent fails -> Pulsing Red Dashed Beam
    this.arcLines.forEach(arc => {
      const parentNode = nodes[arc.parentId];
      const isParentFailed = (parentNode && parentNode.operationalCapacity === 0.0);

      if (isParentFailed) {
        arc.line.material = arc.failedMat;
        arc.line.computeLineDistances();
      } else {
        arc.line.material = arc.normalMat;
      }
    });

    if (this.map) {
      this.map.triggerRepaint();
    }
  }

  focusPune() {
    if (!this.map) return;
    this.map.flyTo({
      center: [this.centerLng, this.centerLat],
      zoom: 12.6,
      pitch: 48,
      bearing: -10,
      duration: 1200
    });
  }

  focusNode(nodeId) {
    const node = this.engine.nodes[nodeId];
    if (!node || !this.map) return;
    this.map.flyTo({
      center: [node.lng, node.lat],
      zoom: 14.8,
      pitch: 58,
      bearing: -15,
      duration: 1400
    });
  }

  initMapInteractions() {
    const tooltip = document.getElementById('node-tooltip');

    // Raycast/Project mouse position to Pune infrastructure nodes
    this.map.on('mousemove', e => {
      let closestNode = null;
      let minDistance = 38; // pixel hit radius

      Object.values(this.engine.nodes).forEach(node => {
        const screenPoint = this.map.project([node.lng, node.lat]);
        const dist = Math.hypot(e.point.x - screenPoint.x, e.point.y - screenPoint.y);
        if (dist < minDistance) {
          minDistance = dist;
          closestNode = node;
        }
      });

      if (closestNode) {
        this.hoveredNode = closestNode;
        this.map.getCanvas().style.cursor = 'pointer';

        document.getElementById('tt-name').textContent = closestNode.name;
        document.getElementById('tt-type').textContent = closestNode.type.toUpperCase();
        document.getElementById('tt-id').textContent = closestNode.id;

        const capEl = document.getElementById('tt-cap');
        capEl.textContent = `${Math.round(closestNode.operationalCapacity)}%`;
        capEl.className = `font-mono font-bold ${
          closestNode.operationalCapacity === 100 ? 'text-emerald-400' :
          closestNode.operationalCapacity > 0 ? 'text-amber-400' : 'text-rose-400'
        }`;

        document.getElementById('tt-coords').textContent = `${closestNode.lat.toFixed(4)}°N, ${closestNode.lng.toFixed(4)}°E`;
        const deps = closestNode.dependency_node_ids || [];
        document.getElementById('tt-deps').textContent = deps.length
          ? `Feeds: ${deps.join(', ')}`
          : 'Feed: Direct High-Voltage Grid';

        tooltip.style.left = `${e.originalEvent.clientX}px`;
        tooltip.style.top = `${e.originalEvent.clientY}px`;
        tooltip.style.opacity = '1';
      } else {
        this.hoveredNode = null;
        this.map.getCanvas().style.cursor = '';
        tooltip.style.opacity = '0';
      }
    });

    // Click on node to focus camera
    this.map.on('click', () => {
      if (this.hoveredNode) {
        this.focusNode(this.hoveredNode.id);
      }
    });
  }
}

// --- 4. HUD CONTROLLER & EVENT BINDINGS ---
class HUDController {
  constructor(engine, visualizer) {
    this.engine = engine;
    this.visualizer = visualizer;

    // Cache elements
    this.sliderTemp = document.getElementById('slider-temp');
    this.sliderRain = document.getElementById('slider-rain');
    this.sliderLoad = document.getElementById('slider-load');

    this.valTemp = document.getElementById('val-temp');
    this.valRain = document.getElementById('val-rain');
    this.valLoad = document.getElementById('val-load');

    this.healthValue = document.getElementById('health-value');
    this.healthLabel = document.getElementById('health-label');
    this.gaugeCircle = document.getElementById('gauge-circle');

    this.threatLabel = document.getElementById('threat-label');
    this.threatPing = document.getElementById('threat-ping');
    this.threatDot = document.getElementById('threat-dot');
    this.threatContainer = document.getElementById('threat-container');

    this.secPowerVal = document.getElementById('sec-power-val');
    this.secPowerBar = document.getElementById('sec-power-bar');
    this.secTransitVal = document.getElementById('sec-transit-val');
    this.secTransitBar = document.getElementById('sec-transit-bar');
    this.secWaterVal = document.getElementById('sec-water-val');
    this.secWaterBar = document.getElementById('sec-water-bar');
    this.secHospitalVal = document.getElementById('sec-hospital-val');
    this.secHospitalBar = document.getElementById('sec-hospital-bar');

    this.terminalStream = document.getElementById('terminal-stream');
    this.failedCounter = document.getElementById('failed-counter');
    this.aiAdviceContent = document.getElementById('ai-advice-content');
    this.nodesQuickList = document.getElementById('nodes-quick-list');

    this.btnFocusPune = document.getElementById('btn-focus-pune');
    this.btnToggleOrbit = document.getElementById('btn-toggle-orbit');
    this.btnResetAll = document.getElementById('btn-reset-all');
    this.btnClearTerminal = document.getElementById('btn-clear-terminal');
    this.btnApplyMitigation = document.getElementById('btn-apply-mitigation');

    this.bindEvents();
    this.renderNodeMatrix();
    this.updateHUD();
  }

  bindEvents() {
    const handleSliderInput = () => {
      const temp = this.sliderTemp.value;
      const rain = this.sliderRain.value;
      const load = this.sliderLoad.value;

      this.valTemp.textContent = `${temp}°C`;
      this.valRain.textContent = `${rain} mm/hr`;
      this.valLoad.textContent = `${load}%`;

      this.valTemp.className = `font-mono font-bold text-xs px-2 py-0.5 rounded border ${
        temp > 40 ? 'bg-rose-950 text-rose-400 border-rose-800' : 'bg-amber-950/80 text-amber-400 border-amber-800'
      }`;
      this.valRain.className = `font-mono font-bold text-xs px-2 py-0.5 rounded border ${
        rain > 80 ? 'bg-rose-950 text-rose-400 border-rose-800' : 'bg-cyan-950/80 text-cyan-400 border-cyan-800'
      }`;
      this.valLoad.className = `font-mono font-bold text-xs px-2 py-0.5 rounded border ${
        load > 85 ? 'bg-rose-950 text-rose-400 border-rose-800' : 'bg-yellow-950/80 text-yellow-400 border-yellow-800'
      }`;

      // Run real-time simulation
      this.engine.setInputs(temp, rain, load);
      this.visualizer.update3DVisuals();
      this.updateHUD();
    };

    this.sliderTemp.addEventListener('input', handleSliderInput);
    this.sliderRain.addEventListener('input', handleSliderInput);
    this.sliderLoad.addEventListener('input', handleSliderInput);

    // Scenario Presets
    const presets = [
      { id: 'preset-nominal', temp: 32, rain: 25, load: 70 },
      { id: 'preset-heatwave', temp: 44, rain: 0, load: 90 },
      { id: 'preset-cloudburst', temp: 28, rain: 110, load: 65 },
      { id: 'preset-compound', temp: 43, rain: 95, load: 90 }
    ];

    presets.forEach(p => {
      const btn = document.getElementById(p.id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        this.sliderTemp.value = p.temp;
        this.sliderRain.value = p.rain;
        this.sliderLoad.value = p.load;
        handleSliderInput();

        this.logTerminal(`[SCENARIO LOADED] ${btn.querySelector('div').textContent} applied.`, 'info');
      });
    });

    this.btnFocusPune.addEventListener('click', () => {
      this.visualizer.focusPune();
      this.logTerminal('[CAMERA] View reset to Pune Metropolitan Grid.', 'info');
    });

    this.btnToggleOrbit.addEventListener('click', () => {
      this.visualizer.autoRotate = !this.visualizer.autoRotate;
      const icon = document.getElementById('orbit-icon');
      const text = document.getElementById('orbit-text');
      if (this.visualizer.autoRotate) {
        text.textContent = 'Pause Rotation';
        icon.className = 'fa-solid fa-pause text-cyan-400';
        this.btnToggleOrbit.className = 'text-xs px-2.5 py-1.5 rounded bg-blue-900/60 hover:bg-blue-900/80 text-cyan-300 border border-cyan-500/50 font-medium transition flex items-center gap-1.5';
        this.logTerminal('[CAMERA] Auto-orbit camera rotation resumed.', 'info');
      } else {
        text.textContent = 'Auto Rotate';
        icon.className = 'fa-solid fa-globe text-cyan-400';
        this.btnToggleOrbit.className = 'text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-blue-900/60 hover:text-cyan-300 border border-slate-700 text-slate-200 font-medium transition flex items-center gap-1.5';
        this.logTerminal('[CAMERA] Auto-orbit camera rotation paused.', 'info');
      }
    });

    this.btnResetAll.addEventListener('click', () => {
      document.getElementById('preset-nominal').click();
      this.visualizer.focusPune();
      this.logTerminal('[RESET] All stressors restored to baseline.', 'info');
    });

    this.btnClearTerminal.addEventListener('click', () => {
      this.terminalStream.innerHTML = '';
      this.logTerminal('[TERMINAL RESET] Telemetry cleared.', 'info');
    });

    this.btnApplyMitigation.addEventListener('click', () => {
      this.engine.mitigationActive = true;
      this.engine.recalculate();
      this.visualizer.update3DVisuals();
      this.updateHUD();

      this.logTerminal('[AI COUNTERMEASURES ENGAGED] Mobile gen-sets activated at Sassoon & Deenanath hospitals. Parvati water microgrid isolated.', 'success');
    });
  }

  updateHUD() {
    const health = this.engine.getOverallHealth();
    const sectors = this.engine.getSectorBreakdown();
    const failedNodes = Object.values(this.engine.nodes).filter(n => n.operationalCapacity === 0);
    const degradedNodes = Object.values(this.engine.nodes).filter(n => n.operationalCapacity > 0 && n.operationalCapacity < 100);

    // 1. Overall System Health Gauge
    const maxDash = 264;
    const offset = maxDash - (health / 100) * maxDash;
    this.gaugeCircle.style.strokeDashoffset = offset;
    this.healthValue.textContent = `${health}%`;

    let color = '#10B981';
    let label = 'RESILIENT';
    if (health < 40) {
      color = '#EF4444';
      label = 'COLLAPSE RISK';
    } else if (health < 80) {
      color = '#F59E0B';
      label = 'DEGRADED';
    }
    this.gaugeCircle.style.stroke = color;
    this.healthValue.style.color = color;
    this.healthLabel.textContent = label;
    this.healthLabel.style.color = color;

    // 2. DEFCON Threat Badge
    if (failedNodes.length >= 4) {
      this.threatLabel.textContent = 'DEFCON 1 // CRITICAL COLLAPSE';
      this.threatLabel.className = 'font-display text-xs font-black tracking-wider text-rose-400 font-mono';
      this.threatPing.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75';
      this.threatDot.className = 'relative inline-flex rounded-full h-3 w-3 bg-rose-500';
      this.threatContainer.className = 'glass-panel px-4 py-1.5 flex items-center gap-3 glass-panel-danger pointer-events-auto';
    } else if (failedNodes.length > 0 || degradedNodes.length > 0) {
      this.threatLabel.textContent = 'DEFCON 2 // ACTIVE CASCADE';
      this.threatLabel.className = 'font-display text-xs font-black tracking-wider text-amber-400 font-mono';
      this.threatPing.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75';
      this.threatDot.className = 'relative inline-flex rounded-full h-3 w-3 bg-amber-500';
      this.threatContainer.className = 'glass-panel px-4 py-1.5 flex items-center gap-3 border-amber-500/50 pointer-events-auto';
    } else {
      this.threatLabel.textContent = 'DEFCON 4 // NOMINAL';
      this.threatLabel.className = 'font-display text-xs font-black tracking-wider text-emerald-400 font-mono';
      this.threatPing.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
      this.threatDot.className = 'relative inline-flex rounded-full h-3 w-3 bg-emerald-500';
      this.threatContainer.className = 'glass-panel px-4 py-1.5 flex items-center gap-3 border-emerald-500/40 pointer-events-auto';
    }

    // 3. Sector Status Bars
    const updateBar = (valEl, barEl, data) => {
      valEl.textContent = `${data.avg}% (${data.active}/${data.total})`;
      barEl.style.width = `${data.avg}%`;
      if (data.avg <= 20) {
        barEl.className = 'h-full bg-rose-500 rounded-full transition-all duration-300 shadow-[0_0_8px_#EF4444]';
        valEl.className = 'font-mono font-bold text-rose-400';
      } else if (data.avg <= 75) {
        barEl.className = 'h-full bg-amber-500 rounded-full transition-all duration-300 shadow-[0_0_8px_#F59E0B]';
        valEl.className = 'font-mono font-bold text-amber-400';
      } else {
        barEl.className = 'h-full bg-emerald-500 rounded-full transition-all duration-300 shadow-[0_0_8px_#10B981]';
        valEl.className = 'font-mono font-bold text-emerald-400';
      }
    };

    updateBar(this.secPowerVal, this.secPowerBar, sectors.power);
    updateBar(this.secTransitVal, this.secTransitBar, sectors.transit);
    updateBar(this.secWaterVal, this.secWaterBar, sectors.water);
    updateBar(this.secHospitalVal, this.secHospitalBar, sectors.hospital);

    // 4. Fault Count
    const totalFaults = failedNodes.length + degradedNodes.length;
    this.failedCounter.textContent = `${totalFaults} FAULTS`;
    this.failedCounter.className = `text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
      totalFaults > 0 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'
    }`;

    // 5. Delta Terminal Event Logs
    Object.values(this.engine.nodes).forEach(n => {
      const prev = this.engine.previousStates[n.id];
      const curr = n.operationalCapacity;

      if (prev !== curr) {
        const time = new Date().toLocaleTimeString();
        if (curr === 0) {
          const reason = n.failureReason.length ? n.failureReason.join(' | ') : 'Environmental Trip';
          this.logTerminal(`[${time}] [ALERT] ${n.name} OFFLINE (0%) -> ${reason}`, 'alert');
        } else if (curr <= 50 && prev > 50) {
          const reason = n.failureReason.length ? n.failureReason.join(' | ') : 'Cascading Reduction';
          this.logTerminal(`[${time}] [WARN] ${n.name} DEGRADED to ${curr}% -> ${reason}`, 'warn');
        } else if (curr === 100 && prev < 100) {
          this.logTerminal(`[${time}] [RESTORED] ${n.name} returned to 100% capacity.`, 'success');
        }
        this.engine.previousStates[n.id] = curr;
      }
    });

    // 6. Prescriptive AI Advice
    const advice = this.engine.generateAdvice();
    this.aiAdviceContent.innerHTML = advice.map(adv => `
      <div class="p-2 rounded ${
        adv.type === 'danger' ? 'bg-rose-950/40 border border-rose-800/50' :
        adv.type === 'warning' ? 'bg-amber-950/40 border border-amber-800/50' :
        'bg-slate-800/60 border border-slate-700/50'
      } text-slate-300">
        <div class="flex items-center gap-1.5 ${
          adv.type === 'danger' ? 'text-rose-400' :
          adv.type === 'warning' ? 'text-amber-400' : 'text-emerald-400'
        } font-semibold mb-1">
          <i class="fa-solid ${adv.icon} text-[10px]"></i>
          <span class="font-display text-xs">${adv.title}</span>
        </div>
        <p class="text-[11px] text-slate-300 leading-relaxed">${adv.desc}</p>
      </div>
    `).join('');

    // 7. Update Matrix Badges
    this.updateNodeMatrix();
  }

  renderNodeMatrix() {
    this.nodesQuickList.innerHTML = Object.values(this.engine.nodes).map(node => `
      <div id="matrix-node-${node.id}" class="flex items-center justify-between p-1.5 rounded bg-slate-900/60 hover:bg-blue-950/40 border border-slate-800 cursor-pointer transition text-[11px]" data-node-id="${node.id}">
        <div class="flex items-center gap-1.5 truncate">
          <span class="w-2 h-2 rounded-full matrix-dot bg-emerald-500"></span>
          <span class="truncate text-slate-300 font-medium">${node.name}</span>
        </div>
        <span class="matrix-badge font-mono text-[9px] text-emerald-400 px-1.5 py-0.2 rounded bg-slate-950">100%</span>
      </div>
    `).join('');

    this.nodesQuickList.querySelectorAll('[data-node-id]').forEach(el => {
      el.addEventListener('click', () => {
        const nodeId = el.getAttribute('data-node-id');
        this.visualizer.focusNode(nodeId);
        const node = this.engine.nodes[nodeId];
        this.logTerminal(`[INSPECT] Focused on Node #${nodeId}: ${node.name} (${node.operationalCapacity}%)`, 'info');
      });
    });
  }

  updateNodeMatrix() {
    Object.values(this.engine.nodes).forEach(node => {
      const el = document.getElementById(`matrix-node-${node.id}`);
      if (!el) return;

      const dot = el.querySelector('.matrix-dot');
      const badge = el.querySelector('.matrix-badge');

      badge.textContent = `${Math.round(node.operationalCapacity)}%`;

      if (node.status === 'failed') {
        dot.className = 'w-2 h-2 rounded-full matrix-dot bg-rose-500 shadow-[0_0_6px_#EF4444]';
        badge.className = 'matrix-badge font-mono text-[9px] text-rose-400 font-bold px-1.5 py-0.2 rounded bg-rose-950 border border-rose-800';
      } else if (node.status === 'degraded') {
        dot.className = 'w-2 h-2 rounded-full matrix-dot bg-amber-500 shadow-[0_0_6px_#F59E0B]';
        badge.className = 'matrix-badge font-mono text-[9px] text-amber-400 font-bold px-1.5 py-0.2 rounded bg-amber-950 border border-amber-800';
      } else {
        dot.className = 'w-2 h-2 rounded-full matrix-dot bg-emerald-500 shadow-[0_0_6px_#10B981]';
        badge.className = 'matrix-badge font-mono text-[9px] text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800';
      }
    });
  }

  logTerminal(message, type = 'info') {
    const entry = document.createElement('div');
    if (type === 'alert') {
      entry.className = 'text-rose-400 font-semibold leading-tight';
    } else if (type === 'warn') {
      entry.className = 'text-amber-400 leading-tight';
    } else if (type === 'success') {
      entry.className = 'text-emerald-400 leading-tight';
    } else {
      entry.className = 'text-slate-400 leading-tight';
    }
    entry.textContent = message;
    this.terminalStream.appendChild(entry);
    this.terminalStream.scrollTop = this.terminalStream.scrollHeight;
  }
}

// --- 5. DOM INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
  console.log("%c[RE-DEFEND AI] Launching Geospatial 3D Stress Engine...", "color:#38BDF8;font-weight:bold;font-size:14px;");

  try {
    const engine = new ClimateSimulationEngine();
    const visualizer = new CyberpunkGeospatialVisualizer('map', engine);
    const hud = new HUDController(engine, visualizer);

    // Initial calculation and visual pass
    engine.recalculate();
    hud.updateHUD();

    console.log("%c[RE-DEFEND AI] Geospatial Map & 3D Layer Synchronized.", "color:#10B981;font-weight:bold;");
  } catch (err) {
    console.error("[RE-DEFEND AI] Initialization Error:", err);
  }
});
