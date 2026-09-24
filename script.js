const { useState, useEffect, useRef } = React;

// --- Constants & Utilities ---
const DieIcon = ({ val, size = 16, count = 1 }) => (
    <div className="flex gap-1 items-center">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white rounded-[4px] border border-gray-300 relative" style={{ width: size, height: size }}>
                {[
                    [],
                    [[50, 50]],
                    [[30, 30], [70, 70]],
                    [[25, 25], [50, 50], [75, 75]],
                    [[30, 30], [30, 70], [70, 30], [70, 70]],
                    [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
                    [[30, 25], [30, 50], [30, 75], [70, 25], [70, 50], [70, 75]]
                ][val].map((pos, j) => (
                    <div key={j} className="absolute bg-gray-900 rounded-full" style={{ width: '20%', height: '20%', top: `${pos[0]}%`, left: `${pos[1]}%`, transform: 'translate(-50%, -50%)' }} />
                ))}
            </div>
        ))}
    </div>
);

const CATEGORIES = [
    { id: 'ones', name: 'Ones', icon: <DieIcon val={1} /> },
    { id: 'twos', name: 'Twos', icon: <DieIcon val={2} /> },
    { id: 'threes', name: 'Threes', icon: <DieIcon val={3} /> },
    { id: 'fours', name: 'Fours', icon: <DieIcon val={4} /> },
    { id: 'fives', name: 'Fives', icon: <DieIcon val={5} /> },
    { id: 'sixes', name: 'Sixes', icon: <DieIcon val={6} /> },
    { id: 'threeOfAKind', name: 'Three of a Kind', icon: <DieIcon val={6} count={3} size={12} /> },
    { id: 'fourOfAKind', name: 'Four of a Kind', icon: <DieIcon val={6} count={4} size={10} /> },
    { id: 'fullHouse', name: 'Full House', icon: <div className="flex gap-1"><DieIcon val={6} count={3} size={10} /><DieIcon val={1} count={2} size={10} /></div> },
    { id: 'straight', name: 'Straight', icon: <div className="flex gap-0.5"><DieIcon val={1} size={8} /><DieIcon val={2} size={8} /><DieIcon val={3} size={8} /><DieIcon val={4} size={8} /><DieIcon val={5} size={8} /></div> },
    { id: 'yahtzee', name: 'Yahtzee', icon: <DieIcon val={6} count={5} size={10} /> },
];

const CATEGORY_NAMES = {
    ones: 'Ones',
    twos: 'Twos',
    threes: 'Threes',
    fours: 'Fours',
    fives: 'Fives',
    sixes: 'Sixes',
    threeOfAKind: 'Three of a Kind',
    fourOfAKind: 'Four of a Kind',
    fullHouse: 'Full House',
    straight: 'Straight',
    yahtzee: 'Yahtzee'
};

const PLAYER_COLORS = [
    { id: 'p1', name: 'Player 1', hex: '#ff4757', posClass: 'top-left' },
    { id: 'p2', name: 'Player 2', hex: '#1e90ff', posClass: 'top-right' }
];

const getCounts = (dice) => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    dice.forEach(d => counts[d]++);
    return counts;
};

const calculateScore = (catId, dice) => {
    const counts = getCounts(dice);
    const sumAll = dice.reduce((a, b) => a + b, 0);
    const vals = Object.values(counts);
    const s = [...new Set(dice)].sort().join('');

    switch (catId) {
        case 'ones': return counts[1] * 1;
        case 'twos': return counts[2] * 2;
        case 'threes': return counts[3] * 3;
        case 'fours': return counts[4] * 4;
        case 'fives': return counts[5] * 5;
        case 'sixes': return counts[6] * 6;
        case 'threeOfAKind': return vals.some(v => v >= 3) ? sumAll : 0;
        case 'fourOfAKind': return vals.some(v => v >= 4) ? sumAll : 0;
        case 'fullHouse': return (vals.includes(3) && vals.includes(2)) ? 25 : 0;
        case 'straight':
            const isStraight = (s.includes('1234') || s.includes('2345') || s.includes('3456'));
            return isStraight ? 40 : 0;
        case 'yahtzee': return vals.includes(5) ? 50 : 0;
        default: return 0;
    }
};

