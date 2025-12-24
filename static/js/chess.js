function getPieceImageUrl(piece) {
    const isWhite = piece === piece.toUpperCase();
    const colorPrefix = isWhite ? 'w' : 'b';
    const pieceLetter = piece.toUpperCase();
    return `/pieces/${colorPrefix}${pieceLetter}.png`;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

let gameState = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    selectedSquare: null,
    legalMoves: [],
    isFlipped: false,
    playerColor: 'white',
    aiDepth: 3,
    isThinking: false,
    lastMove: null,
    moveHistory: [],
    draggedPiece: null,
    draggedFrom: null,
    dragGhost: null,
    isDragging: false,
    moveInProgress: false,
    inCheck: false
};

let highlightCanvas = null;
let highlightCtx = null;
let squarePositions = {};
let arrows = [];
let redSquares = new Set();
let rightMouseDrag = null;

const DEFAULT_ARROW_COLOR = 'rgba(255, 170, 0, 0.85)';
const SUGGESTION_ARROW_COLOR = 'rgba(0, 180, 0, 0.75)';
const RED_SQUARE_COLOR = 'rgba(220, 38, 38, 0.6)';

function setupBoardHighlights() {
    const boardContainer = document.querySelector('.board-container');
    const board = document.getElementById('chessBoard');
    if (!boardContainer || !board) return;
    
    if (!highlightCanvas) {
        const canvas = document.createElement('canvas');
        canvas.id = 'boardHighlightsCanvas';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '5';
        canvas.style.pointerEvents = 'none';
        boardContainer.appendChild(canvas);
        
        highlightCanvas = canvas;
        highlightCtx = canvas.getContext('2d');
    }
    
    resizeHighlights();
}

function updateSquarePositions() {
    const board = document.getElementById('chessBoard');
    if (!board || !highlightCanvas) return;
    
    const boardRect = board.getBoundingClientRect();
    squarePositions = {};
    
    const squares = board.querySelectorAll('.square');
    squares.forEach((sq) => {
        const name = sq.dataset.square;
        if (!name) return;
        
        const r = sq.getBoundingClientRect();
        squarePositions[name] = {
            x: r.left - boardRect.left,
            y: r.top - boardRect.top,
            width: r.width,
            height: r.height,
            cx: r.left - boardRect.left + r.width / 2,
            cy: r.top - boardRect.top + r.height / 2
        };
    });
}

function resizeHighlights() {
    const board = document.getElementById('chessBoard');
    if (!board || !highlightCanvas) return;
    
    const rect = board.getBoundingClientRect();
    highlightCanvas.width = rect.width;
    highlightCanvas.height = rect.height;
    
    updateSquarePositions();
    drawHighlights();
}

function drawHighlights() {
    if (!highlightCtx || !highlightCanvas) return;
    
    highlightCtx.clearRect(0, 0, highlightCanvas.width, highlightCanvas.height);
    
    // Red squares
    redSquares.forEach((square) => {
        const pos = squarePositions[square];
        if (!pos) return;
        
        highlightCtx.fillStyle = RED_SQUARE_COLOR;
        highlightCtx.fillRect(pos.x, pos.y, pos.width, pos.height);
    });
    
    // Arrows
    arrows.forEach(({ from, to, color }) => {
        const fromPos = squarePositions[from];
        const toPos = squarePositions[to];
        if (!fromPos || !toPos) return;
        
        drawArrow(fromPos.cx, fromPos.cy, toPos.cx, toPos.cy, color);
    });
}

function drawArrow(fromX, fromY, toX, toY, color) {
    if (!highlightCtx) return;
    
    const ctx = highlightCtx;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return;
    
    const angle = Math.atan2(dy, dx);
    const headLength = 17;
    const shaftWidth = 10;
    const arrowColor = color || DEFAULT_ARROW_COLOR;
    
    const tipX = toX;
    const tipY = toY;
    const baseX = tipX - Math.cos(angle) * headLength;
    const baseY = tipY - Math.sin(angle) * headLength;
    
    ctx.strokeStyle = arrowColor;
    ctx.fillStyle = arrowColor;
    ctx.lineWidth = shaftWidth;
    ctx.lineCap = 'straight';
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(baseX, baseY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
        baseX - headLength * Math.cos(angle - Math.PI / 5),
        baseY - headLength * Math.sin(angle - Math.PI / 5)
    );
    ctx.lineTo(
        baseX - headLength * Math.cos(angle + Math.PI / 5),
        baseY - headLength * Math.sin(angle + Math.PI / 5)
    );
    ctx.closePath();
    ctx.fill();
}

