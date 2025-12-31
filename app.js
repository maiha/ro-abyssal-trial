// ==========================================
// CONFIG & CONSTANTS
// ==========================================
// サイズプリセット
const SIZE_PRESETS = {
    S: 50,
    M: 80,
    L: 130,
};

let CELL_SIZE = SIZE_PRESETS.M;
let GRID_SIZE = CELL_SIZE;
const MARGIN = 20;
const dpr = window.devicePixelRatio || 1;

function getCellSizeFromCSS() {
    const style = getComputedStyle(document.documentElement);
    return parseFloat(style.getPropertyValue('--cell-size')) || 130;
}

function setCellSizeCSS(size) {
    document.documentElement.style.setProperty('--cell-size', size + 'px');
}

// グローバル状態
const hiddenPathGroups = new Set();
const initializedToggles = new Set();
const mapViews = [];

// ==========================================
// MapView クラス（単一マップのレンダリングをカプセル化）
// ==========================================
class MapView {
    constructor(container, mapData) {
        this.container = container;
        this.mapData = mapData;
        this.selectedElement = null;
        this.edgeStyleCache = new Map();
        this.pathStyleCache = new Map();

        this.createElements();
        this.render();
    }

    createElements() {
        const size = GRID_SIZE * 5 + MARGIN * 2;

        // map-wrapper 構造を生成
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'map-wrapper';

        // タイトル
        this.titleEl = document.createElement('div');
        this.titleEl.className = 'map-title';
        this.wrapper.appendChild(this.titleEl);

        // 左ヘッダー (Y軸)
        this.headerY = document.createElement('div');
        this.headerY.className = 'header-left';
        this.wrapper.appendChild(this.headerY);

        // ステージ
        this.stage = document.createElement('div');
        this.stage.id = `stage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.stage.className = 'stage';
        this.stage.style.width = `${size}px`;
        this.stage.style.height = `${size}px`;

        // Canvas (前景のみ - 背景は不要)
        this.fgCanvas = document.createElement('canvas');
        this.fgCanvas.className = 'fg-canvas';
        this.fgCanvas.width = size * dpr;
        this.fgCanvas.height = size * dpr;
        this.fgCanvas.style.width = '100%';
        this.fgCanvas.style.height = '100%';
        this.fgCtx = this.fgCanvas.getContext('2d');
        this.fgCtx.scale(dpr, dpr);

        // ノードレイヤー
        this.nodeLayer = document.createElement('div');
        this.nodeLayer.className = 'node-layer';

        this.stage.appendChild(this.fgCanvas);
        this.stage.appendChild(this.nodeLayer);
        this.wrapper.appendChild(this.stage);

        // 左下コーナー
        this.cornerEl = document.createElement('div');
        this.cornerEl.className = 'header-corner';
        this.wrapper.appendChild(this.cornerEl);

        // 下ヘッダー (X軸)
        this.headerX = document.createElement('div');
        this.headerX.className = 'header-bottom';
        this.wrapper.appendChild(this.headerX);

        this.container.appendChild(this.wrapper);
    }

    resize() {
        const size = GRID_SIZE * 5 + MARGIN * 2;

        // ステージサイズ更新
        this.stage.style.width = `${size}px`;
        this.stage.style.height = `${size}px`;

        // Canvas再生成
        this.fgCanvas.width = size * dpr;
        this.fgCanvas.height = size * dpr;
        this.fgCtx = this.fgCanvas.getContext('2d');
        this.fgCtx.scale(dpr, dpr);

        // スタイルキャッシュクリア（サイズ依存の値があるため）
        this.edgeStyleCache.clear();
        this.pathStyleCache.clear();
    }

    render() {
        if (!this.mapData) return;

        // map別クラス適用
        this.stage.className = 'stage ' + (this.mapData.className || `map-${this.mapData.id}`);

        // キャッシュクリア
        this.edgeStyleCache.clear();
        this.pathStyleCache.clear();

        const logicalNodes = this.parseNodes();
        this.renderDOM(logicalNodes);
        this.renderCanvas();
        this.updateHeaders();
    }

    parseNodes() {
        const globalStyles = (typeof DATA !== 'undefined' && DATA.styles) ? DATA.styles : {};
        const localStyles = this.mapData.styles || {};
        const styles = { ...globalStyles, ...localStyles };
        const logicalNodes = [];
        const lines = this.mapData.edges;

        for (let row = 1; row <= 9; row += 2) {
            const line = lines[row] || '';
            for (let col = 1; col <= 9; col += 2) {
                const char = line[col] || ' ';
                const style = styles[char] || {};
                const typeClass = (char === ' ') ? 'type-blank' : `type-${char}`;
                const classes = [typeClass];
                if (style.class) classes.push(style.class);

                logicalNodes.push({
                    x: (col - 1) / 2,
                    y: 4 - (row - 1) / 2,
                    char,
                    classList: classes,
                    text: style.text || (char === ' ' ? '' : char),
                    label: style.label || null
                });
            }
        }

        if (this.mapData.nodes) {
            this.mapData.nodes.forEach(conf => {
                let target = logicalNodes.find(n => n.x === conf.x && n.y === conf.y);
                if (!target) {
                    target = { x: conf.x, y: conf.y, char: ' ', classList: ['cell', 'type-blank'], text: '', label: null };
                    logicalNodes.push(target);
                }

                if (target.char === 'o' && (conf.class || conf.text)) {
                    target.classList = target.classList.filter(c => c !== 'type-o');
                }

                if (conf.icons) {
                    target.icons = conf.icons.map(iconClassString => {
                        const iconClasses = iconClassString.split(' ');
                        let iconLabel = null;
                        iconClasses.forEach(cls => {
                            const definedStyle = styles[cls];
                            if (definedStyle && definedStyle.label !== undefined) {
                                iconLabel = definedStyle.label;
                            }
                        });
                        return { className: iconClassString, label: iconLabel };
                    });
                }

                if (conf.class) {
                    conf.class.split(' ').forEach(cls => {
                        if (!target.classList.includes(cls)) target.classList.push(cls);
                        const definedStyle = styles[cls];
                        if (definedStyle) {
                            if (definedStyle.text !== undefined) target.text = definedStyle.text;
                            if (definedStyle.label !== undefined) target.label = definedStyle.label;
                            if (definedStyle.class) {
                                definedStyle.class.split(' ').forEach(nestedCls => {
                                    if (!target.classList.includes(nestedCls)) target.classList.push(nestedCls);
                                });
                            }
                        }
                    });
                }

                if (conf.text !== undefined) target.text = conf.text;
                if (conf.label !== undefined) target.label = conf.label;
            });
        }
        return logicalNodes;
    }

    renderDOM(nodes) {
        this.nodeLayer.innerHTML = '';
        nodes.forEach(node => {
            const el = document.createElement('div');
            el.className = 'cell ' + node.classList.join(' ');
            if (node.label) el.setAttribute('data-label', node.label);

            const px = node.x * CELL_SIZE + MARGIN;
            const py = (4 - node.y) * CELL_SIZE + MARGIN;
            el.style.left = `${px}px`;
            el.style.top = `${py}px`;
            el.textContent = node.text;

            if (node.icons && Array.isArray(node.icons)) {
                node.icons.forEach(iconDef => {
                    const childEl = document.createElement('div');
                    const className = typeof iconDef === 'string' ? iconDef : iconDef.className;
                    const label = typeof iconDef === 'object' ? iconDef.label : null;
                    childEl.className = 'sub-icon ' + className;
                    if (label) childEl.setAttribute('data-label', label);
                    el.appendChild(childEl);
                });
            }

            el.addEventListener('click', () => this.onCellClick(el, node));
            this.nodeLayer.appendChild(el);
        });
    }

    renderCanvas() {
        const size = GRID_SIZE * 5 + MARGIN * 2;
        this.fgCtx.clearRect(0, 0, size, size);
        if (!this.mapData) return;

        const edgeData = this.extractEdges();
        const edgeMap = new Map();
        const useFlowArrows = this.mapData.flowArrows === true;

        edgeData.forEach(({ from, to, type, char }) => {
            const k1 = `${from.x},${from.y},${to.x},${to.y}`;
            const k2 = `${to.x},${to.y},${from.x},${from.y}`;
            const edgeObj = { type, char, from, to };
            edgeMap.set(k1, edgeObj);
            edgeMap.set(k2, edgeObj);
        });

        const getEdgeObj = (x1, y1, x2, y2) => edgeMap.get(`${x1},${y1},${x2},${y2}`);
        const isArrowChar = (char) => ARROW_DIRECTIONS.hasOwnProperty(char);
        const resolveEdgeChar = (edge) => {
            if (!edge) return 'wall';
            if (useFlowArrows && isArrowChar(edge.char)) return 'flowArrowPath';
            return edge.char;
        };

        this.drawLayer(getEdgeObj, (edge) => edge !== undefined, resolveEdgeChar);
        this.drawLayer(getEdgeObj, (edge) => edge === undefined, resolveEdgeChar);

        if (useFlowArrows) {
            const arrowGraph = buildArrowGraph(edgeData);
            const arrowPaths = findArrowPaths(arrowGraph);
            arrowPaths.forEach(path => this.drawVectorArrow(path));
        }

        if (this.mapData.paths && Array.isArray(this.mapData.paths)) {
            const visiblePaths = this.mapData.paths
                .filter(pathDef => !pathDef.toggle || !hiddenPathGroups.has(pathDef.toggle));

            // 同じ始点を持つパスを検出して自動オフセットを計算
            const autoOffsets = this.calcAutoOffsets(visiblePaths);

            visiblePaths.forEach((pathDef, i) => {
                const autoOffset = autoOffsets.get(i);
                this.drawPathTrajectory(pathDef, autoOffset);
            });
        }
    }

    // 同じ始点を持つパスに自動オフセットを計算
    calcAutoOffsets(paths) {
        const offsets = new Map();
        const startGroups = new Map();

        // 始点でグループ化
        paths.forEach((pathDef, i) => {
            if (!pathDef.cells || pathDef.cells.length < 2) return;
            if (pathDef.offset) return; // 手動設定があればスキップ

            const start = pathDef.cells[0];
            const key = `${start[0]},${start[1]}`;
            if (!startGroups.has(key)) startGroups.set(key, []);
            startGroups.get(key).push({ index: i, pathDef });
        });

        // 同じ始点が2つ以上あるグループに自動オフセット
        for (const [key, group] of startGroups) {
            if (group.length < 2) continue;

            const offsetAmount = 0.08;
            group.forEach((item, gi) => {
                const { index, pathDef } = item;

                // 実際の経路を計算して方向を取得
                let path = pathDef.cells.map(c => ({ x: c[0], y: c[1] }));
                if (path.length === 2 && !pathDef.direct) {
                    path = this.findPath(path[0], path[1]);
                }

                const start = path[0];
                const next = path[1];
                const dx = next.x - start.x;
                const dy = next.y - start.y;

                // 移動方向に垂直なオフセット
                // x方向移動 → dyでオフセット、y方向移動 → dxでオフセット
                const sign = (gi === 0) ? 1 : -1;
                if (Math.abs(dx) >= Math.abs(dy)) {
                    // 主にx方向 → y方向にずらす
                    offsets.set(index, { dy: offsetAmount * sign });
                } else {
                    // 主にy方向 → x方向にずらす
                    offsets.set(index, { dx: offsetAmount * sign });
                }
            });
        }

        return offsets;
    }

    extractEdges() {
        const edges = [];
        const lines = this.mapData.edges;
        for (let r = 0; r <= 10; r++) {
            const line = lines[r] || "";
            for (let c = 0; c <= 10; c++) {
                const char = line[c] || " ";
                if (char === " " || char === "o") continue;
                const type = (char === '!') ? 'danger' : 'normal';

                if (r % 2 === 1 && c % 2 === 0) {
                    const x1 = (c - 2) / 2, x2 = c / 2, mapY = 4 - (r - 1) / 2;
                    if (x1 >= -1 && x2 <= 5 && mapY >= 0 && mapY <= 4) {
                        edges.push({ from: { x: x1, y: mapY }, to: { x: x2, y: mapY }, type, char });
                    }
                } else if (r % 2 === 0 && c % 2 === 1) {
                    const y1 = 4 - (r - 2) / 2, y2 = 4 - r / 2, mapX = (c - 1) / 2;
                    if (y1 <= 5 && y2 >= -1 && mapX >= 0 && mapX <= 4) {
                        edges.push({ from: { x: mapX, y: y1 }, to: { x: mapX, y: y2 }, type, char });
                    }
                }
            }
        }
        return edges;
    }

    // 通行可能なセル間の隣接リストを構築
    buildGraph() {
        const graph = new Map();
        const key = (x, y) => `${x},${y}`;

        // 全セルを初期化
        for (let x = 0; x <= 4; x++) {
            for (let y = 0; y <= 4; y++) {
                graph.set(key(x, y), []);
            }
        }

        // 通路がある場合に隣接関係を追加
        const edges = this.extractEdges();
        for (const edge of edges) {
            const { from, to } = edge;
            // グリッド内のセルのみ
            if (from.x >= 0 && from.x <= 4 && from.y >= 0 && from.y <= 4 &&
                to.x >= 0 && to.x <= 4 && to.y >= 0 && to.y <= 4) {
                graph.get(key(from.x, from.y)).push({ x: to.x, y: to.y });
                graph.get(key(to.x, to.y)).push({ x: from.x, y: from.y });
            }
        }

        return graph;
    }

    // BFSで最短経路を探索
    findPath(start, end) {
        const graph = this.buildGraph();
        const key = (x, y) => `${x},${y}`;
        const startKey = key(start.x, start.y);
        const endKey = key(end.x, end.y);

        if (startKey === endKey) return [start];

        const visited = new Set([startKey]);
        const queue = [[start]];

        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];
            const neighbors = graph.get(key(current.x, current.y)) || [];

            for (const neighbor of neighbors) {
                const neighborKey = key(neighbor.x, neighbor.y);
                if (visited.has(neighborKey)) continue;

                const newPath = [...path, neighbor];
                if (neighborKey === endKey) {
                    return newPath;
                }

                visited.add(neighborKey);
                queue.push(newPath);
            }
        }

        // 経路が見つからない場合は直線で返す
        return [start, end];
    }

    drawLayer(getEdgeObj, conditionFn, resolveEdgeChar) {
        for (let y = 0; y <= 4; y++) {
            for (let x = 0; x <= 4; x++) {
                const px = x * CELL_SIZE + MARGIN;
                const py = (4 - y) * CELL_SIZE + MARGIN;

                if (x < 4) {
                    const edge = getEdgeObj(x, y, x + 1, y);
                    if (conditionFn(edge)) {
                        this.drawEdgeFeature(px + CELL_SIZE, py, px + CELL_SIZE, py + CELL_SIZE, resolveEdgeChar(edge));
                    }
                }
                if (y < 4) {
                    const edge = getEdgeObj(x, y, x, y + 1);
                    if (conditionFn(edge)) {
                        this.drawEdgeFeature(px, py, px + CELL_SIZE, py, resolveEdgeChar(edge));
                    }
                }
                if (x === 0) {
                    const edge = getEdgeObj(-1, y, 0, y);
                    if (conditionFn(edge)) {
                        this.drawEdgeFeature(px, py, px, py + CELL_SIZE, resolveEdgeChar(edge));
                    }
                }
                if (y === 4) {
                    const edge = getEdgeObj(x, 4, x, 5);
                    if (conditionFn(edge)) {
                        this.drawEdgeFeature(px, py, px + CELL_SIZE, py, resolveEdgeChar(edge));
                    }
                }
                if (x === 4) {
                    const edge = getEdgeObj(4, y, 5, y);
                    if (conditionFn(edge)) {
                        this.drawEdgeFeature(px + CELL_SIZE, py, px + CELL_SIZE, py + CELL_SIZE, resolveEdgeChar(edge));
                    }
                }
                if (y === 0) {
                    const edge = getEdgeObj(x, -1, x, 0);
                    if (conditionFn(edge)) {
                        this.drawEdgeFeature(px, py + CELL_SIZE, px + CELL_SIZE, py + CELL_SIZE, resolveEdgeChar(edge));
                    }
                }
            }
        }
    }

    getEdgeStyle(char) {
        if (!char) return null;
        if (this.edgeStyleCache.has(char)) return this.edgeStyleCache.get(char);

        const dummy = document.createElement('div');
        dummy.setAttribute('data-edge', char);
        this.stage.appendChild(dummy);
        const style = window.getComputedStyle(dummy);

        const config = {
            lineCap: style.getPropertyValue('--lineCap').trim() || "butt",
            strokeStyle: style.getPropertyValue('--strokeStyle').trim() || style.color,
            lineWidth: parseFloat(style.getPropertyValue('--lineWidth')) || 0,
            font: style.font,
            textAlign: style.getPropertyValue('--textAlign').trim() || "center",
            textBaseline: style.getPropertyValue('--textBaseline').trim() || "middle",
            strokeWidth: parseFloat(style.getPropertyValue('--edge-stroke-width')) || 0,
            strokeColor: style.getPropertyValue('--edge-stroke-color').trim() || "rgba(0,0,0,0.8)",
            inner: {
                strokeStyle: style.getPropertyValue('--inner-strokeStyle').trim(),
                lineWidth: parseFloat(style.getPropertyValue('--inner-lineWidth')) || 0
            },
            text: style.getPropertyValue('--edge-text').trim().replace(/['"]/g, ''),
            image: this.solveImage(style.backgroundImage),
            width: parseFloat(style.width) || 32,
            height: parseFloat(style.height) || 32,
            headLength: style.getPropertyValue('--headLength').trim(),
            headAngle: style.getPropertyValue('--headAngle').trim(),
            edgeOffset: style.getPropertyValue('--edgeOffset').trim()
        };

        this.stage.removeChild(dummy);
        this.edgeStyleCache.set(char, config);
        return config;
    }

    solveImage(bgImgValue) {
        if (!bgImgValue || bgImgValue === 'none') return null;
        const url = bgImgValue.match(/url\(["']?(.*?)["']?\)/)?.[1];
        if (!url) return null;

        const img = new Image();
        img.src = url;
        img.onload = () => this.renderCanvas();
        return img;
    }

    drawEdgeFeature(x1, y1, x2, y2, char) {
        const style = this.getEdgeStyle(char);
        if (!style) return;

        const ctx = this.fgCtx;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        ctx.save();
        if (style.lineWidth > 0) {
            ctx.lineCap = style.lineCap;
            ctx.strokeStyle = style.strokeStyle;
            ctx.lineWidth = style.lineWidth;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        if (style.inner.lineWidth > 0) {
            ctx.strokeStyle = style.inner.strokeStyle;
            ctx.lineWidth = style.inner.lineWidth;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        if (style.image && style.image.complete) {
            ctx.drawImage(style.image, midX - style.width / 2, midY - style.height / 2, style.width, style.height);
        }
        if (style.text) {
            ctx.font = style.font;
            ctx.fillStyle = style.strokeStyle;
            ctx.textAlign = style.textAlign;
            ctx.textBaseline = style.textBaseline;
            if (style.strokeWidth > 0) {
                ctx.strokeStyle = style.strokeColor;
                ctx.lineWidth = style.strokeWidth;
                ctx.strokeText(style.text, midX, midY);
            }
            ctx.fillText(style.text, midX, midY);
        }
        ctx.restore();
    }

    getPathStyleSingle(styleName) {
        const key = styleName || 'default';
        if (this.pathStyleCache.has(key)) return this.pathStyleCache.get(key);

        const dummy = document.createElement('div');
        dummy.setAttribute('data-path', key);
        this.stage.appendChild(dummy);
        const style = window.getComputedStyle(dummy);

        const config = {
            // line
            lineColor: style.getPropertyValue('--lineColor').trim() || null,
            lineWidth: parseFloat(style.getPropertyValue('--lineWidth')) || null,
            lineBorderColor: style.getPropertyValue('--lineBorderColor').trim() || null,
            lineBorderWidth: parseFloat(style.getPropertyValue('--lineBorderWidth')) || null,
            // arrow
            arrowHead: style.getPropertyValue('--arrowHead').trim() || null,
            arrowTail: style.getPropertyValue('--arrowTail').trim() || null,
            arrowLength: parseFloat(style.getPropertyValue('--arrowLength')) || null,
            arrowAngle: parseFloat(style.getPropertyValue('--arrowAngle')) || null,
            // label
            labelColor: style.getPropertyValue('--labelColor').trim() || null,
            labelFontSize: parseFloat(style.getPropertyValue('--labelFontSize')) || null,
            labelBackground: style.getPropertyValue('--labelBackground').trim() || null,
            labelBorderColor: style.getPropertyValue('--labelBorderColor').trim() || null,
            labelBorderWidth: parseFloat(style.getPropertyValue('--labelBorderWidth')) || null,
            // tip
            tipColor: style.getPropertyValue('--tipColor').trim() || null,
            tipFontSize: parseFloat(style.getPropertyValue('--tipFontSize')) || null,
            tipBackground: style.getPropertyValue('--tipBackground').trim() || null,
            tipBorderColor: style.getPropertyValue('--tipBorderColor').trim() || null,
            tipBorderWidth: parseFloat(style.getPropertyValue('--tipBorderWidth')) || null,
            // other
            edgeOffset: parseFloat(style.getPropertyValue('--edgeOffset')) || null
        };

        this.stage.removeChild(dummy);
        this.pathStyleCache.set(key, config);
        return config;
    }

    getPathStyle(styleNames) {
        const names = (styleNames || 'default').split(/\s+/);
        const merged = {
            // line
            lineColor: '#3498db', lineWidth: 4,
            lineBorderColor: null, lineBorderWidth: 0,
            // arrow
            arrowHead: '1', arrowTail: '0', arrowLength: 12, arrowAngle: 30,
            // label
            labelColor: null, labelFontSize: 14,
            labelBackground: 'rgba(255, 255, 255, 0.85)',
            labelBorderColor: null, labelBorderWidth: 0,
            // tip
            tipColor: null, tipFontSize: null,
            tipBackground: 'rgba(255, 255, 255, 0.85)',
            tipBorderColor: null, tipBorderWidth: 0,
            // other
            edgeOffset: 0.35
        };

        for (const name of names) {
            const s = this.getPathStyleSingle(name);
            // line
            if (s.lineColor) merged.lineColor = s.lineColor;
            if (s.lineWidth) merged.lineWidth = s.lineWidth;
            if (s.lineBorderColor) merged.lineBorderColor = s.lineBorderColor;
            if (s.lineBorderWidth) merged.lineBorderWidth = s.lineBorderWidth;
            // arrow
            if (s.arrowHead) merged.arrowHead = s.arrowHead;
            if (s.arrowTail) merged.arrowTail = s.arrowTail;
            if (s.arrowLength) merged.arrowLength = s.arrowLength;
            if (s.arrowAngle) merged.arrowAngle = s.arrowAngle;
            // label
            if (s.labelColor) merged.labelColor = s.labelColor;
            if (s.labelFontSize) merged.labelFontSize = s.labelFontSize;
            if (s.labelBackground) merged.labelBackground = s.labelBackground;
            if (s.labelBorderColor) merged.labelBorderColor = s.labelBorderColor;
            if (s.labelBorderWidth) merged.labelBorderWidth = s.labelBorderWidth;
            // tip
            if (s.tipColor) merged.tipColor = s.tipColor;
            if (s.tipFontSize) merged.tipFontSize = s.tipFontSize;
            if (s.tipBackground) merged.tipBackground = s.tipBackground;
            if (s.tipBorderColor) merged.tipBorderColor = s.tipBorderColor;
            if (s.tipBorderWidth) merged.tipBorderWidth = s.tipBorderWidth;
            // other
            if (s.edgeOffset) merged.edgeOffset = s.edgeOffset;
        }

        return {
            // line
            lineColor: merged.lineColor,
            lineWidth: merged.lineWidth,
            lineBorderColor: merged.lineBorderColor || '#000',
            lineBorderWidth: merged.lineBorderWidth,
            // arrow
            arrowHead: merged.arrowHead !== '0',
            arrowTail: merged.arrowTail === '1',
            arrowLength: merged.arrowLength,
            arrowAngle: merged.arrowAngle * Math.PI / 180,
            // label
            labelColor: merged.labelColor || merged.lineColor,
            labelFontSize: merged.labelFontSize,
            labelBackground: merged.labelBackground,
            labelBorderColor: merged.labelBorderColor || '#000',
            labelBorderWidth: merged.labelBorderWidth,
            // tip
            tipColor: merged.tipColor || merged.lineColor,
            tipFontSize: merged.tipFontSize || merged.labelFontSize,
            tipBackground: merged.tipBackground,
            tipBorderColor: merged.tipBorderColor || '#000',
            tipBorderWidth: merged.tipBorderWidth,
            // other
            edgeOffset: merged.edgeOffset
        };
    }

    getFlowArrowStyle() {
        const style = this.getEdgeStyle('flowArrow');
        return {
            lineColor: style?.strokeStyle || '#e74c3c',
            lineWidth: style?.lineWidth || 3,
            arrowLength: parseFloat(style?.headLength) || 15,
            arrowAngle: (parseFloat(style?.headAngle) || 30) * Math.PI / 180,
            lineBorderColor: '#000',
            lineBorderWidth: 0,
            edgeOffset: parseFloat(style?.edgeOffset) || 0.35,
            arrowHead: true,
            arrowTail: false
        };
    }

    drawVectorArrow(path) {
        if (path.length < 2) return;
        const style = this.getFlowArrowStyle();
        const points = getFlowArrowPoints(path, style.edgeOffset);
        this.drawArrowPath(this.fgCtx, points, style, style.arrowHead, style.arrowTail);
    }

    drawPathTrajectory(pathDef, autoOffset) {
        const cells = pathDef.cells;
        if (!cells || cells.length < 2) return;

        let path = cells.map(c => ({ x: c[0], y: c[1] }));

        // 2点のみ指定の場合、自動経路計算（direct: true で直線描画）
        if (path.length === 2 && !pathDef.direct) {
            path = this.findPath(path[0], path[1]);
        }

        const style = this.getPathStyle(pathDef.style);
        // 隣接2セルの場合は edgeOffset を小さくして矢印を長くする
        const isAdjacent = path.length === 2 &&
            Math.abs(path[0].x - path[1].x) + Math.abs(path[0].y - path[1].y) === 1;
        const edgeOffset = isAdjacent ? style.edgeOffset * 0.5 : style.edgeOffset;
        const points = getFlowArrowPoints(path, edgeOffset);
        if (points.length < 2) return;

        // offset: パス全体を平行移動（手動設定 > 自動オフセット）
        const offset = pathDef.offset || autoOffset;
        if (offset) {
            const dx = (offset.dx || 0) * CELL_SIZE;
            const dy = (offset.dy || 0) * CELL_SIZE;
            for (const p of points) {
                p.px += dx;
                p.py -= dy;
            }
        }

        // startOffset / endOffset を適用（CELL_SIZEに対する比率、dy正で上移動）
        if (pathDef.startOffset) {
            points[0].px += (pathDef.startOffset.dx || 0) * CELL_SIZE;
            points[0].py -= (pathDef.startOffset.dy || 0) * CELL_SIZE;
        }
        if (pathDef.endOffset) {
            const last = points[points.length - 1];
            last.px += (pathDef.endOffset.dx || 0) * CELL_SIZE;
            last.py -= (pathDef.endOffset.dy || 0) * CELL_SIZE;
        }

        const drawHead = pathDef.arrowHead ?? style.arrowHead;
        const drawTail = pathDef.arrowTail ?? style.arrowTail;

        this.drawArrowPath(this.fgCtx, points, style, drawHead, drawTail);

        // ラベル描画
        if (pathDef.label) {
            const labelPoint = this.getPointOnPath(points, pathDef.labelAt ?? 0.1);
            const ctx = this.fgCtx;
            ctx.save();
            ctx.font = `bold ${style.labelFontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const text = pathDef.label;
            const metrics = ctx.measureText(text);
            const textWidth = metrics.width;
            const textHeight = style.labelFontSize;
            const padding = 1;
            const x = labelPoint.px;
            const y = labelPoint.py - textHeight * 0.7;

            // 背景
            if (style.labelBackground && style.labelBackground !== 'none') {
                ctx.fillStyle = style.labelBackground;
                ctx.fillRect(
                    x - textWidth / 2 - padding,
                    y - textHeight / 2 - padding,
                    textWidth + padding * 2,
                    textHeight + padding * 2
                );
            }

            // テキスト（縁取り + 塗り）
            if (style.labelBorderWidth > 0) {
                ctx.strokeStyle = style.labelBorderColor;
                ctx.lineWidth = style.labelBorderWidth;
                ctx.strokeText(text, x, y);
            }
            ctx.fillStyle = style.labelColor;
            ctx.fillText(text, x, y);
            ctx.restore();
        }

        // tip描画（終点の矢頭付近）
        if (pathDef.tip) {
            const lastPoint = points[points.length - 1];
            const prevPoint = points[points.length - 2];
            const ctx = this.fgCtx;
            ctx.save();
            const tipFontSize = style.tipFontSize;
            ctx.font = `bold ${tipFontSize}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            const text = pathDef.tip;
            const metrics = ctx.measureText(text);
            const textWidth = metrics.width;
            const textHeight = tipFontSize;
            const padding = 2;

            // 矢印の方向を計算
            const dx = lastPoint.px - prevPoint.px;
            const dy = lastPoint.py - prevPoint.py;
            const isHorizontal = Math.abs(dx) >= Math.abs(dy);

            let x, y;
            if (isHorizontal) {
                // 左右方向 → 矢頭の下
                x = lastPoint.px - textWidth / 2;
                y = lastPoint.py + textHeight;
            } else {
                // 上下方向 → 矢頭の左
                x = lastPoint.px - textWidth - 8;
                y = lastPoint.py;
            }

            // 背景（noneで非表示）
            if (style.tipBackground && style.tipBackground !== 'none') {
                ctx.fillStyle = style.tipBackground;
                ctx.fillRect(
                    x - padding,
                    y - textHeight / 2 - padding,
                    textWidth + padding * 2,
                    textHeight + padding * 2
                );
            }

            // テキスト（縁取り + 塗り）
            if (style.tipBorderWidth > 0) {
                ctx.strokeStyle = style.tipBorderColor;
                ctx.lineWidth = style.tipBorderWidth;
                ctx.strokeText(text, x, y);
            }
            ctx.fillStyle = style.tipColor;
            ctx.fillText(text, x, y);
            ctx.restore();
        }
    }

    // パス全長に対する比率(0〜1)で座標を取得
    getPointOnPath(points, t) {
        if (points.length < 2) return points[0];
        t = Math.max(0, Math.min(1, t));

        // 各セグメントの長さを計算
        const segments = [];
        let totalLength = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const dx = points[i + 1].px - points[i].px;
            const dy = points[i + 1].py - points[i].py;
            const len = Math.sqrt(dx * dx + dy * dy);
            segments.push({ start: points[i], end: points[i + 1], length: len });
            totalLength += len;
        }

        // 目標距離
        const targetDist = t * totalLength;
        let accumulated = 0;

        for (const seg of segments) {
            if (accumulated + seg.length >= targetDist) {
                const segT = (targetDist - accumulated) / seg.length;
                return {
                    px: seg.start.px + (seg.end.px - seg.start.px) * segT,
                    py: seg.start.py + (seg.end.py - seg.start.py) * segT
                };
            }
            accumulated += seg.length;
        }

        return points[points.length - 1];
    }

    drawArrowPath(ctx, points, style, drawHead, drawTail) {
        const first = points[0];
        const second = points[1];
        const last = points[points.length - 1];
        const prev = points[points.length - 2];

        const headAngle = Math.atan2(last.py - prev.py, last.px - prev.px);
        const tailAngle = Math.atan2(first.py - second.py, first.px - second.px);
        const shortenBy = style.arrowLength - style.lineWidth / 2;

        const strokeEnd = drawHead ? {
            px: last.px - shortenBy * Math.cos(headAngle),
            py: last.py - shortenBy * Math.sin(headAngle)
        } : last;

        const strokeStart = drawTail ? {
            px: first.px - shortenBy * Math.cos(tailAngle),
            py: first.py - shortenBy * Math.sin(tailAngle)
        } : first;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // パス描画関数
        const drawPath = () => {
            ctx.beginPath();
            ctx.moveTo(strokeStart.px, strokeStart.py);

            if (points.length === 2) {
                ctx.lineTo(strokeEnd.px, strokeEnd.py);
            } else if (points.length === 3) {
                const mid = points[1];
                ctx.quadraticCurveTo(mid.px, mid.py, strokeEnd.px, strokeEnd.py);
            } else {
                for (let i = 1; i < points.length - 2; i++) {
                    const xc = (points[i].px + points[i + 1].px) / 2;
                    const yc = (points[i].py + points[i + 1].py) / 2;
                    ctx.quadraticCurveTo(points[i].px, points[i].py, xc, yc);
                }
                const secondLast = points[points.length - 2];
                ctx.quadraticCurveTo(secondLast.px, secondLast.py, strokeEnd.px, strokeEnd.py);
            }
            ctx.stroke();
        };

        // 縁取り（先に太い線を描画）
        if (style.lineBorderWidth > 0 && style.lineBorderColor) {
            ctx.strokeStyle = style.lineBorderColor;
            ctx.lineWidth = style.lineWidth + style.lineBorderWidth * 2;
            drawPath();
        }

        // 本体
        ctx.strokeStyle = style.lineColor;
        ctx.lineWidth = style.lineWidth;
        drawPath();

        // 矢頭（縁取り付き）
        if (drawHead) {
            if (style.lineBorderWidth > 0 && style.lineBorderColor) {
                drawArrowHead(ctx, strokeEnd.px, strokeEnd.py, last.px, last.py, style, true);
            }
            drawArrowHead(ctx, strokeEnd.px, strokeEnd.py, last.px, last.py, style, false);
        }
        if (drawTail) {
            if (style.lineBorderWidth > 0 && style.lineBorderColor) {
                drawArrowHead(ctx, strokeStart.px, strokeStart.py, first.px, first.py, style, true);
            }
            drawArrowHead(ctx, strokeStart.px, strokeStart.py, first.px, first.py, style, false);
        }

        ctx.restore();
    }

    updateHeaders() {
        this.headerX.innerHTML = '';
        this.headerY.innerHTML = '';

        if (this.mapData.headers) {
            this.mapData.headers.x.forEach(v => {
                const d = document.createElement('div');
                d.textContent = v;
                this.headerX.appendChild(d);
            });
            [...this.mapData.headers.y].reverse().forEach(v => {
                const d = document.createElement('div');
                d.textContent = v;
                this.headerY.appendChild(d);
            });
        }

        this.cornerEl.textContent = this.mapData.id ? `D${this.mapData.id}` : '';
        this.titleEl.textContent = this.mapData.title || '';
    }

    onCellClick(el, nodeData) {
        if (this.selectedElement) this.selectedElement.classList.remove('selected');
        el.classList.add('selected');
        this.selectedElement = el;
    }

    destroy() {
        if (this.wrapper && this.wrapper.parentNode) {
            this.wrapper.parentNode.removeChild(this.wrapper);
        }
    }
}

// ==========================================
// ヘルパー関数（グローバル）
// ==========================================
const ARROW_DIRECTIONS = {
    '←': { dx: -1, dy: 0 },
    '→': { dx: 1, dy: 0 },
    '↑': { dx: 0, dy: 1 },
    '↓': { dx: 0, dy: -1 }
};

function getCellCenter(x, y) {
    return {
        px: x * CELL_SIZE + MARGIN + CELL_SIZE / 2,
        py: (4 - y) * CELL_SIZE + MARGIN + CELL_SIZE / 2
    };
}

function getCellEdgePoint(x, y, dx, dy, offset) {
    const center = getCellCenter(x, y);
    return {
        px: center.px + dx * CELL_SIZE * offset,
        py: center.py - dy * CELL_SIZE * offset
    };
}

function getFlowArrowPoints(path, edgeOffset) {
    if (path.length < 2) return [];
    const points = [];
    for (let i = 0; i < path.length; i++) {
        const curr = path[i];
        if (i === 0) {
            const next = path[i + 1];
            const dx = Math.sign(next.x - curr.x);
            const dy = Math.sign(next.y - curr.y);
            points.push(getCellEdgePoint(curr.x, curr.y, dx, dy, edgeOffset));
        } else if (i === path.length - 1) {
            const prev = path[i - 1];
            const dx = Math.sign(curr.x - prev.x);
            const dy = Math.sign(curr.y - prev.y);
            points.push(getCellEdgePoint(curr.x, curr.y, -dx, -dy, edgeOffset));
        } else {
            points.push(getCellCenter(curr.x, curr.y));
        }
    }
    return points;
}

function buildArrowGraph(edges) {
    const graph = new Map();
    edges.forEach(edge => {
        const dir = ARROW_DIRECTIONS[edge.char];
        if (!dir) return;
        const edgeDx = edge.to.x - edge.from.x;
        const edgeDy = edge.to.y - edge.from.y;
        let fromNode, toNode;
        if (edgeDx === dir.dx && edgeDy === dir.dy) {
            fromNode = edge.from;
            toNode = edge.to;
        } else {
            fromNode = edge.to;
            toNode = edge.from;
        }
        const key = `${fromNode.x},${fromNode.y}`;
        graph.set(key, { next: `${toNode.x},${toNode.y}`, to: toNode, char: edge.char });
    });
    return graph;
}

function findArrowPaths(graph) {
    const paths = [];
    const visited = new Set();
    const inDegree = new Map();
    graph.forEach((value) => {
        inDegree.set(value.next, (inDegree.get(value.next) || 0) + 1);
    });
    graph.forEach((_, key) => {
        if (!inDegree.has(key)) {
            const path = tracePath(graph, key, visited);
            if (path.length >= 2) paths.push(path);
        }
    });
    graph.forEach((_, key) => {
        if (!visited.has(key)) {
            const path = tracePath(graph, key, visited);
            if (path.length >= 2) paths.push(path);
        }
    });
    return paths;
}

function tracePath(graph, startKey, visited) {
    const path = [];
    let currentKey = startKey;
    while (currentKey && !visited.has(currentKey)) {
        visited.add(currentKey);
        const [x, y] = currentKey.split(',').map(Number);
        path.push({ x, y });
        const next = graph.get(currentKey);
        currentKey = next ? next.next : null;
    }
    return path;
}

function drawArrowHead(ctx, fromX, fromY, toX, toY, style, isStroke = false) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const headLength = style?.arrowLength || 15;
    const headAngle = style?.arrowAngle || Math.PI / 6;

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - headAngle), toY - headLength * Math.sin(angle - headAngle));
    ctx.lineTo(toX - headLength * Math.cos(angle + headAngle), toY - headLength * Math.sin(angle + headAngle));
    ctx.closePath();

    if (isStroke) {
        ctx.strokeStyle = style.lineBorderColor;
        ctx.lineWidth = style.lineBorderWidth * 2;
        ctx.stroke();
    } else {
        ctx.fillStyle = style.lineColor;
        ctx.fill();
    }
}

// ==========================================
// レイアウト管理
// ==========================================
function loadAllMaps() {
    const container = document.getElementById('maps-container');
    container.innerHTML = '';
    container.className = 'maps-container';

    // 既存のMapViewを破棄
    mapViews.forEach(mv => mv.destroy());
    mapViews.length = 0;

    // 全マップを生成
    DATA.maps.forEach((mapData, i) => {
        const mv = new MapView(container, mapData);
        mv.wrapper.id = `map-wrapper-${mapData.id || i}`;
        mapViews.push(mv);
    });

    renderPathToggleUI();
}

function scrollToMap(index) {
    const map = DATA.maps[index];
    if (!map) return;

    const wrapperId = `map-wrapper-${map.id || index}`;
    const wrapper = document.getElementById(wrapperId);
    if (wrapper) {
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // URLハッシュ更新
    if (map.id !== undefined) {
        history.replaceState(null, '', `#${map.id}`);
    }

    // マップボタンのactive状態を更新
    updateMapButtonUI(index);
}

function setMapSize(size) {
    CELL_SIZE = size;
    GRID_SIZE = size;
    setCellSizeCSS(size);

    // 全MapViewをリサイズ＆再描画
    mapViews.forEach(mv => {
        mv.resize();
        mv.render();
    });

    // サイズボタンのactive状態を更新
    updateSizeUI();

    // 選択中のマップがあればスクロール
    const activeBtn = document.querySelector('#controls > .map-label.active');
    if (activeBtn) {
        const index = [...document.querySelectorAll('#controls > .map-label')].indexOf(activeBtn);
        if (index >= 0) {
            setTimeout(() => scrollToMap(index), 50);
        }
    }
}

function updateSizeUI() {
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.toggle('active', SIZE_PRESETS[btn.dataset.size] === CELL_SIZE);
    });
}

