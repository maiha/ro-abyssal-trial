// ==========================================
// CONFIG & CONSTANTS
// ==========================================
const CELL_SIZE = 130;
const GRID_SIZE = CELL_SIZE;
const MARGIN = 20;
const dpr = window.devicePixelRatio || 1;

// DOM Elements
const stage = document.getElementById('stage');
const bgCanvas = document.getElementById('bg-canvas');
const fgCanvas = document.getElementById('fg-canvas');
const bgCtx = bgCanvas.getContext('2d');
const fgCtx = fgCanvas.getContext('2d');
const nodeLayer = document.getElementById('node-layer');

let currentMap = null;
let selectedElement = null;
const hiddenPathGroups = new Set();
const initializedToggles = new Set();

// パスグループの表示切替
function togglePathGroup(toggleName) {
    if (hiddenPathGroups.has(toggleName)) {
        hiddenPathGroups.delete(toggleName);
    } else {
        hiddenPathGroups.add(toggleName);
    }
    renderCanvas();
    updatePathToggleUI();
}

// パストグルUIの状態更新
function updatePathToggleUI() {
    document.querySelectorAll('.path-toggle').forEach(btn => {
        const toggle = btn.dataset.toggle;
        btn.classList.toggle('active', !hiddenPathGroups.has(toggle));
    });
}

