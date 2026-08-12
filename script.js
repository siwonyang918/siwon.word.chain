let wordPool = [];
let wordSet = new Set();
let wordBuckets = new Map();
let missionLetters = [];
let dataLoaded = false;

let currentScore = 0;
let botScore = 0;
let currentMission = "";
let usedWords = new Set();
let lastWord = "";
let timeLeft = 10;
let timerInterval = null;
let turnStartTime = 0;
let isPlayerTurn = true;
let gameActive = false;
let gameRewarded = false;
let botTurnToken = 0;
let coinBoostActive = false;

let gameMode = "solo";
let peer = null;
let connection = null;
let onlineRole = null;
let currentTurnRole = "host";
let onlineScores = { host: 0, guest: 0 };
let currentRoomCode = "";
let remoteProfile = null;

const TURN_SECONDS = 10;
const BOT_MAX_WORD_LENGTH = 10;
const ROOM_PREFIX = "siwon-word-chain-";
const STORAGE_KEY = "siwon.word.chain.profile.v1";
const RANDOM_BOX_PRICE = 80;

const DEFAULT_COSTUME = {
    id: "basic",
    type: "costume",
    name: "기본 후드",
    icon: "나",
    color: "#52bea5",
    price: 0,
    desc: "처음부터 입는 기본 의상"
};

const SHOP_ITEMS = [
    { id: "mint-cape", type: "costume", name: "민트 망토", icon: "M", color: "#52bea5", price: 120, desc: "상쾌한 민트 컬러" },
    { id: "sun-jacket", type: "costume", name: "태양 재킷", icon: "S", color: "#f6b34e", price: 140, desc: "밝은 노란 재킷" },
    { id: "blue-visor", type: "costume", name: "블루 바이저", icon: "V", color: "#4d8fd9", price: 150, desc: "차가운 집중력" },
    { id: "rose-coat", type: "costume", name: "로즈 코트", icon: "R", color: "#ef6f6c", price: 160, desc: "강한 존재감" },
    { id: "gold-crown", type: "costume", name: "골드 크라운", icon: "G", color: "#bd7910", price: 220, desc: "승부사의 왕관" },
    { id: "pixel-suit", type: "costume", name: "픽셀 슈트", icon: "P", color: "#27485c", price: 200, desc: "게임 화면에 잘 맞는 슈트" },
    { id: "hint-card", type: "item", name: "힌트 카드", icon: "H", color: "#416a8b", price: 45, desc: "쓸 수 있는 단어를 입력칸에 보여줌" },
    { id: "time-card", type: "item", name: "시간 카드", icon: "T", color: "#258775", price: 55, desc: "현재 턴 시간을 5초 늘림" },
    { id: "mission-card", type: "item", name: "미션 카드", icon: "Q", color: "#8d6ac8", price: 60, desc: "미션 글자를 새로 바꿈" },
    { id: "coin-boost", type: "item", name: "코인 부스터", icon: "C", color: "#bd7910", price: 75, desc: "이번 판 코인을 1.5배로 받음" }
];

const ALL_ITEMS = [DEFAULT_COSTUME, ...SHOP_ITEMS];
const COSTUME_ITEMS = ALL_ITEMS.filter(item => item.type === "costume");

const nicknameDisplay = document.getElementById("nickname-display");
const coinDisplay = document.getElementById("coin-display");
const accountNameInput = document.getElementById("account-name-input");
const loginBtn = document.getElementById("login-btn");
const timeDisplay = document.getElementById("time-display");
const timerFill = document.getElementById("timer-fill");
const missionDisplay = document.getElementById("mission-display");
const requiredDisplay = document.getElementById("required-display");
const usedCountDisplay = document.getElementById("used-count-display");
const lastWordDisplay = document.getElementById("last-word-display");
const turnBanner = document.getElementById("turn-banner");
const startBtn = document.getElementById("start-btn");
const statusFeed = document.getElementById("status-feed");
const wordStream = document.getElementById("word-stream");
const wordInput = document.getElementById("word-input");
const sendBtn = document.getElementById("send-btn");
const soloModeBtn = document.getElementById("solo-mode-btn");
const onlineModeBtn = document.getElementById("online-mode-btn");
const onlinePanel = document.getElementById("online-panel");
const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomBtn = document.getElementById("join-room-btn");
const roomCodeInput = document.getElementById("room-code-input");
const inviteLinkInput = document.getElementById("invite-link-input");
const copyLinkBtn = document.getElementById("copy-link-btn");
const onlineStatus = document.getElementById("online-status");
const connectionPill = document.getElementById("connection-pill");
const playerAvatar = document.getElementById("player-avatar");
const playerName = document.getElementById("player-name");
const playerScoreDisplay = document.getElementById("player-score");
const opponentAvatar = document.getElementById("opponent-avatar");
const opponentName = document.getElementById("opponent-name");
const opponentScoreDisplay = document.getElementById("opponent-score");
const equippedName = document.getElementById("equipped-name");
const shopList = document.getElementById("shop-list");
const inventoryList = document.getElementById("inventory-list");
const randomBoxBtn = document.getElementById("random-box-btn");
const useHintBtn = document.getElementById("use-hint-btn");
const useTimeBtn = document.getElementById("use-time-btn");
const useMissionBtn = document.getElementById("use-mission-btn");
const useCoinBtn = document.getElementById("use-coin-btn");
const hintCount = document.getElementById("hint-count");
const timeCount = document.getElementById("time-count");
const missionCount = document.getElementById("mission-count");
const coinCount = document.getElementById("coin-count");

