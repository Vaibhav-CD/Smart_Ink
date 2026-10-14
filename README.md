# ✍️ Smart_Ink — On-Device Handwritten Math Calculator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![100% Client-Side](https://img.shields.io/badge/Architecture-100%25%20On--Device-emerald)](https://github.com)
[![Offline Ready](https://img.shields.io/badge/Network-Zero%20Cloud%20APIs-purple)](https://github.com)
[![Tests Passing](https://img.shields.io/badge/Vitest-32%2F32%20Passing-brightgreen)](https://github.com)

**Smart_Ink** is an interactive, on-device digital notebook and computational scratchpad inspired by Apple iPadOS Math Notes and MyScript Nebo. Users write mathematical expressions naturally by hand using a mouse, stylus, or touch surface. The system captures strokes continuously, clusters characters, performs real-time handwriting recognition in a non-blocking Web Worker, evaluates the expression deterministically (BODMAS/PEMDAS), and projects the calculated answer directly onto the canvas surface inline next to the equation.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### 1. Installation
```bash
git clone https://github.com/your-username/smart-ink.git
cd smart-ink
npm install
```

### 2. Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Automated Test Suites
```bash
npx vitest run
```
Runs 32 comprehensive unit tests validating:
- Arithmetic parsing and BODMAS/PEMDAS operator precedence
- Safe division-by-zero (`Undefined`) and syntax fault tolerance
- Stroke bounding box math and coordinate conversion
- Scratch-to-erase gesture recognition
- Topological math symbol feature classification
- 2D function curve plotting

### 4. Production Build
```bash
npm run build
```

---

## 🌟 Key Features

### 1. Interactive Digital Ink Canvas
- **Fluid, Low-Latency Ink Rendering**: Utilizes `perfect-freehand` with pressure sensitivity simulation, Bézier curve interpolation, and calligraphic tapering.
- **High-DPI / Retina Scaling**: Full `window.devicePixelRatio` scaling prevents pixelation on high-density displays.
- **Digital Paper Aesthetics**: Choose between **Ruled Paper**, **Engineering Grid**, **Dot Matrix**, **Pure White**, and **Dark Blueprint** backgrounds.
- **Tools**: Pen, Translucent Highlighter (multiply blending), Stroke Eraser, and Pixel Eraser.
- **Full History**: Complete Undo/Redo stack with keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y`).

### 2. 100% On-Device Handwriting Recognition (Zero Cloud APIs)
- **Zero Network Requirement**: Entire recognition pipeline runs client-side in the browser, fully operational in airplane mode.
- **Vocabulary**: Digits (`0–9`), arithmetic operators (`+`, `−`, `×`, `÷`, `^`, `%`), decimals (`.`), parentheses (`( )`), and the terminal equals delimiter (`=`).
- **Hybrid Classifier**: Combines stroke trajectory topology analysis (inflection points, loops, crossings, aspect ratios) with 28x28 grayscale feature density classification.

### 3. Deterministic BODMAS/PEMDAS Math Engine
- **Zero `eval()`**: Strict recursive descent parser eliminating security risks and runtime crashes.
- **BODMAS / PEMDAS Order of Operations**:
  $$\text{Parentheses} \rightarrow \text{Exponents } (2^{3^2}) \rightarrow \text{Unary Ops} \rightarrow \text{Multiplication \& Division} \rightarrow \text{Addition \& Subtraction}$$
- **Multi-Digit & Decimals**: Supports arbitrary multi-digit integers, floating-point numbers without precision leaks (`0.1 + 0.2 = 0.3`), and negative numbers.
- **Safe Fault Tolerance**: Gracefully displays clean `Undefined` for division by zero without unhandled exceptions.

### 4. Dynamic Canvas Projection & Reactive Editing
- **Inline Result Projection**: The evaluated answer is rendered directly on the canvas adjacent to the terminal `=` sign in stylish handwriting typography (`Caveat` / `Patrick Hand`).
- **Reactive Re-Evaluation**: Erasing or altering a digit instantly re-evaluates the expression and updates the projected answer in real time.
- **Tap-to-Copy & Confetti**: Copy answers with one click; celebrate calculations with subtle confetti animations.

### 5. Creative Extensions & Innovations
- **Gesture-Based Scratch-to-Erase**: Rapidly scribble back-and-forth across any digit or symbol to erase it instantly, simulating real paper physics!
- **Variable Memory Support**: Write assignments like `x = 10` or `r = 7`. In subsequent expressions, write `x * 5 =` to calculate dynamically using stored variable state.
- **Interactive 2D Function Curve Plotter**: Write plottable functions like `y = x^2` or `f(x) = sin(x)`. Hover over the answer badge and click the graph icon to launch an interactive Cartesian curve plotter with zoom and pan!
- **Web Audio Micro-Interactions**: Authentic procedural paper chalk/pencil friction, erase swooshes, and melodic solve chimes synthesized via the Web Audio API (100% offline).

---

## 📐 Architecture & Performance

```
Pointer Events (60 FPS) ──> Main UI Thread (RAF Render Loop)
                                  │
                          (postMessage off-thread)
                                  ▼
                      Dedicated Web Worker (mathWorker.ts)
                      ├── Spatial Line Clustering
                      ├── Multi-stroke Character Grouping
                      ├── Hybrid On-Device Classifier
                      └── Deterministic Math Engine
                                  │
                          (postMessage result)
                                  ▼
                      Inline Canvas Projection Layer
```

- **60 FPS Frame Rate Integrity**: Stroke drawing is completely decoupled from parsing and inference via `src/workers/mathWorker.ts`. Pointer movement and RAF rendering never suffer from dropped frames.
- **Memory Stability**: Zero memory leaks; stroke arrays are bounded and disposed cleanly.

For in-depth architectural details, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 🔬 Model Attribution & Technical Justification

- **Architecture**: Hybrid Trajectory-Topological Analyzer & Normalized 28x28 Spatial Energy Classifier.
- **Input Tensor**: Normalized $28 \times 28$ grayscale float tensor centered by center-of-mass (MNIST / CROHME format).
- **Execution Target**: Dedicated Web Worker (`mathWorker.ts`).
- **Inference Latency**: $< 2\text{ms}$ per symbol on modern CPUs.
- **License**: MIT.

---

## 🧪 Automated Test Suite

Run tests via Vitest:
```bash
npx vitest run
```
```
 ✓ src/engine/__tests__/parser.test.ts (17 tests)
 ✓ src/engine/__tests__/plotter.test.ts (3 tests)
 ✓ src/canvas/__tests__/strokeUtils.test.ts (6 tests)
 ✓ src/recognizer/__tests__/topology.test.ts (6 tests)

 Test Files  4 passed (4)
      Tests  32 passed (32)
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