// Public API
function addArrow(from, to) {
    if (!from || !to || from === to) return;
    if (!arrows.some((a) => a.from === from && a.to === to)) {
        arrows.push({ from, to, color: DEFAULT_ARROW_COLOR });
        drawHighlights();
    }
}

function removeArrow(from, to) {
    const before = arrows.length;
    arrows = arrows.filter((a) => !(a.from === from && a.to === to));
    if (arrows.length !== before) {
        drawHighlights();
    }
}

function clearArrows() {
    if (!arrows.length) return;
    arrows = [];
    drawHighlights();
}

function toggleRedSquare(square) {
    if (!square) return;
    
    if (redSquares.has(square)) {
        redSquares.delete(square);
    } else {
        redSquares.add(square);
    }
    
    drawHighlights();
}

function clearRedSquares() {
    if (!redSquares.size) return;
    redSquares.clear();
    drawHighlights();
}

function clearSuggestionArrows() {
    if (!arrows.length) return;
    arrows = arrows.filter((a) => !a.isSuggestion);
    drawHighlights();
}

function addSuggestionArrow(from, to) {
    if (!from || !to || from === to) return;
    
    // Remove any existing suggestion arrows and arrows on the same segment
    arrows = arrows.filter((a) => !a.isSuggestion && !(a.from === from && a.to === to));
    arrows.push({ from, to, color: SUGGESTION_ARROW_COLOR, isSuggestion: true });
    drawHighlights();
}

function handleRightMouseDown(e) {
    if (e.button !== 2) return;
    
    rightMouseDrag = {
        startSquare: getSquareFromPoint(e.clientX, e.clientY),
        startX: e.clientX,
        startY: e.clientY,
        moved: false
    };
    
    e.preventDefault();
}

function handleRightMouseMove(e) {
    if (!rightMouseDrag) return;
    
    if ((e.buttons & 2) === 0) {
        rightMouseDrag = null;
        return;
    }
    
    const dx = e.clientX - rightMouseDrag.startX;
    const dy = e.clientY - rightMouseDrag.startY;
    if (!rightMouseDrag.moved && Math.hypot(dx, dy) > 4) {
        rightMouseDrag.moved = true;
    }
}

function handleRightMouseUp(e) {
    if (e.button !== 2 || !rightMouseDrag) return;
    
    const endSquare = getSquareFromPoint(e.clientX, e.clientY);
    
    if (rightMouseDrag.moved && rightMouseDrag.startSquare && endSquare && endSquare !== rightMouseDrag.startSquare) {
        const exists = arrows.some(
            (a) => a.from === rightMouseDrag.startSquare && a.to === endSquare
        );
        if (exists) {
            removeArrow(rightMouseDrag.startSquare, endSquare);
        } else {
            addArrow(rightMouseDrag.startSquare, endSquare);
        }
    } else {
        if (endSquare) {
            toggleRedSquare(endSquare);
        } else {
            clearArrows();
            clearRedSquares();
        }
    }
    
    rightMouseDrag = null;
    e.preventDefault();
}

function init() {
    document.getElementById('newGameBtn').addEventListener('click', newGame);
    document.getElementById('suggestBtn').addEventListener('click', suggestMove);
    document.getElementById('flipBtn').addEventListener('click', flipBoard);
    document.getElementById('depthSelect').addEventListener('change', (e) => {
        gameState.aiDepth = parseInt(e.target.value);
    });
    document.getElementById('colorSelect').addEventListener('change', (e) => {
        gameState.playerColor = e.target.value;
        gameState.isFlipped = e.target.value === 'black';
    });
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    document.addEventListener('mousedown', handleRightMouseDown);
    document.addEventListener('mousemove', handleRightMouseMove);
    document.addEventListener('mouseup', handleRightMouseUp);
    window.addEventListener('resize', resizeHighlights);
    
    const boardContainer = document.querySelector('.board-container');
    if (boardContainer) {
        boardContainer.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    setupBoardHighlights();
    
    newGame();
}

async function newGame() {
    const playerColor = document.getElementById('colorSelect').value;
    gameState.playerColor = playerColor;
    gameState.isFlipped = playerColor === 'black';
    gameState.selectedSquare = null;
    gameState.legalMoves = [];
    gameState.lastMove = null;
    cleanupDrag();
    
    try {
        const response = await fetch('/api/new-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_color: playerColor })
        });
        
        const state = await response.json();
        updateGameState(state);
        
        if (playerColor === 'black' && !state.is_game_over) {
            await makeAIMove();
        }
    } catch (error) {
        console.error('Error starting new game:', error);
    }
}