function updateMapButtonUI(activeIndex) {
    document.querySelectorAll('#controls > .map-label').forEach((btn, i) => {
        btn.classList.toggle('active', i === activeIndex);
    });
}

// ==========================================
// パストグル
// ==========================================
function togglePathGroup(toggleName) {
    if (hiddenPathGroups.has(toggleName)) {
        hiddenPathGroups.delete(toggleName);
    } else {
        hiddenPathGroups.add(toggleName);
    }
    mapViews.forEach(mv => mv.renderCanvas());
    updatePathToggleUI();
}

function updatePathToggleUI() {
    document.querySelectorAll('.path-toggle').forEach(btn => {
        const toggle = btn.dataset.toggle;
        btn.classList.toggle('active', !hiddenPathGroups.has(toggle));
    });
}

function renderPathToggleUI() {
    const container = document.getElementById('path-toggles');
    if (!container) return;
    container.innerHTML = '';

    let toggleDefs = [];
    if (typeof DATA !== 'undefined' && Array.isArray(DATA.toggles)) {
        toggleDefs = DATA.toggles.map(t =>
            typeof t === 'string' ? { name: t, show: false } : t
        );
    } else if (mapViews.length > 0 && mapViews[0].mapData.paths) {
        toggleDefs = [...new Set(
            mapViews[0].mapData.paths.map(p => p.toggle).filter(g => g)
        )].map(name => ({ name, show: false }));
    }

    toggleDefs.forEach(def => {
        const toggle = def.name;
        if (!initializedToggles.has(toggle)) {
            if (!def.show) hiddenPathGroups.add(toggle);
            initializedToggles.add(toggle);
        }

        const isActive = !hiddenPathGroups.has(toggle);
        const btn = document.createElement('button');
        btn.className = 'path-toggle' + (isActive ? ' active' : '');
        btn.dataset.toggle = toggle;
        btn.textContent = toggle;
        btn.onclick = () => togglePathGroup(toggle);
        container.appendChild(btn);
    });
}

