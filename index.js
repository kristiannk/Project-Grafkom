let currentCircuit = null;
let animationId = null;
let isAnimating = false;
let raceCar = null;

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
        // Generate a closed loop circuit with minimal straights
        const numPoints = 12 + Math.floor(Math.random() * 8); // 12-20 points
        const radius = Math.min(this.width, this.height) * 0.35;
        
        this.points = [];
        
        // Create base polygon with variations
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const variance = 0.7 + Math.random() * 0.6; // 70% to 130% of radius
            const r = radius * variance;
            
            const x = this.centerX + Math.cos(angle) * r;
            const y = this.centerY + Math.sin(angle) * r;
            
            this.points.push({ x, y, angle });
        }

        // Ensure the circuit closes properly
        this.points.push({ ...this.points[0] });

        // Calculate segments and identify straights vs corners
        this.analyzeTrack();
        
        // Limit straight sections to ~10%
        this.optimizeStraights();
        
        // Generate smooth Bezier curves
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
            
            // Determine if straight (angle change < 15 degrees)
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
        // Target: only 10% straight
        const targetStraight = this.totalLength * 0.10;
        
        while (this.straightLength > targetStraight && this.segments.length > 8) {
            // Find longest straight and convert to curve
            const straightSegments = this.segments.filter(s => s.isStraight);
            if (straightSegments.length === 0) break;
            
            straightSegments.sort((a, b) => b.length - a.length);
            const longest = straightSegments[0];
            
            // Add midpoint with offset to create curve
            const midIndex = this.points.indexOf(longest.from) + 1;
            const midX = (longest.from.x + longest.to.x) / 2;
            const midY = (longest.from.y + longest.to.y) / 2;
            
            // Perpendicular offset
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
            
            // Re-analyze
            this.analyzeTrack();
        }
    }

    smoothTrack() {
        // Convert to smooth Bezier path
        this.pathPoints = [];
        
        for (let i = 0; i < this.points.length - 1; i++) {
            const p0 = this.points[i === 0 ? this.points.length - 2 : i - 1];
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            const p3 = this.points[i + 2] || this.points[1];

            // Catmull-Rom to Bezier conversion
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
                
                // Check distance from track
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

function generateNewCircuit() {
    const loading = document.getElementById('loading');
    const svg = document.getElementById('circuit-svg');
    
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

    // Track border (white)
    const border = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    border.setAttribute('d', pathData);
    border.setAttribute('class', 'track-border');
    trackLayer.appendChild(border);

    // Track surface (asphalt)
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

    // DRS Zone (longest straight or random section)
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

    // Interactive hover effect
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

function startAnimation() {
    if (!currentCircuit) return;
    isAnimating = true;
    
    const overlayLayer = document.getElementById('overlay-layer');
    
    // Create race car
    raceCar = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    raceCar.setAttribute('r', '8');
    raceCar.setAttribute('fill', '#ff6b6b');
    raceCar.setAttribute('stroke', '#fff');
    raceCar.setAttribute('stroke-width', '2');
    raceCar.setAttribute('filter', 'url(#glow)');
    overlayLayer.appendChild(raceCar);
    
    let progress = 0;
    const speed = 0.002;
    
    function animate() {
        if (!isAnimating) return;
        
        progress += speed;
        if (progress >= 1) progress = 0;
        
        const point = getPointAtProgress(currentCircuit, progress);
        raceCar.setAttribute('cx', point.x);
        raceCar.setAttribute('cy', point.y);
        
        animationId = requestAnimationFrame(animate);
    }
    
    animate();
}

function stopAnimation() {
    isAnimating = false;
    if (animationId) cancelAnimationFrame(animationId);
    if (raceCar) {
        raceCar.remove();
        raceCar = null;
    }
}

function getPointAtProgress(circuit, t) {
    const totalSegments = circuit.points.length - 1;
    const segmentIndex = Math.floor(t * totalSegments);
    const segmentT = (t * totalSegments) % 1;
    
    const p1 = circuit.points[segmentIndex];
    const p2 = circuit.points[segmentIndex + 1] || circuit.points[0];
    
    return {
        x: p1.x + (p2.x - p1.x) * segmentT,
        y: p1.y + (p2.y - p1.y) * segmentT
    };
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

// Initialize on load
window.onload = generateNewCircuit;