function updateGameState(state) {
    gameState.fen = state.fen;
    gameState.moveHistory = state.move_history || [];
    gameState.inCheck = !!state.in_check;
    
    clearSuggestionArrows();
    
    if (state.move_history && state.move_history.length > 0) {
        gameState.lastMove = state.move_history[state.move_history.length - 1];
    } else {
        gameState.lastMove = null;
    }
    
    renderBoard();
    updateEvalBar(state.evaluation);
    updateMoveTable(state.pgn);
    updateStatus(state);
    updateButtons(state);
}

function renderBoard() {
    const board = document.getElementById('chessBoard');
    board.innerHTML = '';
    
    const position = parseFEN(gameState.fen);
    
    const ranks = gameState.isFlipped ? [...RANKS].reverse() : RANKS;
    const files = gameState.isFlipped ? [...FILES].reverse() : FILES;
    
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const file = files[f];
            const rank = ranks[r];
            const square = file + rank;
            
            const squareEl = document.createElement('div');
            squareEl.className = 'square';
            squareEl.dataset.square = square;
            
            const isLight = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 0;
            squareEl.classList.add(isLight ? 'light' : 'dark');
            
            if (gameState.selectedSquare === square) {
                squareEl.classList.add('selected');
            }
            
            if (gameState.legalMoves.includes(square)) {
                const piece = position[square];
                squareEl.classList.add(piece ? 'legal-capture' : 'legal-move');
            }
            
            if (gameState.lastMove) {
                const from = gameState.lastMove.substring(0, 2);
                const to = gameState.lastMove.substring(2, 4);
                if (square === from || square === to) {
                    squareEl.classList.add('last-move');
                }
            }
            
            const piece = position[square];
            if (piece) {
                const pieceEl = document.createElement('img');
                pieceEl.className = 'piece';
                pieceEl.classList.add(piece === piece.toUpperCase() ? 'white' : 'black');
                pieceEl.src = getPieceImageUrl(piece);
                pieceEl.alt = piece;
                pieceEl.dataset.square = square;
                pieceEl.dataset.piece = piece;
                
                if (isPieceOwnedByPlayer(piece)) {
                    pieceEl.draggable = true;
                    pieceEl.addEventListener('mousedown', (e) => handleDragStart(e, square, piece));
                    pieceEl.addEventListener('touchstart', (e) => handleTouchStart(e, square, piece), { passive: false });
                }
                
                squareEl.appendChild(pieceEl);
                
                if (piece.toLowerCase() === 'k') {
                    const fenParts = gameState.fen.split(' ');
                    const turn = fenParts[1];
                    const isWhiteKing = piece === 'K';
                    const isWhiteTurn = turn === 'w';
                    
                    if ((isWhiteKing && isWhiteTurn) || (!isWhiteKing && !isWhiteTurn)) {
                        if (gameState.fen.includes('+') || isInCheck()) {
                            squareEl.classList.add('in-check');
                        }
                    }
                }
            }
            
            squareEl.addEventListener('click', () => handleSquareClick(square));
            squareEl.addEventListener('dragover', (e) => e.preventDefault());
            squareEl.addEventListener('drop', (e) => handleDrop(e, square));
            
            board.appendChild(squareEl);
        }
    }
    
    resizeHighlights();
}

async function handleDragStart(e, square, piece) {
    if (e.button !== 0) return;
    if (gameState.isThinking || !isPlayerTurn() || gameState.moveInProgress) return;
    
    e.preventDefault();
    
    gameState.isDragging = true;
    gameState.draggedFrom = square;
    gameState.draggedPiece = piece;
    
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    const ghostImg = document.createElement('img');
    ghostImg.className = `piece ${piece === piece.toUpperCase() ? 'white' : 'black'}`;
    ghostImg.src = getPieceImageUrl(piece);
    ghostImg.alt = piece;
    ghost.appendChild(ghostImg);
    document.body.appendChild(ghost);
    gameState.dragGhost = ghost;
    
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    
    await selectSquare(square);
}