let profile = loadProfile();

async function fetchTxtFile(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) return [];
        const text = await response.text();
        const words = text
            .split(/[\/\r\n]+/)
            .map(word => word.replace(/^\uFEFF/, "").trim())
            .filter(word => word.length >= 2 && !word.includes("?"));

        return removeDuplicateWords(words);
    } catch (error) {
        console.error(`${filePath} 파일을 불러오는데 실패했습니다:`, error);
        return [];
    }
}

function removeDuplicateWords(words) {
    const uniqueWords = [];
    const seenWords = new Set();

    for (const word of words) {
        if (seenWords.has(word)) continue;
        seenWords.add(word);
        uniqueWords.push(word);
    }

    return uniqueWords;
}

function buildWordBuckets(words) {
    const buckets = new Map();

    for (const word of words) {
        const firstChar = word.charAt(0);
        if (!buckets.has(firstChar)) {
            buckets.set(firstChar, []);
        }
        buckets.get(firstChar).push(word);
    }

    return buckets;
}

async function loadGameData() {
    if (dataLoaded) return;

    wordPool = await fetchTxtFile("words/words.txt");
    wordSet = new Set(wordPool);
    wordBuckets = buildWordBuckets(wordPool);

    try {
        const response = await fetch("data/missions.json");
        missionLetters = response.ok ? await response.json() : [];
    } catch (error) {
        console.error("missions.json 로드 실패:", error);
        missionLetters = [];
    }

    if (missionLetters.length === 0) {
        missionLetters = ["가", "나", "다", "라", "마"];
    }

    dataLoaded = true;
}

function loadProfile() {
    const fallback = {
        nickname: "손님",
        loggedIn: false,
        coins: 0,
        bestScore: 0,
        equippedCostume: DEFAULT_COSTUME.id,
        ownedCostumes: [DEFAULT_COSTUME.id],
        items: {}
    };

    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return normalizeProfile({ ...fallback, ...saved });
    } catch {
        return normalizeProfile(fallback);
    }
}

function normalizeProfile(value) {
    const ownedCostumes = Array.isArray(value.ownedCostumes) ? value.ownedCostumes : [DEFAULT_COSTUME.id];
    if (!ownedCostumes.includes(DEFAULT_COSTUME.id)) {
        ownedCostumes.unshift(DEFAULT_COSTUME.id);
    }

    const items = value.items && typeof value.items === "object" ? value.items : {};

    return {
        nickname: cleanNickname(value.nickname || "손님"),
        loggedIn: Boolean(value.loggedIn),
        coins: Math.max(0, Number(value.coins) || 0),
        bestScore: Math.max(0, Number(value.bestScore) || 0),
        equippedCostume: ownedCostumes.includes(value.equippedCostume) ? value.equippedCostume : DEFAULT_COSTUME.id,
        ownedCostumes,
        items
    };
}

function saveProfile() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function cleanNickname(value) {
    const cleaned = String(value || "")
        .replace(/[^\p{L}\p{N}_-]/gu, "")
        .slice(0, 12);

    return cleaned || "손님";
}

function getItemById(itemId) {
    return ALL_ITEMS.find(item => item.id === itemId) || DEFAULT_COSTUME;
}

function getCostume(itemId) {
    return COSTUME_ITEMS.find(item => item.id === itemId) || DEFAULT_COSTUME;
}

function getItemCount(itemId) {
    return Math.max(0, Number(profile.items[itemId]) || 0);
}

function addItemCount(itemId, count) {
    profile.items[itemId] = getItemCount(itemId) + count;
}

function consumeItemCount(itemId) {
    if (getItemCount(itemId) <= 0) return false;
    profile.items[itemId] -= 1;
    if (profile.items[itemId] <= 0) {
        delete profile.items[itemId];
    }
    saveProfile();
    renderProfile();
    return true;
}

function renderProfile() {
    const costume = getCostume(profile.equippedCostume);
    nicknameDisplay.textContent = profile.nickname;
    coinDisplay.textContent = profile.coins.toLocaleString("ko-KR");
    accountNameInput.value = profile.loggedIn ? profile.nickname : "";
    playerName.textContent = profile.nickname;
    equippedName.textContent = costume.name;
    applyAvatar(playerAvatar, costume, costume.icon);

    hintCount.textContent = getItemCount("hint-card");
    timeCount.textContent = getItemCount("time-card");
    missionCount.textContent = getItemCount("mission-card");
    coinCount.textContent = getItemCount("coin-boost");

    renderShop();
    renderInventory();
    renderPlayers();
}

function renderShop() {
    shopList.innerHTML = "";

    for (const item of SHOP_ITEMS) {
        const row = document.createElement("div");
        row.className = "shop-row";

        const icon = createShopIcon(item);
        const info = document.createElement("div");
        const title = document.createElement("h3");
        const desc = document.createElement("p");
        title.textContent = `${item.name} ${item.price}`;
        desc.textContent = item.desc;
        info.append(title, desc);

        const button = document.createElement("button");
        button.className = "shop-action";
        button.dataset.itemId = item.id;

        if (item.type === "costume" && profile.ownedCostumes.includes(item.id)) {
            button.textContent = profile.equippedCostume === item.id ? "착용중" : "착용";
            button.dataset.action = "equip";
            button.disabled = profile.equippedCostume === item.id;
        } else {
            button.textContent = "구매";
            button.dataset.action = "buy";
            button.disabled = profile.coins < item.price;
        }

        row.append(icon, info, button);
        shopList.appendChild(row);
    }
}

