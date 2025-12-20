# RO 深淵の試練場 MAP Tool

## データ構造 (`data.js`)

アセット定義（画像・色・フォント）はすべて **CSS** で管理し、`data.js` はトポロジーと属性定義のみを保持します。

- **edges**: 11x11のASCIIグリッド。通路、壁、矢印、特殊記号（`!`, `W`等）を定義。
- **nodes**: セル（5x5）の属性。座標、種別、メタ情報を保持。

### 関係性
1.  **edges の各文字**: CSS の `div[data-edge="文字"]` と紐付き、外観（色、太さ、画像、テキスト）が決定される。
2.  **nodes の type**: セルの Class 名（`.type-S` 等）と紐付き、背景色やアイコンが決定される。

```javascript
const GRAPH_DATA = {
  edges: [
    "   |       |   ",
    " o-o-o-o-o ",
    " |   |   ↓ ",
    "-o o-o→o-o ",
    " ↑   |     ",
    " o-o-o o o ",
    "     ↓ ↑   ",
    " o-o→o←o-o ",
    " |       | ",
    " o-o-o-o-o ",
    "           ",
  ],
  nodes: [
    {x:0, y:4, type: "S", info: "入口"},
    {x:4, y:0, type: "G", info: "次の階層へ"},
    {x:2, y:2, type: "B", info: "ボス"},
    {x:1, y:1, type: "T", info: "宝箱"},
  ]
};
```

## デザイン管理 (JS/CSS 分離ルール)

JSは具体的な描画パラメータを持たず、実行時に CSS から `getComputedStyle` を用いて動的に解決します。

- **Canvasの線/色**: CSSのカスタムプロパティ（`--lineWidth`, `--strokeStyle`）で制御。
- **テキスト**: CSSの `--edge-text` および `font` プロパティで制御。
- **画像**: CSSの `background-image` と `width`/`height` で制御。

## 記号一覧

### エッジ (`edges`)

| 記号 | 意味 (CSS定義) |
|------|------|
| `-`, `|` | 通常通路（`--lineWidth: 2` 等） |
| `→`, `←`, `↑`, `↓` | 一方通行（矢印テキスト描画） |
| `!` | 危険地帯（警告アイコン/色変更） |
| `W` | ワープポイント（画像描画） |
| ` ` | 接続なし |

### ノード種別 (`nodes.type`)

| Type | 意味 |
|------|------|
| `S` | Start (入口) |
| `G` | Goal (出口) |
| `B` | Boss (ボス) |
| `T` | Treasure (宝箱) |

## 座標系

原点(0,0)は**左下**。

```
y
4 S   o   o   o   o
3 o   o   o   o   o
2 o   o   B   o   o
1 o   T   o   o   o
0 o   o   o   o   G
  0   1   2   3   4  x
```

## 注意事項
- **WYSIWYG**: `edges` のレイアウトを崩さないよう等幅フォント環境で編集すること。
- **CP437互換**: 矢印文字(↑↓←→)はCP437由来でターミナル環境で安定