// --- Bot AI Strategy Helpers ---
function getStraightInfo(dice) {
    const unique = [...new Set(dice)].sort((a, b) => a - b);
    const uStr = unique.join('');
    const isStraight = uStr.includes('1234') || uStr.includes('2345') || uStr.includes('3456');

    let straightDice = [];
    if (uStr.includes('1234')) straightDice = [1, 2, 3, 4];
    else if (uStr.includes('2345')) straightDice = [2, 3, 4, 5];
    else if (uStr.includes('3456')) straightDice = [3, 4, 5, 6];

    let partial3 = [];
    if (uStr.includes('123')) partial3 = [1, 2, 3];
    else if (uStr.includes('234')) partial3 = [2, 3, 4];
    else if (uStr.includes('345')) partial3 = [3, 4, 5];
    else if (uStr.includes('456')) partial3 = [4, 5, 6];

    return { isStraight, straightDice, partial3 };
}

function shouldBotStopRolling(dice, botScores) {
    // 5 of a kind Yahtzee
    if (botScores.yahtzee === undefined) {
        const counts = getCounts(dice);
        if (Object.values(counts).includes(5)) return true;
    }
    // Straight
    if (botScores.straight === undefined) {
        const { isStraight } = getStraightInfo(dice);
        if (isStraight) return true;
    }
    // Full House
    if (botScores.fullHouse === undefined) {
        const counts = getCounts(dice);
        const vals = Object.values(counts);
        if (vals.includes(3) && vals.includes(2)) return true;
    }
    return false;
}

function getBotHoldDecision(dice, rollsLeft, botScores) {
    const counts = getCounts(dice);
    const vals = Object.values(counts);

    // 5 of a kind
    if (vals.includes(5)) {
        return [true, true, true, true, true];
    }

    // 4 of a kind: hold the 4, roll 5th for Yahtzee
    if (vals.includes(4)) {
        const fourVal = Number(Object.keys(counts).find(k => counts[k] === 4));
        return dice.map(d => d === fourVal);
    }

    // Full House
    if (vals.includes(3) && vals.includes(2)) {
        if (botScores.fullHouse === undefined) {
            return [true, true, true, true, true];
        }
        const threeVal = Number(Object.keys(counts).find(k => counts[k] === 3));
        return dice.map(d => d === threeVal);
    }

    // 3 of a kind
    if (vals.includes(3)) {
        const threeVal = Number(Object.keys(counts).find(k => counts[k] === 3));
        return dice.map(d => d === threeVal);
    }

    // Straight potential
    if (botScores.straight === undefined) {
        const { isStraight, straightDice, partial3 } = getStraightInfo(dice);
        if (isStraight) {
            const kept = new Set();
            return dice.map(d => {
                if (straightDice.includes(d) && !kept.has(d)) {
                    kept.add(d);
                    return true;
                }
                return false;
            });
        }
        if (partial3.length === 3) {
            const hasHighPair = [4, 5, 6].some(v => counts[v] >= 2);
            if (!hasHighPair) {
                const kept = new Set();
                return dice.map(d => {
                    if (partial3.includes(d) && !kept.has(d)) {
                        kept.add(d);
                        return true;
                    }
                    return false;
                });
            }
        }
    }

    // Two pairs
    const pairVals = Object.keys(counts).filter(k => counts[k] >= 2).map(Number);
    if (pairVals.length >= 2) {
        if (botScores.fullHouse === undefined) {
            return dice.map(d => pairVals.includes(d));
        }
        const maxPair = Math.max(...pairVals);
        return dice.map(d => d === maxPair);
    }

    // One pair
    if (pairVals.length === 1) {
        const pairVal = pairVals[0];
        return dice.map(d => d === pairVal);
    }

    // High cards: hold highest die matching unfilled upper section
    const catMap = { 6: 'sixes', 5: 'fives', 4: 'fours', 3: 'threes', 2: 'twos', 1: 'ones' };
    for (let v = 6; v >= 1; v--) {
        if (dice.includes(v) && botScores[catMap[v]] === undefined) {
            const idx = dice.indexOf(v);
            return dice.map((_, i) => i === idx);
        }
    }

    // Fallback: hold highest single die
    const maxDie = Math.max(...dice);
    const maxIdx = dice.indexOf(maxDie);
    return dice.map((_, i) => i === maxIdx);
}