function renderInventory() {
    inventoryList.innerHTML = "";

    const ownedCostumes = profile.ownedCostumes.map(getCostume);
    const ownedItems = SHOP_ITEMS.filter(item => item.type === "item" && getItemCount(item.id) > 0);
    const list = [...ownedCostumes, ...ownedItems];

    for (const item of list) {
        const row = document.createElement("div");
        row.className = "inventory-row";

        const icon = createShopIcon(item);
        const info = document.createElement("div");
        const title = document.createElement("h3");
        const desc = document.createElement("p");
        title.textContent = item.name;
        desc.textContent = item.type === "costume" ? item.desc : `보유 ${getItemCount(item.id)}개`;
        info.append(title, desc);

        const button = document.createElement("button");
        button.className = "inventory-action";
        button.dataset.itemId = item.id;

        if (item.type === "costume") {
            button.textContent = profile.equippedCostume === item.id ? "착용중" : "착용";
            button.dataset.action = "equip";
            button.disabled = profile.equippedCostume === item.id;
            if (profile.equippedCostume === item.id) {
                button.classList.add("equipped");
            }
        } else {
            button.textContent = "사용";
            button.dataset.action = "use";
        }

        row.append(icon, info, button);
        inventoryList.appendChild(row);
    }
}

function createShopIcon(item) {
    const icon = document.createElement("div");
    icon.className = "shop-icon";
    icon.textContent = item.icon;
    icon.style.backgroundColor = item.color;
    return icon;
}

function applyAvatar(element, costume, fallbackText) {
    element.textContent = fallbackText || costume.icon;
    element.style.background = `linear-gradient(150deg, ${costume.color}, #27485c)`;
}

function buyItem(itemId) {
    const item = SHOP_ITEMS.find(entry => entry.id === itemId);
    if (!item) return;

    if (profile.coins < item.price) {
        addSystemMessage("코인이 부족합니다.");
        return;
    }

    profile.coins -= item.price;

    if (item.type === "costume") {
        if (!profile.ownedCostumes.includes(item.id)) {
            profile.ownedCostumes.push(item.id);
        }
        profile.equippedCostume = item.id;
        addSystemMessage(`${item.name}을(를) 구매하고 착용했습니다.`);
    } else {
        addItemCount(item.id, 1);
        addSystemMessage(`${item.name}을(를) 구매했습니다.`);
    }

    saveProfile();
    renderProfile();
    sendProfileMessage();
}

function equipCostume(itemId) {
    if (!profile.ownedCostumes.includes(itemId)) return;
    profile.equippedCostume = itemId;
    saveProfile();
    renderProfile();
    sendProfileMessage();
    addSystemMessage(`${getCostume(itemId).name}을(를) 착용했습니다.`);
}

function openRandomBox() {
    if (profile.coins < RANDOM_BOX_PRICE) {
        addSystemMessage("랜덤박스를 열 코인이 부족합니다.");
        return;
    }

    profile.coins -= RANDOM_BOX_PRICE;
    const reward = SHOP_ITEMS[Math.floor(Math.random() * SHOP_ITEMS.length)];

    if (reward.type === "costume") {
        if (profile.ownedCostumes.includes(reward.id)) {
            profile.coins += 35;
            addSystemMessage(`랜덤박스: ${reward.name} 중복입니다. 대신 35코인을 받았습니다.`);
        } else {
            profile.ownedCostumes.push(reward.id);
            profile.equippedCostume = reward.id;
            addSystemMessage(`랜덤박스: ${reward.name} 획득! 바로 착용했습니다.`);
        }
    } else {
        addItemCount(reward.id, 1);
        addSystemMessage(`랜덤박스: ${reward.name} 1개를 얻었습니다.`);
    }

    saveProfile();
    renderProfile();
    sendProfileMessage();
}

function login() {
    profile.nickname = cleanNickname(accountNameInput.value);
    profile.loggedIn = true;
    saveProfile();
    renderProfile();
    sendProfileMessage();
    addSystemMessage(`${profile.nickname}으로 로그인했습니다.`);
}

function getPublicProfile() {
    const costume = getCostume(profile.equippedCostume);
    return {
        nickname: profile.nickname,
        costumeId: costume.id,
        costumeName: costume.name,
        icon: costume.icon,
        color: costume.color
    };
}

function normalizeRemoteProfile(value) {
    const fallback = {
        nickname: "친구",
        costumeId: DEFAULT_COSTUME.id,
        costumeName: DEFAULT_COSTUME.name,
        icon: "상",
        color: "#ef6f6c"
    };

    if (!value || typeof value !== "object") return fallback;

    return {
        nickname: cleanNickname(value.nickname || fallback.nickname),
        costumeId: value.costumeId || fallback.costumeId,
        costumeName: value.costumeName || fallback.costumeName,
        icon: String(value.icon || fallback.icon).slice(0, 2),
        color: /^#[0-9a-f]{6}$/i.test(value.color || "") ? value.color : fallback.color
    };
}

