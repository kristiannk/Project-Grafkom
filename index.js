let currentCircuit = null;
let animationId = null;
let isAnimating = false;
let raceVehicle = null;
let vehicleType = 'f1'; // 'f1' atau 'motor'

// Variabel untuk path tracking
let trackPathElement = null;
let totalTrackLength = 0;
let currentDistance = 0;

class CircuitGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.centerX = width / 2;
        this.centerY = height / 2;
        this.points = [];
        this.segments = [];
        this.corners = [];
        this.totalLength = 0;
        this.straightLength = 0;
    }

    generate() {
        const numPoints = 12 + Math.floor(Math.random() * 8);
        const radius = Math.min(this.width, this.height) * 0.35;
        
        this.points = [];
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const variance = 0.7 + Math.random() * 0.6;
            const r = radius * variance;
            
            const x = this.centerX + Math.cos(angle) * r;
            const y = this.centerY + Math.sin(angle) * r;
            
            this.points.push({ x, y, angle });
        }

        this.points.push({ ...this.points[0] });
        this.analyzeTrack();
        this.optimizeStraights();
        this.smoothTrack();
        
        return this;
    }

    analyzeTrack() {
        this.segments = [];
        this.totalLength = 0;
        this.straightLength = 0;

        for (let i = 0; i < this.points.length - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            
            let isStraight = false;
            if (i > 0) {
                const prev = this.points[i - 1];
                const angle1 = Math.atan2(p1.y - prev.y, p1.x - prev.x);
                const angle2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const diff = Math.abs(angle2 - angle1);
                const deg = (diff * 180 / Math.PI) % 360;
                isStraight = deg < 15 || deg > 345;
            }

            this.segments.push({
                from: p1,
                to: p2,
                length: dist,
                isStraight: isStraight,
                index: i
            });

            this.totalLength += dist;
            if (isStraight) this.straightLength += dist;
        }
    }

    optimizeStraights() {
        const targetStraight = this.totalLength * 0.10;
        
        while (this.straightLength > targetStraight && this.segments.length > 8) {
            const straightSegments = this.segments.filter(s => s.isStraight);
            if (straightSegments.length === 0) break;
            
            straightSegments.sort((a, b) => b.length - a.length);
            const longest = straightSegments[0];
            
            const midIndex = this.points.indexOf(longest.from) + 1;
            const midX = (longest.from.x + longest.to.x) / 2;
            const midY = (longest.from.y + longest.to.y) / 2;
            
            const dx = longest.to.x - longest.from.x;
            const dy = longest.to.y - longest.from.y;
            const len = Math.hypot(dx, dy);
            const offsetX = (-dy / len) * (len * 0.2);
            const offsetY = (dx / len) * (len * 0.2);
            
            const newPoint = {
                x: midX + offsetX,
                y: midY + offsetY,
                angle: longest.from.angle
            };
            
            this.points.splice(midIndex, 0, newPoint);
            this.analyzeTrack();
        }
    }

    smoothTrack() {
        this.pathPoints = [];
        
        for (let i = 0; i < this.points.length - 1; i++) {
            const p0 = this.points[i === 0 ? this.points.length - 2 : i - 1];
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            const p3 = this.points[i + 2] || this.points[1];

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            this.pathPoints.push({
                type: 'C',
                x1: cp1x, y1: cp1y,
                x2: cp2x, y2: cp2y,
                x: p2.x, y: p2.y,
                start: p1
            });
        }
    }

    generateCity() {
        const buildings = [];
        const numBuildings = 80;
        
        for (let i = 0; i < numBuildings; i++) {
            let valid = false;
            let attempts = 0;
            let building;
            
            while (!valid && attempts < 50) {
                const x = Math.random() * this.width;
                const y = Math.random() * this.height;
                const w = 20 + Math.random() * 60;
                const h = 20 + Math.random() * 60;
                
                const dist = this.distanceToTrack(x, y);
                
                if (dist > 60 && dist < 300) {
                    building = { x, y, w, h, type: Math.random() > 0.8 ? 'park' : 'building' };
                    valid = true;
                }
                attempts++;
            }
            
            if (valid) buildings.push(building);
        }
        
        return buildings;
    }

    distanceToTrack(x, y) {
        let minDist = Infinity;
        for (let i = 0; i < this.points.length - 1; i++) {
            const dist = this.pointToLineDistance(
                x, y,
                this.points[i].x, this.points[i].y,
                this.points[i + 1].x, this.points[i + 1].y
            );
            minDist = Math.min(minDist, dist);
        }
        return minDist;
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getPathData() {
        if (this.pathPoints.length === 0) return '';
        
        let d = `M ${this.points[0].x} ${this.points[0].y}`;
        this.pathPoints.forEach(p => {
            d += ` C ${p.x1} ${p.y1}, ${p.x2} ${p.y2}, ${p.x} ${p.y}`;
        });
        d += ' Z';
        return d;
    }
}

