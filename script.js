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
    { id: 'ones', icon: <DieIcon val={1} /> },
    { id: 'twos', icon: <DieIcon val={2} /> },
    { id: 'threes', icon: <DieIcon val={3} /> },
    { id: 'fours', icon: <DieIcon val={4} /> },
    { id: 'fives', icon: <DieIcon val={5} /> },
    { id: 'sixes', icon: <DieIcon val={6} /> },
    { id: 'threeOfAKind', icon: <DieIcon val={6} count={3} size={12} /> },
    { id: 'fourOfAKind', icon: <DieIcon val={6} count={4} size={10} /> },
    { id: 'fullHouse', icon: <div className="flex gap-1"><DieIcon val={6} count={3} size={10} /><DieIcon val={1} count={2} size={10} /></div> },
    { id: 'straight', icon: <div className="flex gap-0.5"><DieIcon val={1} size={8} /><DieIcon val={2} size={8} /><DieIcon val={3} size={8} /><DieIcon val={4} size={8} /><DieIcon val={5} size={8} /></div> },
    { id: 'yahtzee', icon: <DieIcon val={6} count={5} size={10} /> },
];

const PLAYER_COLORS = [
    { id: 'p1', name: 'Player 1', hex: '#ff4757', posClass: 'top-left' },
    { id: 'p2', name: 'Player 2', hex: '#1e90ff', posClass: 'top-right' },
    { id: 'p3', name: 'Player 3', hex: '#ffa502', posClass: 'bottom-left' },
    { id: 'p4', name: 'Player 4', hex: '#00d2d3', posClass: 'bottom-right' }
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
        case 'ones': return counts[1] * 1; case 'twos': return counts[2] * 2;
        case 'threes': return counts[3] * 3; case 'fours': return counts[4] * 4;
        case 'fives': return counts[5] * 5; case 'sixes': return counts[6] * 6;
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

// --- React Components ---
const WinnerScreen = ({ winner, setGameState }) => {
    useEffect(() => {
        if (!window.confetti) return;
        const duration = 3000;
        const end = Date.now() + duration;
        const colors = [winner.hex, '#ffffff'];

        (function frame() {
            window.confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: colors });
            window.confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: colors });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }, [winner]);

    return (
        <div className="home-container animate-fadeIn winner-container flex flex-col items-center justify-center">
            <h2 className="text-white/40 uppercase font-black tracking-widest mb-4">Game Over</h2>
            <h1 className="hero-title winner-glow" style={{ color: winner.hex, textShadow: `0 0 20px ${winner.hex}` }}>{winner.name} Wins!</h1>
            <p className="text-6xl font-black text-white mb-12 drop-shadow-2xl">{winner.total} Points</p>
            <button onClick={() => setGameState('setup')} className="btn-primary mt-8 shadow-[0_0_40px_rgba(255,255,255,0.3)]">Play Again</button>
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

    useEffect(() => { initThree(); }, []);

    const startGame = (num) => {
        setPlayers(Array.from({ length: num }).map((_, i) => ({ ...PLAYER_COLORS[i], scores: {}, total: 0 })));
        setGameState('playing');
        setRollsLeft(3); setDiceValues([1, 1, 1, 1, 1]); setHeld([false, false, false, false, false]);
        threeState.reveal = false;
    };

    const rollDice = () => {
        if (rollsLeft === 0 || isRolling) return;
        setIsRolling(true);
        const next = diceValues.map((v, i) => held[i] ? v : Math.floor(Math.random() * 6) + 1);

        threeState.results = next;
        threeState.held = held;
        threeState.rolling = true;
        threeState.rollStart = performance.now();
        threeState.reveal = false;

        next.forEach((v, i) => { if (!held[i]) diceMesh[i].userData.targetQ.copy(getOrientation(v)); });

        setTimeout(() => {
            setDiceValues(next);
            setRollsLeft(r => r - 1);
            setIsRolling(false);
        }, 2000);
    };

    const toggleHold = (i) => {
        if (rollsLeft === 3 || isRolling) return;
        const nh = [...held]; nh[i] = !nh[i]; setHeld(nh); threeState.held = nh;
    };

    const confirmPoint = (catId) => {
        const p = players[currentPlayerIndex];
        if (p.scores[catId] !== undefined) return;

        const score = calculateScore(catId, diceValues);
        const newPlayers = [...players];
        newPlayers[currentPlayerIndex].scores[catId] = score;
        newPlayers[currentPlayerIndex].total = Object.values(newPlayers[currentPlayerIndex].scores).reduce((a, b) => a + b, 0);
        setPlayers(newPlayers);
        setShowScorecard(false);

        // Turn logic
        const allFilled = CATEGORIES.every(c => newPlayers[0].scores[c.id] !== undefined);
        if (currentPlayerIndex === players.length - 1 && allFilled) {
            setGameState('end');
        } else {
            setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);
            setRollsLeft(3); setHeld([false, false, false, false, false]); threeState.held = [false, false, false, false, false];
            threeState.reveal = false;
        }
    };

    if (gameState === 'setup') return (
        <div className="home-container animate-fadeIn flex flex-col justify-between py-20">
            <div className="mt-10">
                <h1 className="hero-title mb-0">YAHTZEE</h1>
                <p className="text-dim uppercase tracking-widest font-black mt-4">2-Player Edition</p>
            </div>
            <div className="flex flex-col gap-4 items-center mb-10">
                <button onClick={() => startGame(2)} className="btn-primary min-w-[250px] py-6 text-2xl shadow-2xl">
                    Start Game
                </button>
                <button onClick={()=>{alert("Quit the game"); setTimeout(window.close,1000)}} className="btn-secondary min-w-[200px] border-none bg-transparent text-white/40 hover:text-white hover:bg-white/10">
                    Exit
                </button>
            </div>
        </div>
    );

    if (gameState === 'end') {
        const winner = [...players].sort((a, b) => b.total - a.total)[0];
        return <WinnerScreen winner={winner} setGameState={setGameState} />;
    }

    return (
        <div className="w-full h-full relative">
            {/* Player Corner HUDs */}
            {players.map((p, i) => (
                <div key={p.id} className={`corner-hud ${p.posClass}`}>
                    <div className={`player-card ${currentPlayerIndex === i ? 'active' : ''}`}>
                        <span className="text-[10px] font-black uppercase text-white/40 mb-1">{p.name}</span>
                        <span className="text-2xl font-black" style={{ color: p.hex }}>{p.total}</span>
                    </div>
                </div>
            ))}

            {/* Bottom Left Exit Button */}
            <div className="absolute bottom-6 md:bottom-10 left-4 md:left-10 pointer-events-auto">
                <button
                    onClick={() => setGameState('setup')}
                    className="player-select-btn !w-16 !h-10 md:!w-24 md:!h-16 !text-xs md:!text-lg !m-0"
                >
                    EXIT
                </button>
            </div>

            {/* Bottom Right Point Table Button */}
            <div className="absolute bottom-6 md:bottom-10 right-4 md:right-10 pointer-events-auto">
                <button
                    onClick={() => setShowScorecard(true)}
                    className="btn-secondary !bg-black/60 hover:!bg-white hover:!text-black transition-all border-white/20 hover:border-white shadow-xl text-xs md:text-base py-2 px-4 md:py-3 md:px-6"
                >
                    POINT TABLE
                </button>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto w-full px-4">
                <div className="flex gap-2 md:gap-4 mb-4 md:mb-8 dice-container justify-center">
                    {diceValues.map((v, i) => (
                        <div
                            key={i}
                            onClick={() => toggleHold(i)}
                            className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-2xl md:text-3xl cursor-pointer transition-all border-2 dice-item
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
                                <div key={r} className={`w-2.5 h-2.5 rounded-full ${r <= rollsLeft ? 'bg-accent-green' : 'bg-white/10'}`}></div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 md:gap-4">
                        <button disabled={rollsLeft === 0 || isRolling} onClick={rollDice} className="btn-primary min-w-[140px] md:min-w-[180px]">
                            {isRolling ? 'Rolling...' : 'Roll Dice'}
                        </button>

                        {rollsLeft < 3 && !isRolling && (
                            <button onClick={() => setShowScorecard(true)} className="btn-secondary animate-fadeIn text-sm md:text-base">
                                Select Point
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Scorecard Modal */}
            {showScorecard && (
                <div className="modal-overlay" onClick={() => setShowScorecard(false)}>
                    <div className="glass-panel" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 md:mb-12">
                            <div>
                                <h2 className="text-3xl md:text-6xl font-black uppercase tracking-tighter" style={{ background: 'linear-gradient(to bottom, #fff, #999)', webkitBackgroundClip: 'text', webkitTextFillColor: 'transparent' }}>Scorecard</h2>
                                <p className="text-[10px] md:text-sm text-white/40 uppercase tracking-widest font-bold mt-1 md:mt-2">Select a category to confirm points</p>
                            </div>
                            <button onClick={() => setShowScorecard(false)} className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white text-xl md:text-3xl transition-all border border-white/10">✕</button>
                        </div>

                        <div className="score-grid custom-scrollbar">
                            {CATEGORIES.map(cat => {
                                const isUsed = players[currentPlayerIndex].scores[cat.id] !== undefined;
                                const preview = rollsLeft === 3 ? '-' : calculateScore(cat.id, diceValues);
                                return (
                                    <div
                                        key={cat.id}
                                        className={`score-item ${isUsed ? 'filled' : 'preview'}`}
                                        onClick={() => !isUsed && rollsLeft < 3 && confirmPoint(cat.id)}
                                    >
                                        <div className="flex items-center gap-8">
                                            <div className="shrink-0 scale-150 transform origin-left">{cat.icon}</div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-white/40 uppercase text-xs tracking-widest mb-1">{cat.id}</span>
                                                <span className="font-bold text-2xl text-white/90">{cat.id.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-white/20 uppercase mb-1">{isUsed ? 'Confirmed' : 'Preview'}</span>
                                            <span className="font-black text-5xl" style={{ color: isUsed ? 'rgba(255,255,255,0.2)' : '#ffffff' }}>
                                                {isUsed ? players[currentPlayerIndex].scores[cat.id] : preview}
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