function setMode(mode) {
    if (gameMode === mode) return;

    finishGame("모드가 바뀌었습니다.", { reward: false });
    gameMode = mode;
    soloModeBtn.classList.toggle("active", mode === "solo");
    onlineModeBtn.classList.toggle("active", mode === "online");
    onlinePanel.hidden = mode !== "online";
    connectionPill.textContent = mode === "online" ? "친구" : "혼자";
    startBtn.textContent = mode === "online" ? "친구 대전 시작" : "게임 시작";
    updateStartButtonState();
    renderPlayers();
    addSystemMessage(mode === "online" ? "친구 대전 모드입니다. 방을 만들거나 참가하세요." : "봇 대전 모드입니다.");
}

function updateStartButtonState() {
    if (gameMode === "solo") {
        startBtn.disabled = false;
        return;
    }

    startBtn.disabled = !(onlineRole === "host" && connection && connection.open);
}

function setOnlineStatus(message) {
    onlineStatus.textContent = message;
}

function resetOnlineConnection() {
    if (connection) {
        connection.close();
        connection = null;
    }

    if (peer) {
        peer.destroy();
        peer = null;
    }

    onlineRole = null;
    currentRoomCode = "";
    remoteProfile = null;
    inviteLinkInput.value = "";
    updateStartButtonState();
    renderPlayers();
}

function generateRoomCode() {
    const randomPart = Math.random().toString(36).slice(2, 8);
    return `${ROOM_PREFIX}${randomPart}`;
}