// 🎨 FUNGSI MEMBUAT MOBIL F1 (TOP VIEW)
function createF1Car() {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'race-vehicle');
    
    const mainColor = '#ff0000';
    const darkColor = '#8b0000';
    const tireColor = '#1a1a1a';
    const cockpitColor = '#2c3e50';
    
    // Body utama
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    body.setAttribute('cx', '0');
    body.setAttribute('cy', '0');
    body.setAttribute('rx', '14');
    body.setAttribute('ry', '6');
    body.setAttribute('fill', mainColor);
    body.setAttribute('stroke', darkColor);
    body.setAttribute('stroke-width', '1');
    g.appendChild(body);
    
    // Cockpit
    const cockpit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    cockpit.setAttribute('cx', '-2');
    cockpit.setAttribute('cy', '0');
    cockpit.setAttribute('r', '3');
    cockpit.setAttribute('fill', cockpitColor);
    g.appendChild(cockpit);
    
    // Front Wing
    const frontWing = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    frontWing.setAttribute('x', '12');
    frontWing.setAttribute('y', '-5');
    frontWing.setAttribute('width', '4');
    frontWing.setAttribute('height', '10');
    frontWing.setAttribute('fill', mainColor);
    frontWing.setAttribute('rx', '1');
    g.appendChild(frontWing);
    
    // Rear Wing
    const rearWing = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rearWing.setAttribute('x', '-16');
    rearWing.setAttribute('y', '-6');
    rearWing.setAttribute('width', '3');
    rearWing.setAttribute('height', '12');
    rearWing.setAttribute('fill', mainColor);
    rearWing.setAttribute('rx', '1');
    g.appendChild(rearWing);
    
    // Roda Depan Kiri
    const flWheel = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    flWheel.setAttribute('cx', '8');
    flWheel.setAttribute('cy', '-5');
    flWheel.setAttribute('r', '2.5');
    flWheel.setAttribute('fill', tireColor);
    g.appendChild(flWheel);
    
    // Roda Depan Kanan
    const frWheel = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    frWheel.setAttribute('cx', '8');
    frWheel.setAttribute('cy', '5');
    frWheel.setAttribute('r', '2.5');
    frWheel.setAttribute('fill', tireColor);
    g.appendChild(frWheel);
    
    // Roda Belakang Kiri
    const rlWheel = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rlWheel.setAttribute('cx', '-8');
    rlWheel.setAttribute('cy', '-5');
    rlWheel.setAttribute('r', '3');
    rlWheel.setAttribute('fill', tireColor);
    g.appendChild(rlWheel);
    
    // Roda Belakang Kanan
    const rrWheel = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rrWheel.setAttribute('cx', '-8');
    rrWheel.setAttribute('cy', '5');
    rrWheel.setAttribute('r', '3');
    rrWheel.setAttribute('fill', tireColor);
    g.appendChild(rrWheel);
    
    // Halo
    const halo = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    halo.setAttribute('d', 'M 0,-4 Q 4,0 0,4');
    halo.setAttribute('fill', 'none');
    halo.setAttribute('stroke', '#000');
    halo.setAttribute('stroke-width', '1');
    g.appendChild(halo);
    
    // Nomor mobil
    const number = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    number.setAttribute('x', '2');
    number.setAttribute('y', '1');
    number.setAttribute('text-anchor', 'middle');
    number.setAttribute('fill', '#fff');
    number.setAttribute('font-size', '4');
    number.setAttribute('font-weight', 'bold');
    number.textContent = '1';
    g.appendChild(number);
    
    return g;
}