async function handleTouchStart(e, square, piece) {
    if (gameState.isThinking || !isPlayerTurn() || gameState.moveInProgress) return;
    
    e.preventDefault();
    
    const touch = e.touches[0];
    
    gameState.isDragging = true;
    gameState.draggedFrom = square;
    gameState.draggedPiece = piece;
    
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    const ghostImg = document.createElement('img');
    ghostImg.className = `piece ${piece === piece.toUpperCase() ? 'white' : 'black'}`;
    ghostImg.src = getPieceImageUrl(piece);
    ghostImg.alt = piece;
    ghost.appendChild(ghostImg);
    document.body.appendChild(ghost);
    gameState.dragGhost = ghost;
    
    ghost.style.left = `${touch.clientX}px`;
    ghost.style.top = `${touch.clientY}px`;
    
    await selectSquare(square);
}

function handleDragMove(e) {
    if (!gameState.dragGhost) return;
    
    gameState.dragGhost.style.left = `${e.clientX}px`;
    gameState.dragGhost.style.top = `${e.clientY}px`;
}

function handleTouchMove(e) {
    if (!gameState.dragGhost) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    
    gameState.dragGhost.style.left = `${touch.clientX}px`;
    gameState.dragGhost.style.top = `${touch.clientY}px`;
}

async function handleDragEnd(e) {
    if (!gameState.draggedFrom || gameState.moveInProgress) {
        cleanupDrag();
        return;
    }
    
    const targetSquare = getSquareFromPoint(e.clientX, e.clientY);
    const fromSquare = gameState.draggedFrom;
    
    cleanupDrag();
    
    if (targetSquare && gameState.legalMoves.includes(targetSquare)) {
        gameState.moveInProgress = true;
        try {
            await makeMove(fromSquare, targetSquare);
        } finally {
            gameState.moveInProgress = false;
        }
    } else {
        renderBoard();
    }
}

async function handleTouchEnd(e) {
    if (!gameState.draggedFrom || gameState.moveInProgress) {
        cleanupDrag();
        return;
    }
    
    const touch = e.changedTouches[0];
    const targetSquare = getSquareFromPoint(touch.clientX, touch.clientY);
    const fromSquare = gameState.draggedFrom;
    
    cleanupDrag();
    
    if (targetSquare && gameState.legalMoves.includes(targetSquare)) {
        gameState.moveInProgress = true;
        try {
            await makeMove(fromSquare, targetSquare);
        } finally {
            gameState.moveInProgress = false;
        }
    } else {
        renderBoard();
    }
}

async function handleDrop(e, targetSquare) {
    e.preventDefault();
    
    if (!gameState.draggedFrom || gameState.moveInProgress) {
        cleanupDrag();
        return;
    }
    
    const fromSquare = gameState.draggedFrom;
    cleanupDrag();
    
    if (gameState.legalMoves.includes(targetSquare)) {
        gameState.moveInProgress = true;
        try {
            await makeMove(fromSquare, targetSquare);
        } finally {
            gameState.moveInProgress = false;
        }
    }
}

function getSquareFromPoint(x, y) {
    const board = document.getElementById('chessBoard');
    const rect = board.getBoundingClientRect();
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        return null;
    }
    
    const squareSize = rect.width / 8;
    const fileIndex = Math.floor((x - rect.left) / squareSize);
    const rankIndex = Math.floor((y - rect.top) / squareSize);
    
    if (fileIndex < 0 || fileIndex > 7 || rankIndex < 0 || rankIndex > 7) {
        return null;
    }
    
    const files = gameState.isFlipped ? [...FILES].reverse() : FILES;
    const ranks = gameState.isFlipped ? [...RANKS].reverse() : RANKS;
    
    return files[fileIndex] + ranks[rankIndex];
}

function cleanupDrag() {
    if (gameState.dragGhost) {
        gameState.dragGhost.remove();
        gameState.dragGhost = null;
    }
    gameState.draggedFrom = null;
    gameState.draggedPiece = null;
    gameState.isDragging = false;
}

function isPlayerTurn() {
    const fenParts = gameState.fen.split(' ');
    const turn = fenParts[1];
    return (turn === 'w' && gameState.playerColor === 'white') ||
           (turn === 'b' && gameState.playerColor === 'black');
}

function parseFEN(fen) {
    const position = {};
    const parts = fen.split(' ');
    const rows = parts[0].split('/');
    
    for (let r = 0; r < 8; r++) {
        let f = 0;
        for (const char of rows[r]) {
            if (isNaN(char)) {
                const square = FILES[f] + RANKS[r];
                position[square] = char;
                f++;
            } else {
                f += parseInt(char);
            }
        }
    }
    
    return position;
}

function isInCheck() {
    return gameState.inCheck;
}