function decodeHashRoom(hash) {
    const cleaned = hash.replace(/^#\/?/, "").trim();
    if (!cleaned) return "";

    try {
        return decodeURIComponent(cleaned);
    } catch {
        return cleaned;
    }
}

function extractRoomCode(value) {
    const trimmedValue = value.trim();
    if (!trimmedValue) return "";

    try {
        const url = new URL(trimmedValue);
        return url.searchParams.get("room") || "";
    } catch {
        return trimmedValue.startsWith(ROOM_PREFIX) ? trimmedValue : "";
    }
}

function extractRoomName(value) {
    const trimmedValue = value.trim();
    if (!trimmedValue) return "";

    try {
        const url = new URL(trimmedValue);
        return decodeHashRoom(url.hash) || url.searchParams.get("name") || "";
    } catch {
        return trimmedValue;
    }
}

function cleanRoomName(value) {
    return String(value || "")
        .replace(/\s+/g, "-")
        .replace(/[^\p{L}\p{N}_-]/gu, "")
        .slice(0, 36);
}

function encodeRoomNameToId(roomName) {
    const bytes = new TextEncoder().encode(roomName);
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return `${ROOM_PREFIX}name-${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")}`;
}

function getRoomCodeFromInput(value, allowRandomRoom) {
    const directRoomCode = extractRoomCode(value);
    if (directRoomCode) return directRoomCode;

    const cleanedName = cleanRoomName(extractRoomName(value));
    if (cleanedName) return encodeRoomNameToId(cleanedName);

    return allowRandomRoom ? generateRoomCode() : "";
}

function getRoomNameFromInput(value) {
    const directRoomCode = extractRoomCode(value);
    if (directRoomCode) return "";

    return cleanRoomName(extractRoomName(value));
}

function getInviteLink(roomCode, roomName) {
    const url = new URL(window.location.href);
    const base = `${url.origin}${url.pathname}`;

    if (roomName) {
        return `${base}#${encodeURIComponent(roomName)}`;
    }

    return `${base}#${encodeURIComponent(roomCode)}`;
}

function createOnlineRoom() {
    if (typeof Peer === "undefined") {
        setOnlineStatus("온라인 연결 파일을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.");
        return;
    }

    resetOnlineConnection();
    onlineRole = "host";
    const roomName = getRoomNameFromInput(roomCodeInput.value);
    currentRoomCode = getRoomCodeFromInput(roomCodeInput.value, true);
    roomCodeInput.value = roomName || currentRoomCode;
    inviteLinkInput.value = getInviteLink(currentRoomCode, roomName);
    setOnlineStatus("방을 여는 중입니다...");

    peer = new Peer(currentRoomCode);

    peer.on("open", () => {
        setOnlineStatus("방이 열렸습니다. 초대 링크를 친구에게 보내세요.");
        addSystemMessage("친구가 들어오면 게임을 시작할 수 있습니다.");
    });

    peer.on("connection", conn => {
        if (connection && connection.open) {
            conn.close();
            return;
        }

        setupConnection(conn);
    });

    peer.on("error", error => {
        console.error(error);
        const isTaken = error && error.type === "unavailable-id";
        setOnlineStatus(isTaken ? "이미 사용 중인 방 이름입니다. 다른 이름으로 다시 만들어 주세요." : "방 만들기에 실패했습니다. 다시 시도해 주세요.");
    });
}

function joinOnlineRoom() {
    if (typeof Peer === "undefined") {
        setOnlineStatus("온라인 연결 파일을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.");
        return;
    }

    const roomCode = getRoomCodeFromInput(roomCodeInput.value, false);
    if (!roomCode) {
        setOnlineStatus("방 이름이나 초대 링크를 입력해 주세요.");
        return;
    }

    resetOnlineConnection();
    onlineRole = "guest";
    currentRoomCode = roomCode;
    roomCodeInput.value = cleanRoomName(extractRoomName(roomCodeInput.value)) || roomCode;
    setOnlineStatus("방에 참가하는 중입니다...");

    peer = new Peer();

    peer.on("open", () => {
        const conn = peer.connect(roomCode, { reliable: true });
        setupConnection(conn);
    });

    peer.on("error", error => {
        console.error(error);
        setOnlineStatus("방 참가에 실패했습니다. 방 이름이 맞는지 확인해 주세요.");
    });
}

function setupConnection(conn) {
    connection = conn;

    conn.on("open", () => {
        setOnlineStatus(onlineRole === "host" ? "친구가 연결되었습니다. 게임을 시작하세요." : "방에 연결되었습니다. 방장이 시작할 때까지 기다리세요.");
        connectionPill.textContent = "연결됨";
        updateStartButtonState();
        sendProfileMessage();
        addSystemMessage(onlineRole === "host" ? "친구가 들어왔습니다." : "방에 참가했습니다.");
    });

    conn.on("data", data => {
        void handleOnlineData(data);
    });

    conn.on("close", () => {
        finishGame("친구와 연결이 끊겼습니다.", { reward: true });
        setOnlineStatus("연결이 끊겼습니다. 새 방을 만들거나 다시 참가하세요.");
        connection = null;
        remoteProfile = null;
        connectionPill.textContent = "친구";
        updateStartButtonState();
        renderPlayers();
    });

    conn.on("error", error => {
        console.error(error);
        setOnlineStatus("친구와 연결 중 문제가 생겼습니다.");
    });
}

function sendOnlineMessage(data) {
    if (connection && connection.open) {
        connection.send(data);
    }
}

function sendProfileMessage() {
    sendOnlineMessage({
        type: "profile",
        profile: getPublicProfile()
    });
}

async function copyInviteLink() {
    if (!inviteLinkInput.value) {
        setOnlineStatus("먼저 방을 만들어 주세요.");
        return;
    }

    try {
        await navigator.clipboard.writeText(inviteLinkInput.value);
        setOnlineStatus("초대 링크를 복사했습니다.");
    } catch {
        inviteLinkInput.select();
        setOnlineStatus("링크 칸을 선택했습니다. Ctrl+C로 복사하세요.");
    }
}

async function startGame() {
    if (gameMode === "online") {
        await startOnlineGame();
        return;
    }

    await startSoloGame();
}

async function startSoloGame() {
    await loadGameData();
    resetSharedGameState();
    currentScore = 0;
    botScore = 0;
    gameActive = true;
    gameRewarded = false;
    isPlayerTurn = true;
    updateScoresDisplay();
    addSystemMessage(`게임 시작. 단어장 ${wordPool.length.toLocaleString("ko-KR")}개를 사용합니다.`);
    startNewSoloTurn();
}

async function startOnlineGame() {
    if (onlineRole !== "host" || !connection || !connection.open) {
        addSystemMessage("방을 만들고 친구가 연결된 뒤 시작할 수 있습니다.");
        return;
    }

    await loadGameData();
    resetSharedGameState();
    onlineScores = { host: 0, guest: 0 };
    currentTurnRole = "host";
    currentMission = pickMissionLetter();
    gameActive = true;
    gameRewarded = false;
    updateScoresDisplay();
    updateRoundBoard();
    addSystemMessage(`친구 대전 시작. 단어장 ${wordPool.length.toLocaleString("ko-KR")}개를 사용합니다.`);
    sendOnlineMessage({
        type: "game-start",
        state: {
            mission: currentMission,
            turnRole: currentTurnRole,
            scores: onlineScores,
            usedWords: [],
            lastWord: "",
            hostProfile: getPublicProfile()
        }
    });
    startOnlineTurn();
}

function resetSharedGameState() {
    clearInterval(timerInterval);
    botTurnToken++;
    usedWords.clear();
    lastWord = "";
    currentMission = "";
    timeLeft = TURN_SECONDS;
    wordInput.value = "";
    wordStream.innerHTML = "";
    statusFeed.innerHTML = "";
    setInputEnabled(false);
    updateTimerDisplay();
    updateRoundBoard();
    updateScoresDisplay();
}

function startNewSoloTurn() {
    if (!gameActive) return;

    resetTimer();
    currentMission = pickMissionLetter();
    updateRoundBoard();
    turnStartTime = Date.now();

    if (isPlayerTurn) {
        setTurnBanner("내 차례");
        setInputEnabled(true);
        wordInput.focus();
    } else {
        setTurnBanner("봇 차례");
        setInputEnabled(false);
        botTurn();
    }
}

function startOnlineTurn() {
    if (!gameActive) return;

    resetTimer();
    turnStartTime = Date.now();
    updateRoundBoard();

    if (isMyOnlineTurn()) {
        setTurnBanner("내 차례");
        setInputEnabled(true);
        wordInput.focus();
    } else {
        setTurnBanner("상대 차례");
        setInputEnabled(false);
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    timeLeft = TURN_SECONDS;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimerExpired();
        }
    }, 1000);
}

function updateTimerDisplay() {
    timeDisplay.textContent = timeLeft;
    const percent = Math.max(0, Math.min(100, (timeLeft / TURN_SECONDS) * 100));
    timerFill.style.width = `${percent}%`;
}

function addTime(seconds) {
    timeLeft = Math.min(20, timeLeft + seconds);
    updateTimerDisplay();
}

