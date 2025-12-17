const PIECES = {
    'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔',
    'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚'
};

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
    moveHistory: []
};

function init() {
    document.getElementById('newGameBtn').addEventListener('click', newGame);
    document.getElementById('undoBtn').addEventListener('click', undoMove);
    document.getElementById('flipBtn').addEventListener('click', flipBoard);
    document.getElementById('depthSelect').addEventListener('change', (e) => {
        gameState.aiDepth = parseInt(e.target.value);
    });
    document.getElementById('colorSelect').addEventListener('change', (e) => {
        gameState.playerColor = e.target.value;
        gameState.isFlipped = e.target.value === 'black';
    });
    
    newGame();
}

async function newGame() {
    const playerColor = document.getElementById('colorSelect').value;
    gameState.playerColor = playerColor;
    gameState.isFlipped = playerColor === 'black';
    gameState.selectedSquare = null;
    gameState.legalMoves = [];
    gameState.lastMove = null;
    
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
                const pieceEl = document.createElement('span');
                pieceEl.className = 'piece';
                pieceEl.classList.add(piece === piece.toUpperCase() ? 'white' : 'black');
                pieceEl.textContent = PIECES[piece];
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
            board.appendChild(squareEl);
        }
    }
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
    return gameState.fen.includes('+');
}

async function handleSquareClick(square) {
    if (gameState.isThinking) return;
    
    const position = parseFEN(gameState.fen);
    const piece = position[square];
    const fenParts = gameState.fen.split(' ');
    const turn = fenParts[1];
    const isPlayerTurn = (turn === 'w' && gameState.playerColor === 'white') ||
                         (turn === 'b' && gameState.playerColor === 'black');
    
    if (!isPlayerTurn) return;
    
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

async function makeAIMove() {
    setThinking(true);
    
    try {
        const response = await fetch(`/api/ai-move/${gameState.aiDepth}`);
        const state = await response.json();
        
        if (!state.error) {
            updateGameState(state);
        }
    } catch (error) {
        console.error('Error getting AI move:', error);
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
    const undoBtn = document.getElementById('undoBtn');
    undoBtn.disabled = !state.can_undo || state.is_game_over;
}

document.addEventListener('DOMContentLoaded', init);