// 🏍️ FUNGSI MEMBUAT MOTOR GP (TOP VIEW)
function createMotorcycle() {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('id', 'race-vehicle');
    
    const bodyColor = '#ff6600';
    const tireColor = '#1a1a1a';
    
    // Body utama
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    body.setAttribute('x', '-8');
    body.setAttribute('y', '-2');
    body.setAttribute('width', '16');
    body.setAttribute('height', '4');
    body.setAttribute('rx', '2');
    body.setAttribute('fill', bodyColor);
    g.appendChild(body);
    
    // Tangki
    const tank = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    tank.setAttribute('cx', '2');
    tank.setAttribute('cy', '0');
    tank.setAttribute('rx', '4');
    tank.setAttribute('ry', '2.5');
    tank.setAttribute('fill', bodyColor);
    tank.setAttribute('stroke', '#cc5200');
    tank.setAttribute('stroke-width', '0.5');
    g.appendChild(tank);
    
    // Roda Depan
    const frontWheel = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    frontWheel.setAttribute('cx', '10');
    frontWheel.setAttribute('cy', '0');
    frontWheel.setAttribute('r', '3.5');
    frontWheel.setAttribute('fill', 'none');
    frontWheel.setAttribute('stroke', tireColor);
    frontWheel.setAttribute('stroke-width', '2');
    g.appendChild(frontWheel);
    
    // Roda Belakang
    const rearWheel = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rearWheel.setAttribute('cx', '-10');
    rearWheel.setAttribute('cy', '0');
    rearWheel.setAttribute('r', '3.5');
    rearWheel.setAttribute('fill', 'none');
    rearWheel.setAttribute('stroke', tireColor);
    rearWheel.setAttribute('stroke-width', '2');
    g.appendChild(rearWheel);
    
    // Stang
    const handleBar = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    handleBar.setAttribute('x1', '6');
    handleBar.setAttribute('y1', '-3');
    handleBar.setAttribute('x2', '6');
    handleBar.setAttribute('y2', '3');
    handleBar.setAttribute('stroke', '#silver');
    handleBar.setAttribute('stroke-width', '1');
    g.appendChild(handleBar);
    
    // Knalpot
    const exhaust = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    exhaust.setAttribute('x', '-12');
    exhaust.setAttribute('y', '-1');
    exhaust.setAttribute('width', '4');
    exhaust.setAttribute('height', '2');
    exhaust.setAttribute('fill', '#silver');
    g.appendChild(exhaust);
    
    // Nomor
    const number = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    number.setAttribute('x', '0');
    number.setAttribute('y', '1');
    number.setAttribute('text-anchor', 'middle');
    number.setAttribute('fill', '#fff');
    number.setAttribute('font-size', '3');
    number.setAttribute('font-weight', 'bold');
    number.textContent = '93';
    g.appendChild(number);
    
    return g;
}

function setVehicleType(type) {
    vehicleType = type;
    if (isAnimating) {
        stopAnimation();
        startAnimation();
    }
}

function generateNewCircuit() {
    const loading = document.getElementById('loading');
    
    loading.style.display = 'block';
    loading.classList.add('generating');
    
    setTimeout(() => {
        const gen = new CircuitGenerator(1000, 800);
        currentCircuit = gen.generate();
        renderCircuit(currentCircuit);
        
        document.getElementById('length').textContent = Math.floor(currentCircuit.totalLength);
        document.getElementById('corners').textContent = currentCircuit.points.length - 1;
        document.getElementById('straight-pct').textContent = 
            Math.floor((currentCircuit.straightLength / currentCircuit.totalLength) * 100);
        
        loading.style.display = 'none';
        loading.classList.remove('generating');
        
        if (isAnimating) {
            stopAnimation();
            startAnimation();
        }
    }, 100);
}

