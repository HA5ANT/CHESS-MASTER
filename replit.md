# Chess Engine Application

## Overview
A full-featured chess application with Python/Flask backend and interactive web UI. Features AI opponent with opening book repertoire, position evaluation, and adjustable difficulty.

## Project Structure
```
/
├── app.py              # Flask application with API routes
├── chess_engine.py     # AI engine with minimax search and opening books
├── templates/
│   └── index.html      # Main HTML template
├── static/
│   ├── css/
│   │   └── style.css   # Application styling
│   └── js/
│       └── chess.js    # Frontend game logic
└── replit.md           # This file
```

## Features
- **AI Opponent**: Minimax with alpha-beta pruning (depth 1-5)
- **Opening Books**: English Opening (White), Modern Defense (Black)
- **Position Evaluation**: Material, piece-square tables, mobility, king safety
- **Session Management**: Multiple users can play simultaneously
- **Responsive UI**: Works on desktop and mobile
- **Move History**: Full PGN notation with highlighted moves
- **Evaluation Bar**: Visual representation of position assessment

## API Endpoints
- `GET /` - Main game UI
- `POST /api/new-game` - Start new game with player color selection
- `GET /api/state` - Get current game state
- `POST /api/move` - Make a player move
- `GET /api/ai-move/<depth>` - Get and make AI move
- `GET /move/<depth>/<fen>` - Get best move for any FEN position
- `GET /eval` - Get current position evaluation
- `POST /api/undo` - Undo last move(s)
- `GET /api/legal-moves/<square>` - Get legal moves from a square

## Running the Application
```bash
python app.py
```
The server runs on port 5000.

## Technical Notes
- Uses python-chess library for move generation and validation
- Session-based game state for multi-user support
- FEN input validation on all relevant endpoints
- 5-second computation time limit for AI moves

## Recent Changes
- Initial implementation (December 2024)