// パストグルUIの生成
function renderPathToggleUI() {
    const container = document.getElementById('path-toggles');
    if (!container) return;
    container.innerHTML = '';

    // DATA.toggles（グローバル定義）または現マップのpathsからトグル名を取得
    // 形式: ["name"] または [{name: "name", show: true}]
    let toggleDefs = [];
    if (typeof DATA !== 'undefined' && Array.isArray(DATA.toggles)) {
        toggleDefs = DATA.toggles.map(t =>
            typeof t === 'string' ? { name: t, show: false } : t
        );
    } else if (currentMap.paths) {
        toggleDefs = [...new Set(
            currentMap.paths
                .map(p => p.toggle)
                .filter(g => g)
        )].map(name => ({ name, show: false }));
    }

    toggleDefs.forEach(def => {
        const toggle = def.name;
        // 初回のみ初期化
        if (!initializedToggles.has(toggle)) {
            if (!def.show) {
                hiddenPathGroups.add(toggle);
            }
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
// INITIALIZATION (Hash = map.id Support)
// ==========================================
function init() {
    const size = GRID_SIZE * 5 + MARGIN * 2;
    stage.style.width = `${size}px`;
    stage.style.height = `${size}px`;

    // 背景Canvas初期化
    bgCanvas.width = size * dpr;
    bgCanvas.height = size * dpr;
    bgCanvas.style.width = "100%";
    bgCanvas.style.height = "100%";
    bgCtx.scale(dpr, dpr);

    // 前景Canvas初期化
    fgCanvas.width = size * dpr;
    fgCanvas.height = size * dpr;
    fgCanvas.style.width = "100%";
    fgCanvas.style.height = "100%";
    fgCtx.scale(dpr, dpr);

    const controls = document.getElementById('controls');

    // ヘルパー: ハッシュIDからマップ配列のインデックスを検索
    const getIndexFromHash = () => {
        const hashId = window.location.hash.replace('#', '');
        if (!hashId) return -1;
        // 文字列として比較 (data.jsのidが数値でも文字列でも対応)
        return DATA.maps.findIndex(m => String(m.id) === hashId);
    };

    // 初期ロード時のインデックス決定
    let initialIndex = getIndexFromHash();
    if (initialIndex === -1) initialIndex = 0; // 見つからない場合は先頭

    DATA.maps.forEach((map, i) => {
        const radio = document.createElement('input');
        radio.type = 'radio'; radio.name = 'mapSelect'; radio.id = `map-${i}`; radio.value = i;
        radio.className = 'map-radio';

        // 初期状態の同期
        if (i === initialIndex) radio.checked = true;

        radio.addEventListener('change', (e) => {
            const idx = +e.target.value;
            loadMap(idx);
            // URLハッシュを map.id に更新
            if (map.id !== undefined) {
                window.location.hash = map.id;
            }
        });

        const label = document.createElement('label');
        label.htmlFor = `map-${i}`; label.className = 'map-label'; label.textContent = map.name;
        controls.appendChild(radio); controls.appendChild(label);
    });

    loadMap(initialIndex);

    // ブラウザの「戻る/進む」ボタン対応
    window.addEventListener('hashchange', () => {
        const idx = getIndexFromHash();
        if (idx !== -1) {
            loadMap(idx);
            // ラジオボタンの見た目を同期
            const targetRadio = document.getElementById(`map-${idx}`);
            if (targetRadio) targetRadio.checked = true;
        }
    });
}

// ==========================================
// LOAD & PARSE logic
// ==========================================
function loadMap(index) {
    currentMap = DATA.maps[index];
    selectedElement = null;

    // map別カスタムクラスの適用
    stage.className = currentMap.className || `map-${currentMap.id}`;

    // マップ切替時にスタイルキャッシュをクリア（map別CSSを反映するため）
    EDGE_STYLE_CACHE.clear();
    PATH_STYLE_CACHE.clear();

    const logicalNodes = parseNodes(currentMap);
    renderDOM(logicalNodes);
    renderPathToggleUI();  // hiddenPathGroupsを先に設定
    renderCanvas();
    updateHeaders();

    const notesEl = document.getElementById('map-notes');
    if (notesEl) notesEl.textContent = currentMap.notes || "";
}

function parseNodes(mapData) {
    // 1. スタイル定義のマージ
    const globalStyles = (typeof DATA !== 'undefined' && DATA.styles) ? DATA.styles : {};
    const localStyles = mapData.styles || {};
    const styles = { ...globalStyles, ...localStyles };

    const logicalNodes = [];
    const lines = mapData.edges;

    // 2. グリッド走査 (ベース作成)
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
                char: char,
                classList: classes,
                text: style.text || (char === ' ' ? '' : char),
                label: style.label || null
            });
        }
    }

    // 3. 個別上書き (nodesプロパティ)
    if (mapData.nodes) {
        mapData.nodes.forEach(conf => {
            let target = logicalNodes.find(n => n.x === conf.x && n.y === conf.y);

            if (!target) {
                target = {
                    x: conf.x, y: conf.y, char: ' ',
                    classList: ['cell', 'type-blank'],
                    text: '', label: null
                };
                logicalNodes.push(target);
            }

            // 'type-o' 自動削除
            if (target.char === 'o' && (conf.class || conf.text)) {
                target.classList = target.classList.filter(c => c !== 'type-o');
            }

            if (conf.icons) {
                // icons 配列を処理してラベルを抽出
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

            // ★修正: クラス展開ロジック (再帰なしの1段階展開)
            if (conf.class) {
                const inputClasses = conf.class.split(' ');

                inputClasses.forEach(cls => {
                    // 1. 指定されたクラス自体を追加 (重複チェック)
                    if (!target.classList.includes(cls)) {
                        target.classList.push(cls);
                    }

                    // 2. そのクラスが styles に定義を持っており、さらに class を定義している場合
                    const definedStyle = styles[cls];
                    if (definedStyle) {
                        // Text / Label の注入
                        if (definedStyle.text !== undefined) target.text = definedStyle.text;
                        if (definedStyle.label !== undefined) target.label = definedStyle.label;

                        // ★追加: 定義内の class も追加する (例: "warn-label")
                        if (definedStyle.class) {
                            const nestedClasses = definedStyle.class.split(' ');
                            nestedClasses.forEach(nestedCls => {
                                if (!target.classList.includes(nestedCls)) {
                                    target.classList.push(nestedCls);
                                }
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
function extract_edges(lines) {
    const edges = [];
    for (let r = 0; r <= 10; r++) {
        const line = lines[r] || "";
        for (let c = 0; c <= 10; c++) {
            const char = line[c] || " ";

            // 1. ノード(o)と空白( )以外はすべて有効なエッジの文字として扱う
            if (char === " " || char === "o") continue;

            // 2. 描画用の基本タイプを決定（! なら danger、それ以外は一旦 normal）
            const type = (char === '!') ? 'danger' : 'normal';

            if (r % 2 === 1 && c % 2 === 0) { // 横
                const x1 = (c - 2) / 2; const x2 = c / 2; const mapY = 4 - (r - 1) / 2;
                // 境界エッジも含める (-1 <= x1, x2 <= 5)
                if (x1 >= -1 && x2 <= 5 && mapY >= 0 && mapY <= 4) {
                    edges.push({ from: { x: x1, y: mapY }, to: { x: x2, y: mapY }, type, char });
                }
            }
            else if (r % 2 === 0 && c % 2 === 1) { // 縦
                const y1 = 4 - (r - 2) / 2; const y2 = 4 - r / 2; const mapX = (c - 1) / 2;
                // 境界エッジも含める (-1 <= y1, y2 <= 5)
                if (y1 <= 5 && y2 >= -1 && mapX >= 0 && mapX <= 4) {
                    edges.push({ from: { x: mapX, y: y1 }, to: { x: mapX, y: y2 }, type, char });
                }
            }
        }
    }
    return edges;
}

// ==========================================
// VECTOR ARROW (連続矢印の合成)
// ==========================================

// 矢印文字から方向ベクトルを取得
const ARROW_DIRECTIONS = {
    '←': { dx: -1, dy: 0 },
    '→': { dx: 1, dy: 0 },
    '↑': { dx: 0, dy: 1 },
    '↓': { dx: 0, dy: -1 }
};

// エッジリストから方向付きグラフを構築
function buildArrowGraph(edges) {
    const graph = new Map(); // "x,y" -> { next: "x,y", char }

    edges.forEach(edge => {
        const dir = ARROW_DIRECTIONS[edge.char];
        if (!dir) return; // 矢印以外はスキップ

        // エッジの方向と矢印の方向を照合して、正しい from -> to を決定
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
        graph.set(key, {
            next: `${toNode.x},${toNode.y}`,
            to: toNode,
            char: edge.char
        });
    });

    return graph;
}

// 連続パスを検出
function findArrowPaths(graph) {
    const paths = [];
    const visited = new Set();

    // 入次数を計算（始点を見つけるため）
    const inDegree = new Map();
    graph.forEach((value, key) => {
        inDegree.set(value.next, (inDegree.get(value.next) || 0) + 1);
    });

    // 始点候補: グラフに存在するが入次数が0のノード
    graph.forEach((_, key) => {
        if (!inDegree.has(key)) {
            // このノードは始点
            const path = tracePath(graph, key, visited);
            if (path.length >= 2) paths.push(path);
        }
    });

    // 残りのサイクル（始点がないループ）
    graph.forEach((_, key) => {
        if (!visited.has(key)) {
            const path = tracePath(graph, key, visited);
            if (path.length >= 2) paths.push(path);
        }
    });

    return paths;
}

// パスをトレース
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

// セル中心のピクセル座標を取得
function getCellCenter(x, y) {
    return {
        px: x * CELL_SIZE + MARGIN + CELL_SIZE / 2,
        py: (4 - y) * CELL_SIZE + MARGIN + CELL_SIZE / 2
    };
}

// セル境界寄りのピクセル座標を取得（方向に応じてオフセット）
function getCellEdgePoint(x, y, dx, dy, offset) {
    const center = getCellCenter(x, y);
    return {
        px: center.px + dx * CELL_SIZE * offset,
        py: center.py - dy * CELL_SIZE * offset  // Canvas座標系はY反転
    };
}

// Flow Arrow のスタイルを取得
function getFlowArrowStyle() {
    const style = getEdgeStyle('flowArrow');
    return {
        strokeStyle: style?.strokeStyle || '#e74c3c',
        lineWidth: style?.lineWidth || 3,
        headLength: parseFloat(style?.headLength) || 15,
        headAngle: (parseFloat(style?.headAngle) || 30) * Math.PI / 180,
        edgeOffset: parseFloat(style?.edgeOffset) || 0.35,
        arrowHead: true,   // flowArrows はデフォルトで矢頭あり
        arrowTail: false   // 矢尻はなし
    };
}

// パスのポイントを境界寄りに変換
function getFlowArrowPoints(path, edgeOffset) {
    if (path.length < 2) return [];

    const points = [];
    for (let i = 0; i < path.length; i++) {
        const curr = path[i];

        if (i === 0) {
            // 始点: 次の点への方向にオフセット（出口側寄り）
            const next = path[i + 1];
            const dx = Math.sign(next.x - curr.x);
            const dy = Math.sign(next.y - curr.y);
            points.push(getCellEdgePoint(curr.x, curr.y, dx, dy, edgeOffset));
        } else if (i === path.length - 1) {
            // 終点: 前の点から離れる方向にオフセット（セル外側寄り）
            const prev = path[i - 1];
            const dx = Math.sign(curr.x - prev.x);
            const dy = Math.sign(curr.y - prev.y);
            points.push(getCellEdgePoint(curr.x, curr.y, -dx, -dy, edgeOffset));
        } else {
            // 中間点: 中央のまま
            points.push(getCellCenter(curr.x, curr.y));
        }
    }
    return points;
}

// 曲線矢印を描画
function drawVectorArrow(ctx, path) {
    if (path.length < 2) return;

    const style = getFlowArrowStyle();
    const points = getFlowArrowPoints(path, style.edgeOffset);

    const first = points[0];
    const second = points[1];
    const last = points[points.length - 1];
    const prev = points[points.length - 2];

    // 矢頭/矢尻の分だけ短縮した終点/始点を計算
    const headAngle = Math.atan2(last.py - prev.py, last.px - prev.px);
    const tailAngle = Math.atan2(first.py - second.py, first.px - second.px);
    const shortenBy = style.headLength - style.lineWidth / 2;

    const strokeEnd = style.arrowHead ? {
        px: last.px - shortenBy * Math.cos(headAngle),
        py: last.py - shortenBy * Math.sin(headAngle)
    } : last;

    const strokeStart = style.arrowTail ? {
        px: first.px - shortenBy * Math.cos(tailAngle),
        py: first.py - shortenBy * Math.sin(tailAngle)
    } : first;

    ctx.save();
    ctx.strokeStyle = style.strokeStyle;
    ctx.lineWidth = style.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(strokeStart.px, strokeStart.py);

    if (points.length === 2) {
        ctx.lineTo(strokeEnd.px, strokeEnd.py);
    } else if (points.length === 3) {
        // 3点の場合: 中間点を経由する2本の線分（コーナーを通過）
        const mid = points[1];
        ctx.lineTo(mid.px, mid.py);
        ctx.lineTo(strokeEnd.px, strokeEnd.py);
    } else {
        // 4点以上ならスムーズな曲線（各制御点を1回だけ使用）
        for (let i = 1; i < points.length - 2; i++) {
            const xc = (points[i].px + points[i + 1].px) / 2;
            const yc = (points[i].py + points[i + 1].py) / 2;
            ctx.quadraticCurveTo(points[i].px, points[i].py, xc, yc);
        }
        // 最後の曲線セグメント
        const secondLast = points[points.length - 2];
        ctx.quadraticCurveTo(secondLast.px, secondLast.py, strokeEnd.px, strokeEnd.py);
    }

    ctx.stroke();

    // 矢頭を描画（終点側）
    if (style.arrowHead) {
        drawArrowHead(ctx, strokeEnd.px, strokeEnd.py, last.px, last.py, style);
    }

    // 矢尻を描画（始点側）
    if (style.arrowTail) {
        drawArrowHead(ctx, strokeStart.px, strokeStart.py, first.px, first.py, style);
    }

    ctx.restore();
}

// 矢頭を描画
function drawArrowHead(ctx, fromX, fromY, toX, toY, style) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const headLength = style?.headLength || 15;
    const headAngle = style?.headAngle || Math.PI / 6;

    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - headLength * Math.cos(angle - headAngle),
        toY - headLength * Math.sin(angle - headAngle)
    );
    ctx.lineTo(
        toX - headLength * Math.cos(angle + headAngle),
        toY - headLength * Math.sin(angle + headAngle)
    );
    ctx.closePath();
    ctx.fill();
}

// ==========================================
// PATH TRAJECTORY (座標列から軌跡を描画)
// ==========================================

const PATH_STYLE_CACHE = new Map();

// 単一スタイルを CSS から取得
function getPathStyleSingle(styleName) {
    const key = styleName || 'default';
    if (PATH_STYLE_CACHE.has(key)) return PATH_STYLE_CACHE.get(key);

    const dummy = document.createElement('div');
    dummy.setAttribute('data-path', key);
    stage.appendChild(dummy);
    const style = window.getComputedStyle(dummy);

    const config = {
        strokeStyle: style.getPropertyValue('--strokeStyle').trim() || null,
        lineWidth: parseFloat(style.getPropertyValue('--lineWidth')) || null,
        headLength: parseFloat(style.getPropertyValue('--headLength')) || null,
        headAngle: parseFloat(style.getPropertyValue('--headAngle')) || null,
        edgeOffset: parseFloat(style.getPropertyValue('--edgeOffset')) || null,
        arrowHead: style.getPropertyValue('--arrowHead').trim() || null,
        arrowTail: style.getPropertyValue('--arrowTail').trim() || null,
        fontSize: parseFloat(style.getPropertyValue('--fontSize')) || null
    };

    stage.removeChild(dummy);
    PATH_STYLE_CACHE.set(key, config);
    return config;
}

// Path スタイルを取得（複合スタイル対応: "bidirectional danger"）
function getPathStyle(styleNames) {
    const names = (styleNames || 'default').split(/\s+/);

    // デフォルト値
    const merged = {
        strokeStyle: '#3498db',
        lineWidth: 4,
        headLength: 12,
        headAngle: 30,
        edgeOffset: 0.35,
        arrowHead: '1',
        arrowTail: '0',
        fontSize: 14
    };

    // 各スタイルを順番にマージ
    for (const name of names) {
        const style = getPathStyleSingle(name);
        if (style.strokeStyle) merged.strokeStyle = style.strokeStyle;
        if (style.lineWidth) merged.lineWidth = style.lineWidth;
        if (style.headLength) merged.headLength = style.headLength;
        if (style.headAngle) merged.headAngle = style.headAngle;
        if (style.edgeOffset) merged.edgeOffset = style.edgeOffset;
        if (style.arrowHead) merged.arrowHead = style.arrowHead;
        if (style.arrowTail) merged.arrowTail = style.arrowTail;
        if (style.fontSize) merged.fontSize = style.fontSize;
    }

    // 最終変換
    return {
        strokeStyle: merged.strokeStyle,
        lineWidth: merged.lineWidth,
        headLength: merged.headLength,
        headAngle: merged.headAngle * Math.PI / 180,
        edgeOffset: merged.edgeOffset,
        arrowHead: merged.arrowHead !== '0',
        arrowTail: merged.arrowTail === '1',
        fontSize: merged.fontSize
    };
}

// Path 軌跡を描画
function drawPathTrajectory(ctx, pathDef) {
    const cells = pathDef.cells;
    if (!cells || cells.length < 2) return;

    // 座標配列を { x, y } 形式に変換
    const path = cells.map(c => ({ x: c[0], y: c[1] }));
    const style = getPathStyle(pathDef.style);
    const points = getFlowArrowPoints(path, style.edgeOffset);

    if (points.length < 2) return;

    // pathDef でスタイルをオーバーライド可能
    const drawHead = pathDef.arrowHead ?? style.arrowHead;
    const drawTail = pathDef.arrowTail ?? style.arrowTail;

    const first = points[0];
    const second = points[1];
    const last = points[points.length - 1];
    const prev = points[points.length - 2];

    // 矢頭/矢尻の分だけ短縮した終点/始点を計算
    const headAngle = Math.atan2(last.py - prev.py, last.px - prev.px);
    const tailAngle = Math.atan2(first.py - second.py, first.px - second.px);
    const shortenBy = style.headLength - style.lineWidth / 2;

    const strokeEnd = drawHead ? {
        px: last.px - shortenBy * Math.cos(headAngle),
        py: last.py - shortenBy * Math.sin(headAngle)
    } : last;

    const strokeStart = drawTail ? {
        px: first.px - shortenBy * Math.cos(tailAngle),
        py: first.py - shortenBy * Math.sin(tailAngle)
    } : first;

    ctx.save();
    ctx.strokeStyle = style.strokeStyle;
    ctx.lineWidth = style.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(strokeStart.px, strokeStart.py);

    if (points.length === 2) {
        ctx.lineTo(strokeEnd.px, strokeEnd.py);
    } else if (points.length === 3) {
        // 3点の場合: 中間点を経由する2本の線分（コーナーを通過）
        const mid = points[1];
        ctx.lineTo(mid.px, mid.py);
        ctx.lineTo(strokeEnd.px, strokeEnd.py);
    } else {
        // 4点以上ならスムーズな曲線（各制御点を1回だけ使用）
        for (let i = 1; i < points.length - 2; i++) {
            const xc = (points[i].px + points[i + 1].px) / 2;
            const yc = (points[i].py + points[i + 1].py) / 2;
            ctx.quadraticCurveTo(points[i].px, points[i].py, xc, yc);
        }
        // 最後の曲線セグメント
        const secondLast = points[points.length - 2];
        ctx.quadraticCurveTo(secondLast.px, secondLast.py, strokeEnd.px, strokeEnd.py);
    }

    ctx.stroke();

    // 矢頭を描画（終点側）
    if (drawHead) {
        drawArrowHead(ctx, strokeEnd.px, strokeEnd.py, last.px, last.py, style);
    }

    // 矢尻を描画（始点側）
    if (drawTail) {
        drawArrowHead(ctx, strokeStart.px, strokeStart.py, first.px, first.py, style);
    }

    // ラベルを描画
    if (pathDef.label) {
        let labelIndex;
        switch (pathDef.labelAt) {
            case 'start': labelIndex = 0; break;
            case 'end': labelIndex = points.length - 1; break;
            default: labelIndex = Math.floor(points.length / 2);
        }
        const labelPoint = points[labelIndex];
        ctx.font = `bold ${style.fontSize}px sans-serif`;
        ctx.fillStyle = style.strokeStyle;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(pathDef.label, labelPoint.px, labelPoint.py - 10);
    }

    ctx.restore();
}

// ==========================================
// RENDER CANVAS (Single fg-canvas for all edges)
// ==========================================
function renderCanvas() {
    const size = GRID_SIZE * 5 + MARGIN * 2;
    fgCtx.clearRect(0, 0, size, size);

    if (!currentMap) return;

    const edgeData = extract_edges(currentMap.edges);
    const edgeMap = new Map();
    const useFlowArrows = currentMap.flowArrows === true;

    edgeData.forEach(({ from, to, type, char }) => {
        const k1 = `${from.x},${from.y},${to.x},${to.y}`;
        const k2 = `${to.x},${to.y},${from.x},${from.y}`;
        const edgeObj = { type, char, from, to };
        edgeMap.set(k1, edgeObj);
        edgeMap.set(k2, edgeObj);
    });

    const getEdgeObj = (x1, y1, x2, y2) => edgeMap.get(`${x1},${y1},${x2},${y2}`);

    // 矢印文字かどうか判定
    const isArrowChar = (char) => ARROW_DIRECTIONS.hasOwnProperty(char);

    // flowArrows時は矢印文字を 'flowArrowPath' スタイルで描画
    const resolveEdgeChar = (edge) => {
        if (!edge) return 'wall';
        if (useFlowArrows && isArrowChar(edge.char)) return 'flowArrowPath';
        return edge.char;
    };

    // 全エッジをfg-canvasに描画（経路を先、壁を後）
    // Pass 1: 経路（壁以外）
    drawLayer(fgCtx, getEdgeObj, (edge) => edge !== undefined, resolveEdgeChar);
    // Pass 2: 壁（経路がない箇所）
    drawLayer(fgCtx, getEdgeObj, (edge) => edge === undefined, resolveEdgeChar);

    // Pass 3: Flow Arrows（連続矢印の曲線描画）
    if (useFlowArrows) {
        const arrowGraph = buildArrowGraph(edgeData);
        const arrowPaths = findArrowPaths(arrowGraph);
        arrowPaths.forEach(path => drawVectorArrow(fgCtx, path));
    }

    // Pass 4: Path Trajectories（座標列からの軌跡描画）
    if (currentMap.paths && Array.isArray(currentMap.paths)) {
        currentMap.paths
            .filter(pathDef => !pathDef.toggle || !hiddenPathGroups.has(pathDef.toggle))
            .forEach(pathDef => drawPathTrajectory(fgCtx, pathDef));
    }
}

function drawLayer(targetCtx, getEdgeObj, conditionFn, resolveEdgeChar) {
    for (let y = 0; y <= 4; y++) {
        for (let x = 0; x <= 4; x++) {
            const px = x * CELL_SIZE + MARGIN;
            const py = (4 - y) * CELL_SIZE + MARGIN;

            // --- 横方向の接続判定 (境界線は垂直に引く) ---
            if (x < 4) {
                const edge = getEdgeObj(x, y, x + 1, y);
                if (conditionFn(edge)) {
                    const char = resolveEdgeChar(edge);
                    drawEdgeFeature(targetCtx, px + CELL_SIZE, py, px + CELL_SIZE, py + CELL_SIZE, char);
                }
            }

            // --- 縦方向の接続判定 (境界線は水平に引く) ---
            if (y < 4) {
                const edge = getEdgeObj(x, y, x, y + 1);
                if (conditionFn(edge)) {
                    const char = resolveEdgeChar(edge);
                    drawEdgeFeature(targetCtx, px, py, px + CELL_SIZE, py, char);
                }
            }

            // --- 左境界エッジ (x=0 の左側) ---
            if (x === 0) {
                const edge = getEdgeObj(-1, y, 0, y);
                if (conditionFn(edge)) {
                    const char = resolveEdgeChar(edge);
                    drawEdgeFeature(targetCtx, px, py, px, py + CELL_SIZE, char);
                }
            }

            // --- 上境界エッジ (y=4 の上側) ---
            if (y === 4) {
                const edge = getEdgeObj(x, 4, x, 5);
                if (conditionFn(edge)) {
                    const char = resolveEdgeChar(edge);
                    drawEdgeFeature(targetCtx, px, py, px + CELL_SIZE, py, char);
                }
            }

            // --- 右境界エッジ (x=4 の右側) ---
            if (x === 4) {
                const edge = getEdgeObj(4, y, 5, y);
                if (conditionFn(edge)) {
                    const char = resolveEdgeChar(edge);
                    drawEdgeFeature(targetCtx, px + CELL_SIZE, py, px + CELL_SIZE, py + CELL_SIZE, char);
                }
            }

            // --- 下境界エッジ (y=0 の下側) ---
            if (y === 0) {
                const edge = getEdgeObj(x, -1, x, 0);
                if (conditionFn(edge)) {
                    const char = resolveEdgeChar(edge);
                    drawEdgeFeature(targetCtx, px, py + CELL_SIZE, px + CELL_SIZE, py + CELL_SIZE, char);
                }
            }
        }
    }
}
const EDGE_STYLE_CACHE = new Map();

// CSSのbackgroundImage値をImageオブジェクトに変換する
function solveImage(bgImgValue) {
    if (!bgImgValue || bgImgValue === 'none') return null;
    const url = bgImgValue.match(/url\(["']?(.*?)["']?\)/)?.[1];
    if (!url) return null;

    const img = new Image();
    img.src = url;
    img.onload = () => { if (window.renderCanvas) renderCanvas(); };
    return img;
}

function getEdgeStyle(char) {
    if (!char) return null;
    if (EDGE_STYLE_CACHE.has(char)) return EDGE_STYLE_CACHE.get(char);

    const dummy = document.createElement('div');
    dummy.setAttribute('data-edge', char);
    stage.appendChild(dummy);
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
        image: solveImage(style.backgroundImage),
        width: parseFloat(style.width) || 32,
        height: parseFloat(style.height) || 32,
        headLength: style.getPropertyValue('--headLength').trim(),
        headAngle: style.getPropertyValue('--headAngle').trim(),
        edgeOffset: style.getPropertyValue('--edgeOffset').trim()
    };

    stage.removeChild(dummy);
    EDGE_STYLE_CACHE.set(char, config);
    return config;
}


function drawEdgeFeature(ctx, x1, y1, x2, y2, char) {
    const style = getEdgeStyle(char);
    if (!style) return;

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

// ==========================================
// RENDER DOM Nodes
// ==========================================
function renderDOM(nodes) {
    nodeLayer.innerHTML = '';
    nodes.forEach(node => {
        // --- 親セル (Container) ---
        const el = document.createElement('div');
        el.className = 'cell ' + node.classList.join(' ');

        if (node.label) el.setAttribute('data-label', node.label);

        const px = node.x * CELL_SIZE + MARGIN;
        const py = (4 - node.y) * CELL_SIZE + MARGIN;

        el.style.left = `${px}px`; el.style.top = `${py}px`;
        el.textContent = node.text;

        // data.js で icons: ["a b", ...] と書けるようにする
        if (node.icons && Array.isArray(node.icons)) {
            node.icons.forEach(iconDef => {
                const childEl = document.createElement('div');
                // "sub-icon" はCSSでの共通設定用（position: absolute等）
                // iconDef は { className, label } または 文字列
                const className = typeof iconDef === 'string' ? iconDef : iconDef.className;
                const label = typeof iconDef === 'object' ? iconDef.label : null;
                childEl.className = 'sub-icon ' + className;
                if (label) childEl.setAttribute('data-label', label);
                el.appendChild(childEl);
            });
        }
        // ----------------------------------------------------

        // (互換性維持) 以前の children オブジア式も一応残すならここ
        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(childDef => {
                const childEl = document.createElement('div');
                childEl.className = 'sub-icon ' + (childDef.class || '');
                el.appendChild(childEl);
            });
        }

        el.addEventListener('click', () => onCellClick(el, node));
        nodeLayer.appendChild(el);
    });
}

function onCellClick(el, nodeData) {
    if (selectedElement) selectedElement.classList.remove('selected');
    el.classList.add('selected');
    selectedElement = el;

    const infoDiv = document.getElementById('node-detail');
    // headersが存在しない場合のガード
    const n = currentMap.headers?.y[nodeData.y] || '?';
    const e = currentMap.headers?.x[nodeData.x] || '?';
    const d = currentMap.id ? `D${currentMap.id}` : '';

    infoDiv.innerHTML = `
        <span class="coord">${n}-${e}-${d}</span>
    `;
}

function updateHeaders() {
    const hX = document.getElementById('headerX');
    const hY = document.getElementById('headerY');
    const hCorner = document.getElementById('headerCorner');
    const hTitle = document.getElementById('mapTitle');

    if (!hX || !hY) return;

    hX.innerHTML = ''; hY.innerHTML = '';

    // ヘッダー生成
    if (currentMap.headers) {
        currentMap.headers.x.forEach(v => {
            const d = document.createElement('div'); d.textContent = v; hX.appendChild(d);
        });
        [...currentMap.headers.y].reverse().forEach(v => {
            const d = document.createElement('div'); d.textContent = v; hY.appendChild(d);
        });
    }

    // 左下コーナー: マップID (例: "D1")
    if (hCorner) {
        hCorner.textContent = currentMap.id ? `D${currentMap.id}` : '';
    }

    // 上部タイトル: map.name
    if (hTitle) {
        hTitle.textContent = currentMap.name || '';
    }
}

// Start
init();