function getBestCategoryForBot(dice, botScores) {
    const openCats = CATEGORIES.filter(c => botScores[c.id] === undefined);
    if (openCats.length === 0) return null;

    let bestCat = openCats[0];
    let bestUtility = -Infinity;

    for (const c of openCats) {
        const score = calculateScore(c.id, dice);
        let utility = 0;

        if (score > 0) {
            switch (c.id) {
                case 'yahtzee': utility = 1000; break;
                case 'straight': utility = 850; break;
                case 'fullHouse': utility = 750; break;
                case 'fourOfAKind': utility = 600 + score; break;
                case 'threeOfAKind': utility = (score >= 18 ? 550 : 380) + score; break;
                case 'sixes': utility = (score >= 18 ? 720 : score >= 12 ? 460 : 190) + score; break;
                case 'fives': utility = (score >= 15 ? 700 : score >= 10 ? 440 : 180) + score; break;
                case 'fours': utility = (score >= 12 ? 680 : score >= 8 ? 420 : 170) + score; break;
                case 'threes': utility = (score >= 9 ? 660 : score >= 6 ? 400 : 160) + score; break;
                case 'twos': utility = (score >= 6 ? 640 : score >= 4 ? 380 : 150) + score; break;
                case 'ones': utility = (score >= 3 ? 620 : score >= 2 ? 360 : 140) + score; break;
                default: utility = score;
            }
        } else {
            // Sacrifice ranking (least painful zero-scores first)
            const sacrificePriority = {
                ones: -10,
                twos: -20,
                threes: -30,
                fourOfAKind: -40,
                fours: -50,
                threeOfAKind: -60,
                fives: -70,
                fullHouse: -80,
                sixes: -90,
                straight: -100,
                yahtzee: -150
            };
            utility = sacrificePriority[c.id] ?? -100;
        }

        if (utility > bestUtility) {
            bestUtility = utility;
            bestCat = c;
        }
    }

    return {
        id: bestCat.id,
        name: CATEGORY_NAMES[bestCat.id] || bestCat.id,
        score: calculateScore(bestCat.id, dice)
    };
}


// --- Three.js Engine ---
let scene, camera, renderer, diceMesh = [];
let threeState = { rolling: false, results: [1, 1, 1, 1, 1], held: [false, false, false, false, false], reveal: false, rollStart: 0 };

let FACE_NORMALS;

function getOrientation(val) {
    const q = new THREE.Quaternion();
    switch (val) {
        case 2: q.setFromEuler(new THREE.Euler(0, 0, 0)); break; // +Y is already 2
        case 5: q.setFromEuler(new THREE.Euler(Math.PI, 0, 0)); break; // -Y to +Y
        case 1: q.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)); break; // +X to +Y
        case 6: q.setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2)); break; // -X to +Y
        case 3: q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); break; // +Z to +Y
        case 4: q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)); break; // -Z to +Y
    }
    return q;
}