function renderCircuit(circuit) {
    const cityLayer = document.getElementById('city-layer');
    const trackLayer = document.getElementById('track-layer');
    const overlayLayer = document.getElementById('overlay-layer');
    
    cityLayer.innerHTML = '';
    trackLayer.innerHTML = '';
    overlayLayer.innerHTML = '';

    // Render city
    const buildings = circuit.generateCity();
    buildings.forEach((b, i) => {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', b.x);
        rect.setAttribute('y', b.y);
        rect.setAttribute('width', b.w);
        rect.setAttribute('height', b.h);
        rect.setAttribute('class', b.type);
        rect.setAttribute('rx', b.type === 'park' ? 10 : 2);
        
        if (b.type === 'building') {
            rect.setAttribute('fill', `hsl(${210 + Math.random() * 40}, 20%, ${30 + Math.random() * 20}%)`);
        }
        
        cityLayer.appendChild(rect);
    });

    const pathData = circuit.getPathData();

    // Simpan path element untuk animasi (hidden, hanya untuk perhitungan)
    trackPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trackPathElement.setAttribute('d', pathData);
    trackPathElement.style.display = 'none';
    overlayLayer.appendChild(trackPathElement);
    
    // Hitung total panjang path
    totalTrackLength = trackPathElement.getTotalLength();

    // Track border
    const border = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    border.setAttribute('d', pathData);
    border.setAttribute('class', 'track-border');
    trackLayer.appendChild(border);

    // Track surface
    const surface = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    surface.setAttribute('d', pathData);
    surface.setAttribute('class', 'track-surface');
    trackLayer.appendChild(surface);

    // Curbs
    const curb = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    curb.setAttribute('d', pathData);
    curb.setAttribute('class', 'track-curb');
    trackLayer.appendChild(curb);

    // Racing line
    const racingLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    racingLine.setAttribute('d', pathData);
    racingLine.setAttribute('class', 'track-racing-line');
    trackLayer.appendChild(racingLine);

    // DRS Zone
    if (circuit.segments.length > 0) {
        const longestStraight = circuit.segments.reduce((max, s) => 
            s.isStraight && s.length > max.length ? s : max, circuit.segments[0]);
        
        if (longestStraight.isStraight) {
            const drsPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = `M ${longestStraight.from.x} ${longestStraight.from.y} L ${longestStraight.to.x} ${longestStraight.to.y}`;
            drsPath.setAttribute('d', d);
            drsPath.setAttribute('class', 'drs-zone');
            trackLayer.appendChild(drsPath);
        }
    }

    // Start/Finish line
    const startPoint = circuit.points[0];
    const nextPoint = circuit.points[1];
    const angle = Math.atan2(nextPoint.y - startPoint.y, nextPoint.x - startPoint.x);
    
    const startLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const offsetX = Math.sin(angle) * 19;
    const offsetY = -Math.cos(angle) * 19;
    
    startLine.setAttribute('x1', startPoint.x - offsetX);
    startLine.setAttribute('y1', startPoint.y - offsetY);
    startLine.setAttribute('x2', startPoint.x + offsetX);
    startLine.setAttribute('y2', startPoint.y + offsetY);
    startLine.setAttribute('class', 'start-line');
    overlayLayer.appendChild(startLine);

    // Direction arrows
    for (let i = 0; i < circuit.points.length - 1; i += 2) {
        const p1 = circuit.points[i];
        const p2 = circuit.points[i + 1];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const size = 8;
        const points = `
            ${midX + Math.cos(angle) * size},${midY + Math.sin(angle) * size}
            ${midX + Math.cos(angle + 2.5) * size},${midY + Math.sin(angle + 2.5) * size}
            ${midX + Math.cos(angle - 2.5) * size},${midY + Math.sin(angle - 2.5) * size}
        `;
        arrow.setAttribute('points', points);
        arrow.setAttribute('class', 'direction-arrow');
        overlayLayer.appendChild(arrow);
    }

    // Corner numbers
    let cornerNum = 1;
    circuit.segments.forEach((seg, i) => {
        if (!seg.isStraight) {
            const midX = (seg.from.x + seg.to.x) / 2;
            const midY = (seg.from.y + seg.to.y) / 2;
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', midX);
            text.setAttribute('y', midY);
            text.setAttribute('class', 'corner-number');
            text.textContent = cornerNum++;
            overlayLayer.appendChild(text);
        }
    });

    // Interactive hover
    const hoverPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hoverPath.setAttribute('d', pathData);
    hoverPath.setAttribute('fill', 'none');
    hoverPath.setAttribute('stroke', 'transparent');
    hoverPath.setAttribute('stroke-width', '60');
    hoverPath.style.cursor = 'pointer';
    
    const tooltip = document.getElementById('tooltip');
    
    hoverPath.addEventListener('mousemove', (e) => {
        const rect = document.getElementById('circuit-container').getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        tooltip.style.left = (x + 10) + 'px';
        tooltip.style.top = (y - 30) + 'px';
        tooltip.style.opacity = '1';
        tooltip.innerHTML = `
            <strong>Sector ${Math.floor((x / 1000) * 3) + 1}</strong><br>
            Distance: ${Math.floor(circuit.distanceToTrack(x * (1000/rect.width), y * (800/rect.height)))}m from center
        `;
    });
    
    hoverPath.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
    });
    
    overlayLayer.appendChild(hoverPath);
}

