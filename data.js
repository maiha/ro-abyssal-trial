// data.js

const DATA = {
    toggles: [{ name: '最短ルート', show: true }],

    // 全マップ共通のデザイン定義
    styles: {
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
            title: "1F",
            headers: { x: ["E0", "E1", "E2", "E3", "E4"], y: ["N0", "N1", "N2", "N3", "N4"] },
            notes: "",
            edges: [
                " !         ",
                "!W!o-B-o-o ",
                " | | |   | ",
                "!W-W!o E-o ",
                " ! ! |     ",
                " o-o-o-o-o ",
                " | |     | ",
                " o T o-o o ",
                " |   | | | ",
                " o-o-o Z o ",
                "           ",
            ],
            styles: {
                'W': { class: 'cell-black', text: '暗闇' },
                'start': { text: "開始地点" },
                //                'boss': { text: "BOSS", class: "icon-boss" }
            },
            nodes: [
                { x: 4, y: 0, class: "icon-up 2F" }, // CSSクラス"icon-up" と データ"2F"を適用
                { x: 0, y: 0, class: "start" },      // データ"start"を適用
                { x: 3, y: 3, label: "障壁(0-0-6)" },
            ],
            paths: [
                {
                    toggle: '最短ルート',
                    cells: [[0, 0], [0, 2], [2, 2], [2, 4], [1, 4], [1, 3], [0, 3], [0, 4]],
                    style: 'PT1',
                    label: 'PT1',
                    labelAt: 'start',
                },
                {
                    toggle: '最短ルート',
                    cells: [[0, 0], [2, 0], [2, 1], [3, 1], [3, 0]],
                    style: 'PT2',
                    label: 'PT2',
                    labelAt: 'start',
                },
                {
                    toggle: '最短ルート',
                    cells: [[2, 2], [4, 2], [4, 0]],
                    style: 'PT2',
                    label: 'PT2',
                    labelAt: 'start',
                }

            ],
            //		toggle: "ルート表示",
            notes: "(未実装)"
        },
        {
            id: 2,
            name: "2F",
          title: "2F",
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
                { x: 3, y: 3, label: "障壁(0-1-6)" },
                { x: 2, y: 2, icons: ["icon-up br 3F"] },
            ],
            paths: [
                {
                    toggle: '最短ルート',
                    cells: [[0, 4], [1, 4]],
                    style: 'PT1',
                    label: 'PT1',
                    labelAt: 'middle',
                },
                {
                    toggle: '最短ルート',
                    cells: [[4, 0], [4, 4], [2, 4]],
                    style: 'PT2',
                    label: 'PT2',
                    labelAt: 'start',
                }
            ]
        },
        {
            id: 3,
            name: "3F",
          title: "3F",
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
                { x: 1, y: 0, label: "障壁(0-2-6)" },
                { x: 2, y: 4, class: "icon-up 4F" },
                { x: 2, y: 2, class: "icon-down 2F" },
            ],
            paths: [
                {
                    toggle: '最短ルート',
                    cells: [[1, 4], [0, 4], [0, 2], [1, 2], [1, 1], [2, 1], [2, 0], [3, 0]],
                    style: 'PT1',
                    label: 'PT1',
                    labelAt: 'start',
                },
                {
                    toggle: '最短ルート',
                    cells: [[3, 4], [2, 4]],
                    style: 'PT1',
                },
                {
                    toggle: '最短ルート',
                    cells: [[1, 1], [0, 1], [0, 0]],
                    style: 'PT2',
                    label: 'PT2',
                    labelAt: 'start',
                },
                {
                    toggle: '最短ルート',
                    cells: [[1, 2], [1, 3], [4, 3], [4, 4], [3, 4]],
                    style: 'PT2',
                }
            ]
        },
        {
            id: 4,
            name: "4F",
          title: "4F",
            headers: { x: ["E0", "E1", "E2", "E3", "E4"], y: ["N0", "N1", "N2", "N3", "N4"] },
            notes: "",
            edges: [
                "           ",
                " o-o-o-o-o ",
                " |     | | ",
                " o-o-o-o o ",
                " | |   | | ",
                " Z o B-o T ",
                " | |   | | ",
                " o o-o-o-o ",
                " | |     | ",
                " o-o-E-o-o ",
                "           ",
            ],
            styles: {
                '5F!': { label: "5F(一方)", class: "warn-label" },
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

                { x: 2, y: 0, label: "障壁(0-3-6)" },
            ],

            paths: [
                {
                    toggle: '最短ルート',
                    cells: [[2, 4], [0, 4], [0, 0]],
                    style: 'PT1',
                    label: 'PT1',
                    labelAt: 'start',
                }
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
                " |   | |   ",
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
                { x: 4, y: 4, label: "障壁(0-4-6)" },
            ],

            paths: [
                {
                    toggle: '最短ルート',
                    cells: [[0, 0], [2, 0]],
                    style: 'PT1',
                    label: 'PT1',
                    labelAt: 'start',
                },
                {
                    toggle: '最短ルート',
                    cells: [[2, 2], [4, 2], [4, 3]],
                    style: 'PT1',
                },
                {
                    toggle: '最短ルート',
                    cells: [[0, 4], [0, 2], [2, 2], [2, 1]],
                    style: 'PT2',
                    label: 'PT2',
                    labelAt: 'start',
                }
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
                // 障壁解除
                { x: 0, y: 0, label: "N3-E3-D1" },
                { x: 1, y: 0, label: "N3-E3-D2" },
                { x: 2, y: 0, label: "N0-E1-D3" },
                { x: 3, y: 0, label: "N0-E2-D4" },
                { x: 4, y: 0, label: "N4-E4-D5" },
            ],


            paths: [
                {
                    toggle: '最短ルート',
                    cells: [[4, 3], [4, 2], [1, 2], [1, 3]],
                    style: 'PT1',
                    label: 'PT1',
                    labelAt: 'start',
                },
                {
                    toggle: '最短ルート',
                    cells: [[3, 2], [3, 3]],
                    style: 'PT2',
                    label: 'PT2',
                    labelAt: 'start',
                }
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
                { x: 2, y: 1, text: "裏" },
                { x: 3, y: 1, text: "表" },

                { x: 1, y: 3, class: "icon-down 9F" },
                { x: 3, y: 3, class: "icon-down 9F" },
                { x: 1, y: 1, class: "icon-down 9F" },
            ],
            paths: [
                {
                    toggle: '最短ルート',
                    cells: [[2, 1], [2, 2], [4, 2], [4, 0], [2, 0]],
                    style: 'PT1',
                    label: 'PT1',
                    labelAt: 'start',
                }
            ]
        }
    ]
};