function initThree() {
    const canvas = document.getElementById('sceneCanvas');
    if (!canvas) return;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    console.log("Initializing Three.js scene...");

    FACE_NORMALS = [
        { value: 1, normal: new THREE.Vector3(1, 0, 0) }, { value: 6, normal: new THREE.Vector3(-1, 0, 0) },
        { value: 2, normal: new THREE.Vector3(0, 1, 0) }, { value: 5, normal: new THREE.Vector3(0, -1, 0) },
        { value: 3, normal: new THREE.Vector3(0, 0, 1) }, { value: 4, normal: new THREE.Vector3(0, 0, -1) }
    ];

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    renderer.setClearColor(0x000000, 1);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 22, 18);
    camera.lookAt(0, 0, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.2); // BRIGHTNESS: Set between 0.1 and 1.0
    scene.add(ambient);

    const mainLight = new THREE.SpotLight(0xffffff, 2.5);
    mainLight.position.set(0, 25, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(2048, 2048);
    scene.add(mainLight);

    // Reflective Floor Pod
    const ovalGeo = new THREE.PlaneGeometry(25, 20);
    const reflector = new THREE.Reflector(ovalGeo, {
        clipBias: 0.003,
        textureWidth: 2048,
        textureHeight: 2048,
        color: 0x222222
    });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = 0.01;
    scene.add(reflector);

    const fadeCanvas = document.createElement('canvas');
    fadeCanvas.width = 512; fadeCanvas.height = 512;
    const fctx = fadeCanvas.getContext('2d');
    const grad = fctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.8)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    fctx.fillStyle = grad;
    fctx.fillRect(0, 0, 512, 512);

    const fadeTex = new THREE.CanvasTexture(fadeCanvas);
    const fadeMat = new THREE.MeshBasicMaterial({ map: fadeTex, transparent: true });
    const fadePlane = new THREE.Mesh(ovalGeo, fadeMat);
    fadePlane.rotation.x = -Math.PI / 2;
    fadePlane.position.y = 0.02;
    scene.add(fadePlane);

    const propLight = new THREE.PointLight(0xffffff, 2.0, 50);
    propLight.position.set(0, 15, 10);
    scene.add(propLight);

    const createTexture = (n) => {
        const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
        // Rounded white die face
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.roundRect(10, 10, 492, 492, 80); // Rounded corners on the texture
        g.fill();

        g.fillStyle = '#000000';
        const dots = {
            1: [[256, 256]],
            2: [[128, 128], [384, 384]],
            3: [[100, 100], [256, 256], [412, 412]],
            4: [[128, 128], [128, 384], [384, 128], [384, 384]],
            5: [[100, 100], [100, 412], [256, 256], [412, 100], [412, 412]],
            6: [[128, 100], [128, 256], [128, 412], [384, 100], [384, 256], [384, 412]]
        }[n];
        dots.forEach(d => {
            g.beginPath();
            g.arc(d[0], d[1], 40, 0, Math.PI * 2);
            g.fill();
        });
        const tex = new THREE.CanvasTexture(c);
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.05,
            metalness: 0.4,
            envMapIntensity: 1.0
        });
    };
    const mats = [createTexture(1), createTexture(6), createTexture(2), createTexture(5), createTexture(3), createTexture(4)];
    const dieGeo = new THREE.BoxGeometry(1, 1, 1);

    for (let i = 0; i < 5; i++) {
        const die = new THREE.Mesh(dieGeo, mats);
        die.position.set(-3 + i * 1.5, 0.5, 0);
        die.castShadow = true;
        die.userData = { basePos: die.position.clone(), targetQ: new THREE.Quaternion() };
        diceMesh.push(die);
        scene.add(die);
    }

    console.log("Three.js initialization complete.");
    tick();
}

function tick() {
    requestAnimationFrame(tick);
    const now = performance.now();

    if (threeState.rolling) {
        const t = (now - threeState.rollStart) / 1000;
        diceMesh.forEach((die, i) => {
            if (threeState.held[i]) return;
            if (t < 1.2) {
                die.position.y = 0.6 + Math.abs(Math.sin(now * 0.01 + i)) * 1.2;
                die.position.x = die.userData.basePos.x + Math.sin(now * 0.005 + i) * 1;
                die.position.z = die.userData.basePos.z + Math.cos(now * 0.005 + i) * 1;
                die.rotation.x += 0.3; die.rotation.y += 0.4;
            } else {
                die.position.lerp(die.userData.basePos, 0.15);
                die.quaternion.slerp(die.userData.targetQ, 0.15);
            }
        });
        if (t > 2.0) { threeState.rolling = false; threeState.reveal = true; }
    }

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    const isPortrait = aspect < 1;

    const homePos = isPortrait ? new THREE.Vector3(0, 25, 22) : new THREE.Vector3(0, 18, 15);
    const revealPos = isPortrait ? new THREE.Vector3(0, 12, 14) : new THREE.Vector3(0, 8, 10);

    if (threeState.reveal) {
        camera.position.lerp(revealPos, 0.06);
        camera.lookAt(0, 0, 0);
    } else {
        camera.position.lerp(homePos, 0.06);
        camera.lookAt(0, 0, 0);
    }

    // Held highlighting
    diceMesh.forEach((die, i) => {
        if (threeState.held[i]) {
            die.position.y = THREE.MathUtils.lerp(die.position.y, 2.0, 0.1);
            die.rotation.y += 0.02;
        } else if (!threeState.rolling) {
            die.position.y = THREE.MathUtils.lerp(die.position.y, 0.6, 0.1);
        }
    });

    renderer.render(scene, camera);
}

