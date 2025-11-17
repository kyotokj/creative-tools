let angleSlider, lengthSlider, randomColorsBtn, saveBtn, fractalSelect;
let canvas;
let palette;
let juliaGraphics;
let mandelGraphics;

function setup() {
    const container = document.getElementById('canvas-container');
    const w = container.clientWidth || windowWidth;
    const h = container.clientHeight || windowHeight;
    const dpr = min(2, window.devicePixelRatio || 1);
    pixelDensity(dpr);

    canvas = createCanvas(w, h);
    canvas.parent(container);

    fractalSelect = select('#fractalType');
    angleSlider = select('#angleSlider');
    lengthSlider = select('#lengthSlider');
    randomColorsBtn = select('#randomColors');
    saveBtn = select('#saveBtn');

    palette = [color(30, 90, 60), color(120, 200, 150)];

    fractalSelect.changed(redraw);
    angleSlider.input(redraw);
    lengthSlider.input(redraw);
    randomColorsBtn.mousePressed(() => {
        palette = [
            color(random(50, 255), random(50, 255), random(50, 255)),
            color(random(50, 255), random(50, 255), random(50, 255))
        ];
        redraw();
    });
    saveBtn.mousePressed(() => {
        saveCanvas(canvas, 'fractale', 'png');
    });

    noLoop();
    redraw();
}

function draw() {
    background(10);
    const type = fractalSelect.value();
    if (type === 'tree') {
        drawTree();
    } else if (type === 'sierpinski') {
        drawSierpinskiWrapper();
    } else if (type === 'koch') {
        drawKochWrapper();
    } else if (type === 'julia') {
        drawJulia();
    } else if (type === 'mandelbrot') {
        drawMandelbrot();
    } else if (type === 'mix') {
        drawMixed();
    }
}

/* ---------- Mix aléatoire ---------- */
function drawMixed() {
    // nombre de couches aléatoires
    const layers = floor(random(3, 8));
    // copie de la palette pour variations locales
    const basePalette = palette.slice();

    for (let i = 0; i < layers; i++) {
        // choix aléatoire de fractale
        const types = ['tree', 'sierpinski', 'koch', 'julia', 'mandelbrot'];
        const t = randomChoice(types);

        // sauvegarde valeurs sliders
        const oldAngle = angleSlider.value();
        const oldLength = lengthSlider.value();

        // petites variations locales
        angleSlider.value(floor(random(0, 90)));
        lengthSlider.value(floor(random(50, 200)));

        // variation palette temporaire
        const savedPalette = palette.slice();
        palette = [
            lerpColor(basePalette[0], color(random(50,255), random(50,255), random(50,255)), random(0,1)),
            lerpColor(basePalette[1], color(random(50,255), random(50,255), random(50,255)), random(0,1))
        ];

        // sauvegarde et modifie alpha du contexte (affecte vecteurs et images)
        const ctx = drawingContext;
        const oldAlpha = ctx ? ctx.globalAlpha : 1;

        if (ctx) ctx.globalAlpha = random(0.15, 0.85);

        push();
        // transformations aléatoires centrées
        translate(width / 2 + random(-width * 0.08, width * 0.08), height / 2 + random(-height * 0.08, height * 0.08));
        scale(random(0.6, 1.6));
        rotate(random(-PI / 8, PI / 8));
        // appeler la fractale choisie
        if (t === 'tree') drawTree();
        else if (t === 'sierpinski') drawSierpinskiWrapper();
        else if (t === 'koch') drawKochWrapper();
        else if (t === 'julia') drawJulia();
        else if (t === 'mandelbrot') drawMandelbrot();
        pop();

        // restaurations
        if (ctx) ctx.globalAlpha = oldAlpha;
        palette = savedPalette;
        angleSlider.value(oldAngle);
        lengthSlider.value(oldLength);
    }
}

/* ---------- utilitaires ---------- */
function randomChoice(arr) {
    return arr[floor(random(0, arr.length))];
}

/* ---------- Arbre fractal ---------- */
function drawTree() {
    push();
    translate(width / 2, height);
    strokeWeight(2);
    stroke(palette[0]);
    let len = Number(lengthSlider.value());
    let angle = radians(Number(angleSlider.value()));
    drawBranch(len, angle);
    pop();
}

function drawBranch(len, angle) {
    stroke(lerpColor(palette[0], palette[1], map(len, 10, 200, 0, 1)));
    line(0, 0, 0, -len);
    translate(0, -len);
    if (len > 8) {
        push();
        rotate(angle);
        drawBranch(len * 0.67, angle);
        pop();

        push();
        rotate(-angle);
        drawBranch(len * 0.67, angle);
        pop();
    }
}



/* ---------- Flocon de Koch ---------- */
function drawKochWrapper() {
    push();
    translate(width / 2, height / 2 + 30);
    noFill();
    stroke(palette[0]);
    strokeWeight(1.5);
    const len = min(width, height) * 0.6;
    const depth = floor(map(Number(lengthSlider.value()), 50, 200, 0, 4));
    const p1 = createVector(-len / 2, len * 0.288675);
    const p2 = createVector(0, -len * 0.57735);
    const p3 = createVector(len / 2, len * 0.288675);

    drawKoch(p1, p2, depth);
    drawKoch(p2, p3, depth);
    drawKoch(p3, p1, depth);
    pop();
}