function handleTimerExpired() {
    if (!gameActive) return;

    if (gameMode === "online") {
        if (isMyOnlineTurn()) {
            sendOnlineMessage({
                type: "game-over",
                message: "상대가 시간 초과로 패배했습니다. 당신의 승리!"
            });
            finishGame("시간 초과로 패배했습니다.", { reward: true });
        }
        return;
    }

    finishGame(isPlayerTurn ? "시간 초과로 패배했습니다." : "봇이 시간 초과로 패배했습니다. 승리!", { reward: true });
}

function pickMissionLetter() {
    if (missionLetters.length === 0) return "-";
    const randomIndex = Math.floor(Math.random() * missionLetters.length);
    return missionLetters[randomIndex];
}

function updateRoundBoard() {
    missionDisplay.textContent = currentMission || "-";
    lastWordDisplay.textContent = lastWord || "READY";
    requiredDisplay.textContent = lastWord ? getLastChar(lastWord) : "자유";
    usedCountDisplay.textContent = usedWords.size;
}

function getLastChar(word) {
    return word.charAt(word.length - 1);
}

function setTurnBanner(text) {
    turnBanner.textContent = text;
}

function getInvalidReason(word) {
    if (word.length < 2) {
        return "단어는 최소 2글자 이상이어야 합니다.";
    }

    if (!wordSet.has(word)) {
        return `'${word}'은(는) 단어장에 없는 단어입니다.`;
    }

    if (usedWords.has(word)) {
        return `'${word}'은(는) 이미 사용된 단어입니다.`;
    }

    if (lastWord !== "") {
        const requiredChar = getLastChar(lastWord);
        if (word.charAt(0) !== requiredChar) {
            return `'${requiredChar}'로 시작하는 단어여야 합니다.`;
        }
    }

    return "";
}

function calculateTurnScore(word) {
    const elapsedTime = (Date.now() - turnStartTime) / 1000;
    let turnScore = 8;

    if (elapsedTime <= 0.5) turnScore += 10;
    else if (elapsedTime <= 1.0) turnScore += 8;
    else if (elapsedTime <= 2.0) turnScore += 6;
    else if (elapsedTime <= 3.0) turnScore += 4;
    else if (elapsedTime <= 5.0) turnScore += 2;

    const missionHit = currentMission !== "-" && word.includes(currentMission);
    if (missionHit) {
        turnScore += 5;
    }

    return { turnScore, missionHit };
}

function selectBotWord() {
    const requiredChar = getLastChar(lastWord);
    const candidateWords = wordBuckets.get(requiredChar) || [];
    const availableWords = candidateWords.filter(word => word.length <= BOT_MAX_WORD_LENGTH && !usedWords.has(word));

    if (availableWords.length === 0) return null;

    availableWords.sort((a, b) => a.length - b.length || a.localeCompare(b, "ko"));
    return availableWords[0];
}

function getBotDelay() {
    return (Math.random() * 1.4 + 1.1) * 1000;
}

function handlePlayerInput() {
    if (gameMode === "online") {
        handleOnlineInput();
        return;
    }

    handleSoloInput();
}

function handleSoloInput() {
    const word = wordInput.value.trim();
    wordInput.value = "";

    const invalidReason = getInvalidReason(word);
    if (invalidReason) {
        addSystemMessage(`${invalidReason} 패배입니다.`);
        finishGame("규칙에 맞지 않는 단어를 입력했습니다.", { reward: true });
        return;
    }

    addPlayedWord(word, "player", profile.nickname, calculateTurnScore(word));
    isPlayerTurn = false;
    startNewSoloTurn();
}

function handleOnlineInput() {
    if (!connection || !connection.open) {
        addSystemMessage("친구와 연결된 뒤 입력할 수 있습니다.");
        return;
    }

    if (!isMyOnlineTurn()) {
        addSystemMessage("아직 내 차례가 아닙니다.");
        return;
    }

    const word = wordInput.value.trim();
    wordInput.value = "";

    const invalidReason = getInvalidReason(word);
    if (invalidReason) {
        addSystemMessage(`${invalidReason} 패배입니다.`);
        sendOnlineMessage({
            type: "game-over",
            message: `상대가 규칙 위반으로 패배했습니다. 당신의 승리! (${invalidReason})`
        });
        finishGame("규칙에 맞지 않는 단어를 입력했습니다.", { reward: true });
        return;
    }

    const result = calculateTurnScore(word);
    addPlayedWord(word, "player", profile.nickname, result);
    onlineScores[onlineRole] += result.turnScore;

    currentMission = pickMissionLetter();
    currentTurnRole = getOtherRole(onlineRole);
    updateScoresDisplay();
    updateRoundBoard();

    sendOnlineMessage({
        type: "word-played",
        word,
        role: onlineRole,
        score: result.turnScore,
        missionHit: result.missionHit,
        nextMission: currentMission,
        nextTurnRole: currentTurnRole,
        scores: onlineScores
    });

    startOnlineTurn();
}

function addPlayedWord(word, sender, speakerName, scoreResult) {
    usedWords.add(word);
    lastWord = word;

    if (sender === "player" && gameMode === "solo") {
        currentScore += scoreResult.turnScore;
    }

    if (scoreResult.missionHit) {
        addSystemMessage(`${speakerName} 미션 성공 +5`);
    }

    addWordEntry(word, sender, speakerName, scoreResult.turnScore);
    updateScoresDisplay();
    updateRoundBoard();
}