// Helper to exit back to landing page
const exitToLanding = () => {
    document.body.classList.remove('game-active');
    const landing = document.getElementById('landing-page');
    if (landing) {
        landing.style.display = '';
        landing.classList.remove('launching');
    }
    const canvas = document.getElementById('sceneCanvas');
    if (canvas) canvas.style.display = 'none';
    const root = document.getElementById('root');
    if (root) root.style.display = 'none';
    const btn = document.getElementById('start-btn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Go To Game';
    }
};

// --- React Components ---
const WinnerScreen = ({ winner, isTie, players, setGameState }) => {
    useEffect(() => {
        if (!window.confetti) return;
        const duration = 2500;
        const end = Date.now() + duration;
        const colors = ['#ffffff', '#cccccc', '#999999', '#777777'];

        (function frame() {
            window.confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: colors });
            window.confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: colors });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }, [winner]);

    const titleText = isTie
        ? 'It is a Tie!'
        : winner?.name === 'You'
            ? 'You Win!'
            : `${winner?.name} Wins!`;

    return (
        <div className="home-container animate-fadeIn winner-container flex flex-col items-center justify-center px-4">
            <h2 className="text-white/40 uppercase font-black tracking-widest mb-3 text-xs md:text-sm">Game Over</h2>
            <h1 className="hero-title winner-glow mb-2" style={{ color: winner?.hex || '#ffffff', textShadow: '0 0 20px rgba(255,255,255,0.4)' }}>
                {titleText}
            </h1>

            {/* Scoreboard summary */}
            <div className="flex gap-4 md:gap-8 my-6">
                {players.map(p => (
                    <div key={p.id} className="flex flex-col items-center bg-white/5 border border-white/15 rounded-2xl px-6 py-4 min-w-[130px] shadow-lg">
                        <span className="text-xs uppercase font-bold text-white/50 flex items-center gap-1">
                            {p.name} {p.isBot && <span className="text-[8px] bg-white/10 text-white/70 px-1 py-0.5 rounded border border-white/20">BOT</span>}
                        </span>
                        <span className="text-3xl md:text-4xl font-black mt-2 text-white">{p.total}</span>
                        <span className="text-[10px] text-white/30 uppercase mt-1">Points</span>
                    </div>
                ))}
            </div>

            <button onClick={() => setGameState('setup')} className="btn-mode-select mt-4">
                Play Again
            </button>
        </div>
    );
};