async function handleSquareClick(square) {
    if (gameState.isThinking) return;
    if (gameState.draggedFrom) return;
    
    const position = parseFEN(gameState.fen);
    const piece = position[square];
    
    if (!isPlayerTurn()) return;
    
    if (gameState.selectedSquare) {
        if (gameState.legalMoves.includes(square)) {
            await makeMove(gameState.selectedSquare, square);
        } else if (piece && isPieceOwnedByPlayer(piece)) {
            await selectSquare(square);
        } else {
            gameState.selectedSquare = null;
            gameState.legalMoves = [];
            renderBoard();
        }
    } else if (piece && isPieceOwnedByPlayer(piece)) {
        await selectSquare(square);
    }
}

function isPieceOwnedByPlayer(piece) {
    const isWhitePiece = piece === piece.toUpperCase();
    return (isWhitePiece && gameState.playerColor === 'white') ||
           (!isWhitePiece && gameState.playerColor === 'black');
}

async function selectSquare(square) {
    try {
        const response = await fetch(`/api/legal-moves/${square}`);
        const data = await response.json();
        
        gameState.selectedSquare = square;
        gameState.legalMoves = data.legal_moves || [];
        renderBoard();
    } catch (error) {
        console.error('Error getting legal moves:', error);
    }
}

async function makeMove(from, to) {
    const move = from + to;
    
    const position = parseFEN(gameState.fen);
    const piece = position[from];
    let promotionPiece = '';
    
    if (piece && piece.toLowerCase() === 'p') {
        const toRank = to[1];
        if ((piece === 'P' && toRank === '8') || (piece === 'p' && toRank === '1')) {
            promotionPiece = 'q';
        }
    }
    
    const fullMove = move + promotionPiece;
    
    try {
        const response = await fetch('/api/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ move: fullMove })
        });
        
        const state = await response.json();
        
        if (state.error) {
            console.error('Move error:', state.error);
            return;
        }
        
        gameState.selectedSquare = null;
        gameState.legalMoves = [];
        updateGameState(state);
        
        if (!state.is_game_over) {
            await makeAIMove();
        }
    } catch (error) {
        console.error('Error making move:', error);
    }
}

async function animateMove(moveUci, state) {
    const from = moveUci.substring(0, 2);
    const to = moveUci.substring(2, 4);
    
    const board = document.getElementById('chessBoard');
    if (!board) {
        updateGameState(state);
        return;
    }
    
    const fromSquareEl = board.querySelector(`.square[data-square="${from}"]`);
    const toSquareEl = board.querySelector(`.square[data-square="${to}"]`);
    
    if (!fromSquareEl || !toSquareEl) {
        updateGameState(state);
        return;
    }
    
    const pieceImg = fromSquareEl.querySelector('.piece');
    if (!pieceImg) {
        updateGameState(state);
        return;
    }
    
    const destPieceImg = toSquareEl.querySelector('.piece');
    
    const fromRect = pieceImg.getBoundingClientRect();
    const toRect = toSquareEl.getBoundingClientRect();
    
    const ghost = pieceImg.cloneNode(true);
    ghost.classList.add('ai-move-ghost');
    ghost.style.position = 'fixed';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '1100';
    ghost.style.left = `${fromRect.left + fromRect.width / 2}px`;
    ghost.style.top = `${fromRect.top + fromRect.height / 2}px`;
    ghost.style.width = `${fromRect.width}px`;
    ghost.style.height = `${fromRect.height}px`;
    ghost.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(ghost);
    
    pieceImg.style.opacity = '0';
    if (destPieceImg) {
        destPieceImg.style.opacity = '0';
    }
    
    requestAnimationFrame(() => {
        ghost.style.transition = 'left 0.4s ease-out, top 0.4s ease-out';
        ghost.style.left = `${toRect.left + toRect.width / 2}px`;
        ghost.style.top = `${toRect.top + toRect.height / 2}px`;
    });
    
    await new Promise((resolve) => setTimeout(resolve, 420));
    
    ghost.remove();
    updateGameState(state);
}

async function makeAIMove() {
    setThinking(true);
    
    try {
        const response = await fetch(`/api/ai-move/${gameState.aiDepth}`);
        const state = await response.json();
        
        if (!state.error) {
            if (state.ai_move) {
                await animateMove(state.ai_move, state);
            } else {
                updateGameState(state);
            }
        }
    } catch (error) {
        console.error('Error getting AI move:', error);
    } finally {
        setThinking(false);
    }
}