function drawKoch(a, b, depth) {
    if (depth === 0) {
        line(a.x, a.y, b.x, b.y);
    } else {
        const v = p5.Vector.sub(b, a);
        const oneThird = p5.Vector.add(a, p5.Vector.mult(v, 1 / 3));
        const twoThird = p5.Vector.add(a, p5.Vector.mult(v, 2 / 3));
        const peak = p5.Vector.add(oneThird, p5.Vector.rotate(p5.Vector.sub(twoThird, oneThird), -PI / 3).mult(1));
        drawKoch(a, oneThird, depth - 1);
        drawKoch(oneThird, peak, depth - 1);
        drawKoch(peak, twoThird, depth - 1);
        drawKoch(twoThird, b, depth - 1);
    }
}

/* ---------- Fractale de Julia ---------- */
function drawJulia() {
    if (!juliaGraphics || juliaGraphics.width !== width || juliaGraphics.height !== height) {
        juliaGraphics = createGraphics(width, height);
        const dpr = min(2, window.devicePixelRatio || 1);
        juliaGraphics.pixelDensity(dpr);
    }
    juliaGraphics.loadPixels();
    const maxIter = floor(map(Number(lengthSlider.value()), 50, 200, 50, 400));
    const zoom = map(Number(angleSlider.value()), 0, 90, 1.0, 0.5);
    const cx = -0.7;
    const cy = 0.27015;

    for (let x = 0; x < juliaGraphics.width; x++) {
        for (let y = 0; y < juliaGraphics.height; y++) {
            let zx = map(x, 0, juliaGraphics.width, -1.5 * zoom, 1.5 * zoom);
            let zy = map(y, 0, juliaGraphics.height, -1.0 * zoom, 1.0 * zoom);
            let i = 0;
            while (i < maxIter && zx * zx + zy * zy < 4) {
                const xt = zx * zx - zy * zy + cx;
                zy = 2 * zx * zy + cy;
                zx = xt;
                i++;
            }
            const idx = 4 * (x + y * juliaGraphics.width);
            let col;
            if (i === maxIter) col = color(0);
            else {
                const t = map(i, 0, maxIter, 0, 1);
                col = lerpColor(palette[0], palette[1], t);
            }
            juliaGraphics.pixels[idx] = red(col);
            juliaGraphics.pixels[idx + 1] = green(col);
            juliaGraphics.pixels[idx + 2] = blue(col);
            juliaGraphics.pixels[idx + 3] = 255;
        }
    }
    juliaGraphics.updatePixels();
    image(juliaGraphics, 0, 0, width, height);
}

/* ---------- Fractale de Mandelbrot ---------- */
function drawMandelbrot() {
    if (!mandelGraphics || mandelGraphics.width !== width || mandelGraphics.height !== height) {
        mandelGraphics = createGraphics(width, height);
        const dpr = min(2, window.devicePixelRatio || 1);
        mandelGraphics.pixelDensity(dpr);
    }
    mandelGraphics.loadPixels();
    const maxIter = floor(map(Number(lengthSlider.value()), 50, 200, 100, 1000));
    const zoom = map(Number(angleSlider.value()), 0, 90, 1.0, 0.4);
    const cxOffset = -0.5;
    const cyOffset = 0.0;

    for (let x = 0; x < mandelGraphics.width; x++) {
        for (let y = 0; y < mandelGraphics.height; y++) {
            const a = map(x, 0, mandelGraphics.width, -2.5 * zoom + cxOffset, 1.0 * zoom + cxOffset);
            const b = map(y, 0, mandelGraphics.height, -1.25 * zoom + cyOffset, 1.25 * zoom + cyOffset);
            let ca = a;
            let cb = b;
            let za = 0;
            let zb = 0;
            let i = 0;
            while (i < maxIter && za * za + zb * zb <= 4) {
                const zaNew = za * za - zb * zb + ca;
                zb = 2 * za * zb + cb;
                za = zaNew;
                i++;
            }
            const idx = 4 * (x + y * mandelGraphics.width);
            let col;
            if (i === maxIter) col = color(0);
            else {
                const mu = i - Math.log(Math.log(max(za * za + zb * zb, 1e-8))) / Math.log(2);
                const t = constrain(map(mu, 0, maxIter, 0, 1), 0, 1);
                col = lerpColor(palette[0], palette[1], t);
            }
            mandelGraphics.pixels[idx] = red(col);
            mandelGraphics.pixels[idx + 1] = green(col);
            mandelGraphics.pixels[idx + 2] = blue(col);
            mandelGraphics.pixels[idx + 3] = 255;
        }
    }
    mandelGraphics.updatePixels();
    image(mandelGraphics, 0, 0, width, height);
}

function windowResized() {
    const container = document.getElementById('canvas-container');
    const w = container.clientWidth || windowWidth;
    const h = container.clientHeight || windowHeight;
    resizeCanvas(w, h);
    juliaGraphics = null;
    mandelGraphics = null;
    redraw();
}