const App = () => {
    const [gameState, setGameState] = useState('setup');
    const [players, setPlayers] = useState([]);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [rollsLeft, setRollsLeft] = useState(3);
    const [diceValues, setDiceValues] = useState([1, 1, 1, 1, 1]);
    const [held, setHeld] = useState([false, false, false, false, false]);
    const [isRolling, setIsRolling] = useState(false);
    const [showScorecard, setShowScorecard] = useState(false);
    const [viewingPlayerIndex, setViewingPlayerIndex] = useState(0);

    const botTimerRef = useRef(null);
    const heldRef = useRef(held);
    heldRef.current = held;

    useEffect(() => { initThree(); }, []);

    const startGame = (mode) => {
        let newPlayers;
        if (mode === 'bot') {
            newPlayers = [
                { id: 'p1', name: 'You', hex: '#ffffff', posClass: 'top-left', scores: {}, total: 0, isBot: false },
                { id: 'bot', name: 'AzzAzz', hex: '#aaaaaa', posClass: 'top-right', scores: {}, total: 0, isBot: true }
            ];
        } else {
            newPlayers = [
                { id: 'p1', name: 'Player 1', hex: '#ffffff', posClass: 'top-left', scores: {}, total: 0, isBot: false },
                { id: 'p2', name: 'Player 2', hex: '#aaaaaa', posClass: 'top-right', scores: {}, total: 0, isBot: false }
            ];
        }
        setPlayers(newPlayers);
        setCurrentPlayerIndex(0);
        setViewingPlayerIndex(0);
        setGameState('playing');
        setRollsLeft(3);
        setDiceValues([1, 1, 1, 1, 1]);
        setHeld([false, false, false, false, false]);
        threeState.held = [false, false, false, false, false];
        threeState.reveal = false;
    };

    const rollDice = (customHeld = null) => {
        if (rollsLeft === 0 || isRolling) return;
        setIsRolling(true);

        const activeHeld = customHeld !== null ? customHeld : heldRef.current;
        const next = diceValues.map((v, i) => activeHeld[i] ? v : Math.floor(Math.random() * 6) + 1);

        threeState.results = next;
        threeState.held = activeHeld;
        threeState.rolling = true;
        threeState.rollStart = performance.now();
        threeState.reveal = false;

        next.forEach((v, i) => { if (!activeHeld[i]) diceMesh[i].userData.targetQ.copy(getOrientation(v)); });

        setTimeout(() => {
            setDiceValues(next);
            setRollsLeft(r => r - 1);
            setIsRolling(false);
        }, 2000);
    };

    const toggleHold = (i) => {
        const currentP = players[currentPlayerIndex];
        if (rollsLeft === 3 || isRolling || currentP?.isBot) return;
        const nh = [...held];
        nh[i] = !nh[i];
        setHeld(nh);
        heldRef.current = nh;
        threeState.held = nh;
    };

    const confirmPoint = (catId) => {
        const p = players[currentPlayerIndex];
        if (!p || p.scores[catId] !== undefined) return;

        const score = calculateScore(catId, diceValues);
        const newPlayers = [...players];
        newPlayers[currentPlayerIndex].scores[catId] = score;
        newPlayers[currentPlayerIndex].total = Object.values(newPlayers[currentPlayerIndex].scores).reduce((a, b) => a + b, 0);
        setPlayers(newPlayers);
        setShowScorecard(false);

        // Check if all players have filled all categories
        const allFilled = newPlayers.every(pl => CATEGORIES.every(c => pl.scores[c.id] !== undefined));
        if (allFilled) {
            setGameState('end');
        } else {
            const nextIndex = (currentPlayerIndex + 1) % newPlayers.length;
            setCurrentPlayerIndex(nextIndex);
            setViewingPlayerIndex(nextIndex);
            setRollsLeft(3);
            setHeld([false, false, false, false, false]);
            heldRef.current = [false, false, false, false, false];
            threeState.held = [false, false, false, false, false];
            threeState.reveal = false;
        }
    };

    // --- Silent Bot Turn Flow ---
    useEffect(() => {
        if (gameState !== 'playing') {
            if (botTimerRef.current) clearTimeout(botTimerRef.current);
            return;
        }

        const currentP = players[currentPlayerIndex];
        if (!currentP || !currentP.isBot) return;
        if (isRolling) return;

        // Step 1: Start turn, roll dice
        if (rollsLeft === 3) {
            botTimerRef.current = setTimeout(() => {
                rollDice();
            }, 800);
            return () => clearTimeout(botTimerRef.current);
        }

        // Step 2: Rolls remaining (roll 2 or roll 3)
        if (rollsLeft > 0) {
            if (shouldBotStopRolling(diceValues, currentP.scores)) {
                botTimerRef.current = setTimeout(() => {
                    const best = getBestCategoryForBot(diceValues, currentP.scores);
                    if (best) confirmPoint(best.id);
                }, 800);
                return () => clearTimeout(botTimerRef.current);
            }

            botTimerRef.current = setTimeout(() => {
                const newHeld = getBotHoldDecision(diceValues, rollsLeft, currentP.scores);
                setHeld(newHeld);
                heldRef.current = newHeld;
                threeState.held = newHeld;

                botTimerRef.current = setTimeout(() => {
                    rollDice(newHeld);
                }, 700);
            }, 800);
            return () => clearTimeout(botTimerRef.current);
        }

        // Step 3: All 3 rolls used, select best available category
        if (rollsLeft === 0) {
            botTimerRef.current = setTimeout(() => {
                const best = getBestCategoryForBot(diceValues, currentP.scores);
                if (best) confirmPoint(best.id);
            }, 800);
            return () => clearTimeout(botTimerRef.current);
        }
    }, [gameState, currentPlayerIndex, rollsLeft, isRolling, diceValues]);

    // Setup Screen with 2 buttons matching landing page style
    if (gameState === 'setup') return (
        <div className="home-container animate-fadeIn flex flex-col justify-between py-12 md:py-20 px-4">
            <div className="mt-4 md:mt-8">
                <div className="landing-badge mb-3">Classic Dice Game</div>
                <h1 className="hero-title mb-1">Play YAHTZEE</h1>
                <p className="text-dim uppercase tracking-widest font-black text-xs md:text-sm">Select Game Mode</p>
            </div>

            {/* Direct Mode Buttons */}
            <div className="flex flex-col gap-5 items-center my-8 w-full max-w-sm mx-auto">
                <button
                    onClick={() => startGame('bot')}
                    className="btn-mode-select"
                >
                    Play vs Bot
                </button>
                <button
                    onClick={() => startGame('pvp')}
                    className="btn-mode-select"
                >
                    2 Players
                </button>
            </div>

            <div className="mb-4 md:mb-8">
                <button
                    onClick={exitToLanding}
                    className="btn-secondary min-w-[200px] border-none bg-transparent text-white/40 hover:text-white text-xs md:text-sm py-2 uppercase tracking-widest font-bold"
                >
                    Exit
                </button>
            </div>
        </div>
    );

    // End Game Screen
    if (gameState === 'end') {
        const sorted = [...players].sort((a, b) => b.total - a.total);
        const winner = sorted[0];
        const isTie = sorted.length > 1 && sorted[0].total === sorted[1].total;
        return <WinnerScreen winner={winner} isTie={isTie} players={players} setGameState={setGameState} />;
    }

    const currentP = players[currentPlayerIndex];
    const isCurrentBot = currentP?.isBot;

    return (
        <div className="w-full h-full relative">
            {/* Player Corner HUDs */}
            {players.map((p, i) => (
                <div key={p.id} className={`corner-hud ${p.posClass}`}>
                    <div className={`player-card ${currentPlayerIndex === i ? 'active' : ''}`}>
                        <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] font-black uppercase text-white/50">{p.name}</span>
                            {p.isBot && (
                                <span className="text-[8px] bg-white/10 text-white/70 font-bold px-1.5 py-0.5 rounded border border-white/20">BOT</span>
                            )}
                        </div>
                        <span className="text-2xl font-black text-white">{p.total}</span>
                    </div>
                </div>
            ))}

            {/* Bottom Controls */}
            <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none w-full px-4 pb-6 z-20">
                {/* Bottom Left Exit Button */}
                <div className="absolute bottom-6 md:bottom-10 left-4 md:left-10 pointer-events-auto z-30">
                    <button
                        onClick={() => {
                            if (botTimerRef.current) clearTimeout(botTimerRef.current);
                            setGameState('setup');
                        }}
                        className="btn-hud exit-btn !px-6 !py-3 !text-sm md:!text-base"
                    >
                        <span className="btn-text-full">EXIT</span>
                        <span className="btn-text-icon hidden">✕</span>
                    </button>
                </div>

                {/* Bottom Right Point Table Button */}
                <div className="absolute bottom-6 md:bottom-10 right-4 md:right-10 pointer-events-auto z-30">
                    <button
                        onClick={() => {
                            setViewingPlayerIndex(currentPlayerIndex);
                            setShowScorecard(true);
                        }}
                        className="btn-hud point-table-btn !px-6 !py-3 !text-sm md:!text-base"
                    >
                        <span className="btn-text-full">POINT TABLE</span>
                        <span className="btn-text-icon hidden">P.T</span>
                    </button>
                </div>

                <div className="pointer-events-auto flex flex-col items-center">
                    {/* Dice Items */}
                    <div className="flex gap-2 md:gap-4 mb-4 md:mb-8 dice-container justify-center">
                        {diceValues.map((v, i) => (
                            <div
                                key={i}
                                onClick={() => !isCurrentBot && toggleHold(i)}
                                className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-2xl md:text-3xl transition-all border-2 dice-item
                                    ${isCurrentBot ? 'cursor-default' : 'cursor-pointer'}
                                    ${held[i] ? 'bg-white text-black border-white shadow-[0_0_20px_#fff]' : 'bg-black/40 text-white border-white/20 hover:border-white/50'}
                                `}
                            >
                                {v}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Rolls: {rollsLeft}/3</span>
                            <div className="flex gap-1.5">
                                {[1, 2, 3].map(r => (
                                    <div key={r} className={`w-2.5 h-2.5 rounded-full ${r <= rollsLeft ? 'bg-white' : 'bg-white/15'}`}></div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 md:gap-4">
                            <button
                                disabled={isCurrentBot || rollsLeft === 0 || isRolling}
                                onClick={() => rollDice()}
                                className={`btn-primary min-w-[140px] md:min-w-[180px] ${isCurrentBot ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isRolling ? 'Rolling...' : isCurrentBot ? 'Bot Turn' : 'Roll Dice'}
                            </button>

                            {!isCurrentBot && rollsLeft < 3 && !isRolling && (
                                <button
                                    onClick={() => {
                                        setViewingPlayerIndex(currentPlayerIndex);
                                        setShowScorecard(true);
                                    }}
                                    className="btn-secondary animate-fadeIn text-sm md:text-base"
                                >
                                    Select Point
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Scorecard Modal */}
            {showScorecard && (
                <div className="modal-overlay" onClick={() => setShowScorecard(false)}>
                    <div className="glass-panel" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 md:mb-6">
                            <div>
                                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter" style={{ background: 'linear-gradient(to bottom, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    Scorecard
                                </h2>
                                <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest font-bold mt-1">
                                    {viewingPlayerIndex === currentPlayerIndex && !isCurrentBot
                                        ? 'Select an open category to confirm your points'
                                        : `Viewing ${players[viewingPlayerIndex]?.name}'s Scorecard`}
                                </p>
                            </div>
                            <button onClick={() => setShowScorecard(false)} className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white text-xl md:text-2xl transition-all border border-white/10">✕</button>
                        </div>

                        {/* Player Scorecard Tabs */}
                        <div className="flex gap-2 md:gap-3 mb-6">
                            {players.map((p, idx) => (
                                <button
                                    key={p.id}
                                    onClick={() => setViewingPlayerIndex(idx)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all border ${viewingPlayerIndex === idx
                                            ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    <span>{p.name}</span>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black" style={{ background: viewingPlayerIndex === idx ? '#000' : 'rgba(255,255,255,0.1)', color: viewingPlayerIndex === idx ? '#fff' : '#ccc' }}>
                                        {p.total} PTS
                                    </span>
                                    {p.isBot && <span className="text-[9px] bg-white/10 text-white/70 px-1 py-0.5 rounded border border-white/20">BOT</span>}
                                </button>
                            ))}
                        </div>

                        <div className="score-grid custom-scrollbar">
                            {CATEGORIES.map(cat => {
                                const viewingP = players[viewingPlayerIndex];
                                const isUsed = viewingP.scores[cat.id] !== undefined;
                                const canSelect = viewingPlayerIndex === currentPlayerIndex && !isCurrentBot && !isUsed && rollsLeft < 3;
                                const preview = rollsLeft === 3 ? '-' : calculateScore(cat.id, diceValues);
                                return (
                                    <div
                                        key={cat.id}
                                        className={`score-item ${isUsed ? 'filled' : canSelect ? 'preview' : 'opacity-60 cursor-default'}`}
                                        onClick={() => canSelect && confirmPoint(cat.id)}
                                    >
                                        <div className="flex items-center gap-4 md:gap-8">
                                            <div className="shrink-0 scale-125 md:scale-150 transform origin-left">{cat.icon}</div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-white/40 uppercase text-[10px] md:text-xs tracking-widest mb-1">{cat.id}</span>
                                                <span className="font-bold text-lg md:text-2xl text-white/90">{cat.name || cat.id.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-white/20 uppercase mb-1">
                                                {isUsed ? 'Confirmed' : canSelect ? 'Preview' : 'Open'}
                                            </span>
                                            <span className="font-black text-3xl md:text-5xl" style={{ color: isUsed ? 'rgba(255,255,255,0.3)' : canSelect ? '#ffffff' : 'rgba(255,255,255,0.5)' }}>
                                                {isUsed ? viewingP.scores[cat.id] : (canSelect ? preview : '-')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

try {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
} catch (e) {
    console.error("React Render Error:", e);
    document.body.innerHTML += `<div style="position:fixed;top:10px;left:10px;color:red;z-index:9999;background:white;padding:10px;">Error: ${e.message}</div>`;
}

window.addEventListener('resize', () => {
    if (renderer && camera) {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
});