async function suggestMove() {
    if (gameState.isThinking || gameState.moveInProgress) return;
    if (!isPlayerTurn()) return;
    
    setThinking(true);
    
    try {
        const response = await fetch(`/api/suggest-move/${gameState.aiDepth}`);
        const state = await response.json();
        
        if (state.error || !state.suggested_move) {
            console.error('Suggest move error:', state.error || 'No suggested_move returned');
            return;
        }
        
        updateGameState(state);
        
        const move = state.suggested_move;
        const from = move.substring(0, 2);
        const to = move.substring(2, 4);
        
        addSuggestionArrow(from, to);
    } catch (error) {
        console.error('Error suggesting move:', error);
    } finally {
        setThinking(false);
    }
}

function setThinking(thinking) {
    gameState.isThinking = thinking;
    const overlay = document.getElementById('thinkingOverlay');
    overlay.classList.toggle('active', thinking);
}

async function undoMove() {
    if (gameState.isThinking) return;
    
    try {
        const response = await fetch('/api/undo', {
            method: 'POST'
        });
        
        const state = await response.json();
        
        if (!state.error) {
            gameState.selectedSquare = null;
            gameState.legalMoves = [];
            updateGameState(state);
        }
    } catch (error) {
        console.error('Error undoing move:', error);
    }
}

function flipBoard() {
    gameState.isFlipped = !gameState.isFlipped;
    renderBoard();
}

function updateEvalBar(evaluation) {
    const evalWhite = document.getElementById('evalBarWhite');
    const evalBlack = document.getElementById('evalBarBlack');
    const evalValue = document.getElementById('evalValue');
    
    const clampedEval = Math.max(-10, Math.min(10, evaluation));
    
    const whitePercentage = 50 + (clampedEval * 5);
    const blackPercentage = 100 - whitePercentage;
    
    evalWhite.style.height = `${whitePercentage}%`;
    evalBlack.style.height = `${blackPercentage}%`;
    
    const displayEval = evaluation > 0 ? `+${evaluation.toFixed(1)}` : evaluation.toFixed(1);
    evalValue.textContent = displayEval;
    
    if (evaluation > 0.5) {
        evalValue.style.color = '#4ade80';
    } else if (evaluation < -0.5) {
        evalValue.style.color = '#f87171';
    } else {
        evalValue.style.color = '#fff';
    }
}

function updateMoveTable(pgn) {
    const movesTable = document.getElementById('movesTable');
    movesTable.innerHTML = '';
    
    if (!pgn) return;
    
    const tokens = pgn.split(' ');
    let currentRow = null;
    let moveIndex = 0;
    
    for (const token of tokens) {
        if (token.endsWith('.')) {
            currentRow = document.createElement('div');
            currentRow.className = 'move-row';
            
            const moveNum = document.createElement('span');
            moveNum.className = 'move-number';
            moveNum.textContent = token;
            currentRow.appendChild(moveNum);
            
            movesTable.appendChild(currentRow);
        } else if (currentRow) {
            const isWhiteMove = currentRow.children.length === 1;
            const moveSpan = document.createElement('span');
            moveSpan.className = isWhiteMove ? 'move-white' : 'move-black';
            moveSpan.textContent = token;
            
            moveIndex++;
            if (moveIndex === gameState.moveHistory.length) {
                moveSpan.classList.add('last-move');
                currentRow.classList.add('highlight');
            }
            
            currentRow.appendChild(moveSpan);
        }
    }
    
    movesTable.scrollTop = movesTable.scrollHeight;
}

function updateStatus(state) {
    const turnIndicator = document.getElementById('turnIndicator');
    const gameStatus = document.getElementById('gameStatus');
    const gameResult = document.getElementById('gameResult');
    
    turnIndicator.textContent = state.turn === 'white' ? 'White to move' : 'Black to move';
    
    if (state.in_check && !state.is_game_over) {
        gameStatus.textContent = 'Check!';
    } else {
        gameStatus.textContent = '';
    }
    
    if (state.is_game_over && state.result) {
        gameResult.textContent = state.result;
        gameResult.classList.add('active');
        
        gameResult.classList.remove('white-wins', 'black-wins', 'draw');
        if (state.result.startsWith('1-0')) {
            gameResult.classList.add('white-wins');
        } else if (state.result.startsWith('0-1')) {
            gameResult.classList.add('black-wins');
        } else {
            gameResult.classList.add('draw');
        }
    } else {
        gameResult.classList.remove('active');
    }
}

function updateButtons(state) {
    // Button state updates removed
}

document.addEventListener('DOMContentLoaded', init);