function botTurn() {
    const activeToken = ++botTurnToken;
    const delay = getBotDelay();

    setTimeout(() => {
        if (!gameActive || activeToken !== botTurnToken) return;

        const botWord = selectBotWord();

        if (!botWord) {
            finishGame("봇이 더 이상 이어갈 단어를 찾지 못했습니다. 승리!", { reward: true });
            return;
        }

        const botGain = Math.max(4, Math.min(15, botWord.length + 3));
        botScore += botGain;
        usedWords.add(botWord);
        lastWord = botWord;
        addWordEntry(botWord, "bot", "단어 봇", botGain);
        updateScoresDisplay();
        updateRoundBoard();

        isPlayerTurn = true;
        startNewSoloTurn();
    }, delay);
}

async function handleOnlineData(data) {
    if (!data || typeof data !== "object") return;

    if (data.type === "profile") {
        remoteProfile = normalizeRemoteProfile(data.profile);
        renderPlayers();
        return;
    }

    if (data.type === "game-start") {
        await loadGameData();
        resetSharedGameState();
        onlineScores = data.state.scores || { host: 0, guest: 0 };
        currentMission = data.state.mission || pickMissionLetter();
        currentTurnRole = data.state.turnRole || "host";
        usedWords = new Set(data.state.usedWords || []);
        lastWord = data.state.lastWord || "";
        remoteProfile = normalizeRemoteProfile(data.state.hostProfile || remoteProfile);
        gameActive = true;
        gameRewarded = false;
        updateScoresDisplay();
        updateRoundBoard();
        renderPlayers();
        addSystemMessage(`친구 대전 시작. 단어장 ${wordPool.length.toLocaleString("ko-KR")}개를 사용합니다.`);
        sendProfileMessage();
        startOnlineTurn();
        return;
    }

    if (data.type === "word-played") {
        const name = remoteProfile ? remoteProfile.nickname : "친구";
        addWordEntry(data.word, "remote", name, data.score || 0);
        usedWords.add(data.word);
        lastWord = data.word;
        onlineScores = data.scores || onlineScores;
        currentMission = data.nextMission || pickMissionLetter();
        currentTurnRole = data.nextTurnRole || onlineRole;

        if (data.missionHit) {
            addSystemMessage(`${name} 미션 성공 +5`);
        }

        updateScoresDisplay();
        updateRoundBoard();
        startOnlineTurn();
        return;
    }

    if (data.type === "mission-change") {
        currentMission = data.mission || currentMission;
        updateRoundBoard();
        addSystemMessage("상대가 미션을 바꿨습니다.");
        return;
    }

    if (data.type === "time-boost") {
        addTime(Number(data.seconds) || 5);
        addSystemMessage("상대가 시간을 늘렸습니다.");
        return;
    }

    if (data.type === "game-over") {
        finishGame(data.message || "친구 대전이 종료되었습니다.", { reward: true });
    }
}

function addWordEntry(word, sender, speakerName, score) {
    const entry = document.createElement("div");
    entry.className = `word-entry ${sender}`;

    const speaker = document.createElement("span");
    speaker.textContent = speakerName;

    const wordText = document.createElement("strong");
    wordText.textContent = word;

    const scoreText = document.createElement("em");
    scoreText.textContent = `+${score}`;

    entry.append(speaker, wordText, scoreText);
    wordStream.prepend(entry);

    while (wordStream.children.length > 28) {
        wordStream.removeChild(wordStream.lastElementChild);
    }
}

function addSystemMessage(text) {
    const systemDiv = document.createElement("div");
    systemDiv.className = "system-message";
    systemDiv.textContent = text;
    statusFeed.prepend(systemDiv);

    while (statusFeed.children.length > 4) {
        statusFeed.removeChild(statusFeed.lastElementChild);
    }
}

function finishGame(message, options = { reward: true }) {
    const shouldReward = gameActive && options.reward !== false;
    clearInterval(timerInterval);
    botTurnToken++;
    gameActive = false;
    setInputEnabled(false);
    setTurnBanner("게임 종료");

    if (message) {
        addSystemMessage(`게임 종료: ${message}`);
    }

    if (shouldReward) {
        awardCoins();
    }
}

function awardCoins() {
    if (gameRewarded) return;

    gameRewarded = true;
    const score = getLocalScore();
    if (score <= 0) {
        addSystemMessage("획득 코인: 0");
        return;
    }

    const coins = Math.floor(score * (coinBoostActive ? 1.5 : 1));
    profile.coins += coins;
    profile.bestScore = Math.max(profile.bestScore, score);
    coinBoostActive = false;
    saveProfile();
    renderProfile();
    addSystemMessage(`획득 코인: ${coins.toLocaleString("ko-KR")}`);
}

function getLocalScore() {
    if (gameMode === "online") {
        return onlineScores[onlineRole] || 0;
    }

    return currentScore;
}

function setInputEnabled(enabled) {
    wordInput.disabled = !enabled;
    sendBtn.disabled = !enabled;
}

function updateScoresDisplay() {
    const playerScore = getLocalScore();
    const rivalScore = gameMode === "online"
        ? onlineScores[getOtherRole(onlineRole || "host")] || 0
        : botScore;

    playerScoreDisplay.textContent = playerScore;
    opponentScoreDisplay.textContent = rivalScore;
}