function toggleAnimation() {
    if (isAnimating) {
        stopAnimation();
    } else {
        startAnimation();
    }
}

// FUNGSI BARU: Dapatkan posisi dan rotasi mulus dari SVG path
function getSmoothVehicleTransform(distance) {
    if (!trackPathElement || totalTrackLength === 0) {
        return { x: 500, y: 400, angle: 0 };
    }
    
    // Normalisasi distance (loop kembali ke awal jika melebihi panjang)
    const currentDistance = distance % totalTrackLength;
    
    // Dapatkan posisi exact di path menggunakan SVG API
    const point = trackPathElement.getPointAtLength(currentDistance);
    
    // Dapatkan posisi sedikit di depan untuk menghitung arah (tangent)
    // Gunakan jarak kecil (2-5 pixel) untuk perhitungan rotasi yang halus
    let lookAheadDistance = currentDistance + 3;
    if (lookAheadDistance > totalTrackLength) {
        lookAheadDistance = lookAheadDistance - totalTrackLength; // Loop back
    }
    
    const nextPoint = trackPathElement.getPointAtLength(lookAheadDistance);
    
    // Hitung sudut rotasi berdasarkan arah tangent
    const dx = nextPoint.x - point.x;
    const dy = nextPoint.y - point.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    return {
        x: point.x,
        y: point.y,
        angle: angle
    };
}

function startAnimation() {
    if (!currentCircuit || !trackPathElement) return;
    isAnimating = true;
    
    const overlayLayer = document.getElementById('overlay-layer');
    
    // Reset distance
    currentDistance = 0;
    
    // Pilih jenis kendaraan
    if (vehicleType === 'f1') {
        raceVehicle = createF1Car();
    } else {
        raceVehicle = createMotorcycle();
    }
    
    overlayLayer.appendChild(raceVehicle);
    
    // Kecepatan konsisten: pixel per detik
    const speed = 180; // 180 pixel per detik
    
    let lastTime = performance.now();
    
    function animate(currentTime) {
        if (!isAnimating) return;
        
        // Hitung delta time untuk animasi smooth terlepas dari FPS
        const deltaTime = (currentTime - lastTime) / 1000; // Konversi ke detik
        lastTime = currentTime;
        
        // Update jarak berdasarkan waktu
        currentDistance += speed * deltaTime;
        
        // Dapatkan transformasi mulus dari path
        const transform = getSmoothVehicleTransform(currentDistance);
        
        // Terapkan transformasi dengan rotasi yang mulus
        // Kendaraan mengikuti arah jalan secara natural
        raceVehicle.setAttribute('transform', 
            `translate(${transform.x}, ${transform.y}) rotate(${transform.angle})`
        );
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
}

function stopAnimation() {
    isAnimating = false;
    if (animationId) cancelAnimationFrame(animationId);
    if (raceVehicle) {
        raceVehicle.remove();
        raceVehicle = null;
    }
    currentDistance = 0;
}

function downloadSVG() {
    const svg = document.getElementById('circuit-svg');
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "urban_circuit_map.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function toggleVehicle() {
    setVehicleType(vehicleType === 'f1' ? 'motor' : 'f1');
    const btn = document.getElementById('vehicle-toggle-btn');
    if (btn) {
        btn.textContent = vehicleType === 'f1' ? '🏎️ Switch to Motorcycle' : '🏍️ Switch to F1 Car';
    }
}

window.onload = generateNewCircuit;