// ==========================================
// 初期化
// ==========================================
function init() {
    // CSS変数を初期化（SIZE_PRESETSと同期）
    setCellSizeCSS(CELL_SIZE);

    const controls = document.getElementById('controls');
    const pathToggles = document.getElementById('path-toggles');

    // ハッシュからインデックス取得
    const getIndexFromHash = () => {
        const hashId = window.location.hash.replace('#', '');
        if (!hashId) return -1;
        return DATA.maps.findIndex(m => String(m.id) === hashId);
    };

    // マップジャンプボタン生成
    DATA.maps.forEach((map, i) => {
        const btn = document.createElement('button');
        btn.className = 'map-label';
        btn.textContent = map.name;
        btn.addEventListener('click', () => scrollToMap(i));
        controls.appendChild(btn);
    });

    // サイズ選択ボタン生成（マップボタンの右側）
    const sizeLabels = { S: '小', M: '中', L: '大' };
    const sizeControls = document.createElement('div');
    sizeControls.id = 'size-controls';
    Object.keys(SIZE_PRESETS).forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'size-btn' + (SIZE_PRESETS[key] === CELL_SIZE ? ' active' : '');
        btn.dataset.size = key;
        btn.textContent = sizeLabels[key];
        btn.addEventListener('click', () => setMapSize(SIZE_PRESETS[key]));
        sizeControls.appendChild(btn);
    });
    controls.appendChild(sizeControls);

    // 全マップをロード
    loadAllMaps();

    // 初期ハッシュがあればスクロール
    const initialIndex = getIndexFromHash();
    if (initialIndex !== -1) {
        setTimeout(() => scrollToMap(initialIndex), 100);
    }

    // ブラウザ履歴対応
    window.addEventListener('hashchange', () => {
        const idx = getIndexFromHash();
        if (idx !== -1) {
            scrollToMap(idx);
        }
    });
}

// スタート
init();
