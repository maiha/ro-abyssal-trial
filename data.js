// data.js

const DATA = {
    // 全マップ共通のデザイン定義
    styles: {
        'B': { text: 'ボス', class: 'icon-boss' },
        'Z': { text: 'ゾンビ', class: 'icon-zombie' },
        'G': { text: 'ゴーレム', class: 'icon-golem' },
        'T': { text: '宝箱', class: 'icon-treasure' },
        'E': { text: '障壁解除' },
        'W': { text: '注意', class: 'icon-warn' },

        '1F': { label: "1F" },
        '2F': { label: "2F" },
        '3F': { label: "3F" },
        '4F': { label: "4F" },
        '5F': { label: "5F" },
        '6F': { label: "6F" },
        '7F': { label: "7F" },
        '8F': { label: "8F" },
        '9F': { label: "9F" },
        '10F': { label: "10F" },
    },

    // マップデータの配列
    maps: [
        {
            id: 1,
            name: "1F",
            headers: { x: ["E0", "E1", "E2", "E3", "E4"], y: ["N0", "N1", "N2", "N3", "N4"] },
            notes: "",
            edges: [
                " !         ",
                "!W!o-B-o-o ",
                " | | |   | ",
                "!W-W!o E-o ",
                " ! ! |   | ",
                " o-o-o-o-o ",
                " | |     | ",
                " o T o-o o ",
                " |   | | | ",
                " o-o-o Z o ",
                "           ",
            ],
            styles: {
                'W': { class: 'cell-black', text: '暗闇' },
                'E': { text: '2F障壁解除' },
                'start': { text: "開始地点" },
                //                'boss': { text: "BOSS", class: "icon-boss" }
            },
            nodes: [
                { x: 4, y: 0, class: "icon-up 2F" }, // CSSクラス"icon-up" と データ"2F"を適用
                { x: 0, y: 0, class: "start" },      // データ"start"を適用
            ],
            notes: "(未実装)"
        },
        {
            id: 2,
            name: "2F",
            headers: { x: ["E0", "E1", "E2", "E3", "E4"], y: ["N0", "N1", "N2", "N3", "N4"] },
            notes: "",
            edges: [
                "           ",
                " o-o Z-o-o ",
                "       | | ",
                " o-E-o-E o ",
                " | | | | | ",
                " o o B o-o ",
                " | |   | | ",
                " o-E-o-E o ",
                " |   |   | ",
                " o-o o-o-o ",
                "           ",
            ],

            styles: {
                'E': { text: '燭台' },
            },

            nodes: [
                { x: 1, y: 4, class: "icon-up 3F" },
                { x: 0, y: 4, class: "icon-down 1F" },
                { x: 4, y: 0, class: "icon-down 1F" },
                { x: 3, y: 3, label: "障壁解除" },
                { x: 2, y: 2, icons: ["icon-up br 3F"] },
            ]
        },
        {
            id: 3,
            name: "3F",
            headers: { x: ["E0", "E1", "E2", "E3", "E4"], y: ["N0", "N1", "N2", "N3", "N4"] },
            notes: "",
            edges: [
                "           ",
                " o-B o-E-o ",
                " |       | ",
                " o o-o-o-o ",
                " | |       ",
                " o-o o-o-o ",
                "   |     | ",
                " o-o-o-o-o ",
                " |   |   | ",
                " Z E-o-E T ",
                "           ",
            ],
            nodes: [
                { x: 2, y: 4, class: "icon-up 4F" },
                { x: 2, y: 2, class: "icon-down 2F" },
            ]
        },
        {
            id: 4,
            name: "4F",
            headers: { x: ["E0", "E1", "E2", "E3", "E4"], y: ["N0", "N1", "N2", "N3", "N4"] },
            notes: "",
            edges: [
                "           ",
                " o-o-o-o-o ",
                " |     | | ",
                " o-o-o-o o ",
                " | |   | | ",
                " Z o B-o-T ",
                " | |   | | ",
                " o o-o-o-o ",
                " |       | ",
                " o-o-E-o-o ",
                "           ",
            ],
            styles: {
                '5F!': { label: "5F(一方通行)", class: "warn-label" },
            },

            nodes: [
                { x: 2, y: 4, class: "icon-down 3F" },
                { x: 1, y: 3, class: "icon-up 5F" },
                { x: 3, y: 3, class: "icon-up 5F" },
                { x: 1, y: 1, class: "icon-up 5F" },
                { x: 3, y: 1, class: "icon-up 5F" },
                // 一方通行
                { x: 0, y: 4, icons: ["icon-up tm 5F!"] },
                { x: 4, y: 4, icons: ["icon-up tm 5F!"] },
                { x: 0, y: 0, icons: ["icon-up bm 5F!"] },
                { x: 4, y: 0, icons: ["icon-up bm 5F!"] },
            ]
        },
        {
            id: 5,
            name: "5F",
            headers: { x: ["E0", "E1", "E2", "E3", "E4"], y: ["N0", "N1", "N2", "N3", "N4"] },
            notes: "",
            edges: [
                "           ",
                " o-G-T G-E ",
                " |   | | | ",
                " G-o G o G ",
                " |   |   | ",
                " o-G-o-G-G ",
                "     |     ",
                " G-o B o-G ",
                " |       | ",
                " o-G-Z T-o ",
                "           ",
            ],
            styles: {
            },

            nodes: [
                { x: 4, y: 3, class: "icon-up 6F" },
                { x: 1, y: 3, class: "icon-down 4F" },
                { x: 3, y: 3, class: "icon-down 4F" },
                { x: 1, y: 1, class: "icon-down 4F" },
                { x: 3, y: 1, class: "icon-down 4F" },
            ]
        },
        {
            id: 6,
            name: "6F",
            headers: { x: ["E0", "E1", "E2", "E3", "E4"], y: ["N0", "N1", "N2", "N3", "N4"] },
            notes: "",
            edges: [
                "           ",
                " T o T o T ",
                "           ",
                " G B G Z G ",
                " | | | | | ",
                " G-o-G-o-G ",
                "         | ",
                " G-G-G-G-G ",
                " ! ! ! ! ! ",
                " T T T T T ",
                "           ",
            ],
            styles: {
            },

            nodes: [
                { x: 1, y: 3, icons: ["icon-up tr 7F"] },
                { x: 4, y: 3, class: "icon-down 5F" },
            ]
        },
        {
            id: 7,
            name: "7F",
            headers: { x: ["E0", "E1", "E2", "E3", "E4"], y: ["N0", "N1", "N2", "N3", "N4"] },
            notes: "",
            edges: [
                "           ",
                " Z←G-G←o←G ",
                " ↓ ↑ ↓   ↑ ",
                " o-G o G→G ",
                " ↓   ↓ ↑ | ",
                " G→o-B-o←o ",
                " | ↓ |   ↑ ",
                " G←o o→T o ",
                " ↓   ↑ ↓ ↑ ",
                " o→o→o-o→G ",
                "           ",
            ],
            flowArrows: true,
            styles: {
                '8F!': { label: '8F右下' },
            },
            nodes: [
                { x: 1, y: 3, icons: ["icon-down tl 6F", "icon-up br 8F!"] },
            ]
        },
        {
            id: 8,
            name: "8F",
            headers: { x: ["E2", "E3", "E4", "E0", "E1"], y: ["N3", "N4", "N0", "N1", "N2"] },
            notes: "",
            edges: [
                "           ",
                " T o o o o ",
                "           ",
                " o B o-o-o ",
                "   | |   | ",
                " o o G o-o ",
                "   | | | | ",
                " o o Z o o ",
                "   |   | | ",
                " o o-o-o o ",
                "           ",
            ],
            styles: {
                '9F!': { label: '9F右下側' },
            },
            nodes: [
                { x: 4, y: 0, class: "icon-down 7F" },
                { x: 1, y: 3, icons: ["icon-up tl 9F!"] },
            ]
        },
        {
            id: 9,
            name: "9F",
            headers: { x: ["E0", "E1", "E2", "E3", "E4"], y: ["N0", "N1", "N2", "N3", "N4"] },
            notes: "",
            edges: [
                "           ",
                " o-o o-o Z ",
                " | | | | | ",
                " o o-G o o ",
                " |     | | ",
                " T-o-B o-o ",
                "     |     ",
                " o-o-G G-o ",
                " |       | ",
                " o-o-o-G-o ",
                "           ",
            ],
            nodes: [
                { x: 1, y: 3, class: "icon-up 10F" },
                { x: 3, y: 3, class: "icon-up 10F" },
                { x: 1, y: 1, class: "icon-up 10F" },
                { x: 3, y: 1, class: "icon-down 8F" },
            ]
        },
        {
            id: 10,
            name: "10F",
            headers: { x: ["E0", "E1", "E2", "E3", "E4"], y: ["N0", "N1", "N2", "N3", "N4"] },
            notes: "",
            edges: [
                "           ",
                " T o o-o-o ",
                " |   |     ",
                " o-o o-o o ",
                "     ! ! ! ",
                " o o!o-o-o!",
                " |   | ! | ",
                " o-o B B!o!",
                " | | ! ! | ",
                " o-o!o-o-o!",
                "     ! ! ! ",
            ],
            nodes: [
                { x: 2, y: 1, text: "裏ボス" },
                { x: 3, y: 1, text: "表ボス" },

                { x: 1, y: 3, class: "icon-down 9F" },
                { x: 3, y: 3, class: "icon-down 9F" },
                { x: 1, y: 1, class: "icon-down 9F" },
            ]
        }
    ]
};