function renderPlayers() {
    const localCostume = getCostume(profile.equippedCostume);
    applyAvatar(playerAvatar, localCostume, localCostume.icon);
    playerName.textContent = profile.nickname;

    if (gameMode === "online") {
        const rival = remoteProfile || {
            nickname: "친구 대기중",
            icon: "친",
            color: "#ef6f6c"
        };
        opponentName.textContent = rival.nickname;
        opponentAvatar.textContent = rival.icon || "친";
        opponentAvatar.style.background = `linear-gradient(150deg, ${rival.color || "#ef6f6c"}, #27485c)`;
        return;
    }

    opponentName.textContent = "단어 봇";
    opponentAvatar.textContent = "봇";
    opponentAvatar.style.background = "linear-gradient(150deg, #ef6f6c, #f6b34e)";
}

function getOtherRole(role) {
    return role === "host" ? "guest" : "host";
}

function isMyOnlineTurn() {
    return gameMode === "online" && onlineRole && currentTurnRole === onlineRole;
}

function canUseTurnItem() {
    if (!gameActive) {
        addSystemMessage("게임 중에만 쓸 수 있습니다.");
        return false;
    }

    if (gameMode === "solo" && !isPlayerTurn) {
        addSystemMessage("내 차례에만 쓸 수 있습니다.");
        return false;
    }

    if (gameMode === "online" && !isMyOnlineTurn()) {
        addSystemMessage("내 차례에만 쓸 수 있습니다.");
        return false;
    }

    return true;
}

function useItem(itemId) {
    if (itemId === "coin-boost") {
        if (coinBoostActive) {
            addSystemMessage("이미 코인 부스터가 켜져 있습니다.");
            return;
        }

        if (!consumeItemCount(itemId)) {
            addSystemMessage("코인 부스터가 없습니다.");
            return;
        }

        coinBoostActive = true;
        addSystemMessage("이번 판 코인 보상이 1.5배가 됩니다.");
        return;
    }

    if (!canUseTurnItem()) return;

    if (!consumeItemCount(itemId)) {
        addSystemMessage(`${getItemById(itemId).name}이(가) 없습니다.`);
        return;
    }

    if (itemId === "hint-card") {
        const hint = findHintWord();
        if (!hint) {
            addSystemMessage("힌트로 보여줄 단어가 없습니다.");
            return;
        }
        wordInput.value = hint;
        wordInput.focus();
        addSystemMessage("힌트를 입력칸에 넣었습니다.");
        return;
    }

    if (itemId === "time-card") {
        addTime(5);
        sendOnlineMessage({ type: "time-boost", seconds: 5 });
        addSystemMessage("시간을 5초 늘렸습니다.");
        return;
    }

    if (itemId === "mission-card") {
        currentMission = pickMissionLetter();
        updateRoundBoard();
        sendOnlineMessage({ type: "mission-change", mission: currentMission });
        addSystemMessage("미션 글자를 바꿨습니다.");
    }
}

function findHintWord() {
    const candidates = lastWord ? wordBuckets.get(getLastChar(lastWord)) || [] : wordPool;
    const availableWords = candidates.filter(word => !usedWords.has(word));

    if (availableWords.length === 0) return "";

    availableWords.sort((a, b) => {
        const missionA = currentMission !== "-" && a.includes(currentMission) ? 0 : 1;
        const missionB = currentMission !== "-" && b.includes(currentMission) ? 0 : 1;
        return missionA - missionB || a.length - b.length || a.localeCompare(b, "ko");
    });

    return availableWords[0];
}

function applyInviteFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get("room");
    const roomName = decodeHashRoom(window.location.hash) || params.get("name");

    if (!roomCode && !roomName) return;

    gameMode = "solo";
    setMode("online");
    roomCodeInput.value = roomName || roomCode;
    setOnlineStatus("초대 링크가 감지되었습니다. 참가 버튼을 눌러 들어가세요.");
}

function handleShopClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const itemId = button.dataset.itemId;
    const action = button.dataset.action;

    if (action === "buy") buyItem(itemId);
    if (action === "equip") equipCostume(itemId);
    if (action === "use") useItem(itemId);
}

loginBtn.addEventListener("click", login);
accountNameInput.addEventListener("keypress", event => {
    if (event.key === "Enter") login();
});
soloModeBtn.addEventListener("click", () => setMode("solo"));
onlineModeBtn.addEventListener("click", () => setMode("online"));
createRoomBtn.addEventListener("click", createOnlineRoom);
joinRoomBtn.addEventListener("click", joinOnlineRoom);
copyLinkBtn.addEventListener("click", copyInviteLink);
startBtn.addEventListener("click", startGame);
sendBtn.addEventListener("click", handlePlayerInput);
wordInput.addEventListener("keypress", event => {
    if (event.key === "Enter") handlePlayerInput();
});
randomBoxBtn.addEventListener("click", openRandomBox);
shopList.addEventListener("click", handleShopClick);
inventoryList.addEventListener("click", handleShopClick);
useHintBtn.addEventListener("click", () => useItem("hint-card"));
useTimeBtn.addEventListener("click", () => useItem("time-card"));
useMissionBtn.addEventListener("click", () => useItem("mission-card"));
useCoinBtn.addEventListener("click", () => useItem("coin-boost"));

window.addEventListener("beforeunload", () => {
    if (connection) connection.close();
    if (peer) peer.destroy();
});

renderProfile();
applyInviteFromUrl();
updateStartButtonState();
updateRoundBoard();
updateTimerDisplay();
addSystemMessage("닉네임으로 로그인하고, 점수로 코인을 모아 상점 아이템을 얻어보세요.");
