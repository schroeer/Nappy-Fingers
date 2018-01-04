var boards = [
    {
        "id":    "bm1000",
        "name":  "Beastmaker 1000",
        "image": "bm1000.png",
        "holds": {
            "1":    {
                "name": "jug",
                "image": "bm1000_01.png"
            },
            "2":    {
                "name": "hard sloper",
                "image": "bm1000_02.png"
            },
            "3":    {
                "name": "easy sloper",
                "image": "bm1000_03.png"
            },
            "4":    {
                "name": "hard four finger pocket",
                "image": "bm1000_04.png"
            },
            "5":    {
                "name": "easy four finger pocket",
                "image": "bm1000_05.png"
            },
            "6":    {
                "name": "medium four finger pocket",
                "image": "bm1000_06.png"
            },
            "7":    {
                "name": "easy two finger pocket",
                "image": "bm1000_07.png"
            },
            "8":    {
                "name": "hard two finger pocket",
                "image": "bm1000_08.png"
            },
            "9":    {
                "name": "easy three finger pocket",
                "image": "bm1000_09.png"
            },
            "10":   {
                "name": "hard three finger pocket",
                "image": "bm1000_10.png"
            },
            "11":   {
                "name": "medium three finger pocket",
                "image": "bm1000_11.png"
            },
            "21":   {
                "name": "jug",
                "image": "bm1000_21.png"
            },
            "22":   {
                "name": "hard sloper",
                "image": "bm1000_22.png"
            },
            "23":   {
                "name": "easy sloper",
                "image": "bm1000_23.png"
            },
            "24":   {
                "name": "hard four finger pocket",
                "image": "bm1000_24.png"
            },
            "25":   {
                "name": "easy four finger pocket",
                "image": "bm1000_25.png"
            },
            "26":   {
                "name": "medium four finger pocket",
                "image": "bm1000_26.png"
            },
            "27":   {
                "name": "easy two finger pocket",
                "image": "bm1000_27.png"
            },
            "28":   {
                "name": "hard two finger pocket",
                "image": "bm1000_28.png"
            },
            "29":   {
                "name": "easy three finger pocket",
                "image": "bm1000_29.png"
            },
            "30":   {
                "name": "hard three finger pocket",
                "image": "bm1000_30.png"
            },
            "31":   {
                "name": "medium three finger pocket",
                "image": "bm1000_31.png"
            },
            "40":   {
                "name": "central pocket",
                "image": "bm1000_40.png"
            }
        }
    }
];

var trainings = [
    {
        "title":        "Little Boy",
        "description":  "Much hanging on good holds",
        "board":        "bm1000",
        "sets":         [
            {
                "title":        "Warm up",
                "description":  "Hang on straight arms",
                "left":         1,
                "right":        21,
                "hold":         7,
                "break":        4,
                "reps":         7,
                "pause":        15,
            },
            {
                "title":        "Pull up 2x and hang",
                "description":  "Pull up twice, then hang on straight arms",
                "left":         1,
                "right":        21,
                "hold":         10,
                "break":        10,
                "reps":         3,
                "pause":        120,
            },
            {
                "title":        "Four fingers hang",
                "description":  "Hang on straight arms",
                "left":         5,
                "right":        25,
                "hold":         6,
                "break":        4,
                "reps":         4,
                "pause":        90,
            },
            {
                "title":        "Three fingers right side",
                "description":  "Pull up once and stay in locked position",
                "left":         1,
                "right":        29,
                "hold":         4,
                "break":        7,
                "reps":         4,
                "pause":        120,
            },
            {
                "title":        "Three fingers left side",
                "description":  "Pull up once and stay in locked position",
                "left":         9,
                "right":        21,
                "hold":         4,
                "break":        7,
                "reps":         4,
                "pause":        120,
            },
            {
                "title":        "Four fingers pull up",
                "description":  "Pull up once, then hang on straight arms",
                "left":         5,
                "right":        25,
                "hold":         5,
                "break":        4,
                "reps":         5,
                "pause":        120,
            },
            {
                "title":        "Four fingers hang",
                "description":  "Hang on straight arms",
                "left":         5,
                "right":        25,
                "hold":         7,
                "break":        4,
                "reps":         7,
                "pause":        120,
            },
            {
                "title":        "Jug hang",
                "description":  "Hang on straight arms",
                "left":         1,
                "right":        21,
                "hold":         7,
                "break":        4,
                "reps":         7,
                "pause":        120,
            }
        ]
    },
    {
        "title":        "Ralfi Beginner", // https://ralfisordinarylife.files.wordpress.com/2016/02/hangboard-training-plan-beginner.pdf
        "description":  "Hangboard training plan for beginners",
        "board":        "bm1000",
        "sets":         [
            {
                "title":        "Four fingers jug",
                "description":  "Hang",
                "left":         1,
                "right":        21,
                "hold":         6,
                "break":        4,
                "reps":         4,
                "pause":        16,
            },
            {
                "title":        "Open three fingers",
                "description":  "Hang",
                "left":         9,
                "right":        29,
                "hold":         6,
                "break":        4,
                "reps":         4,
                "pause":        140,
            },
            {
                "title":        "Four fingers half-crimp",
                "description":  "Hang",
                "left":         6,
                "right":        26,
                "hold":         6,
                "break":        4,
                "reps":         4,
                "pause":        140,
            },
            {
                "title":        "Four fingers sloper",
                "description":  "Hang",
                "left":         3,
                "right":        23,
                "hold":         6,
                "break":        4,
                "reps":         4,
                "pause":        140,
            }
        ]
    },
    {
        "title":        "Short test",
        "description":  "Not a proper training",
        "board":        "bm1000",
        "sets":         [
            {
                "title":        "Evil holds",
                "description":  "Pull up once",
                "left":         2,
                "right":        24,
                "hold":         3,
                "break":        3,
                "reps":         1,
                "pause":        16,
            }
        ]
    }
];
