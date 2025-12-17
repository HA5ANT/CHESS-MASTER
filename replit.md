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
│   ├── js/
│   │   └── chess.js    # Frontend game logic
│   └── favicon.svg     # Chess piece favicon
└── replit.md           # This file
```

## Features
- **AI Opponent**: Minimax with alpha-beta pruning (depth 1-5) and quiescence search
- **Opening Books**: English Opening (White), Modern Defense (Black) with thematic move fallback
- **Position Evaluation**: Material, piece-square tables, mobility, king safety
- **Session Management**: Multiple users can play simultaneously via Flask sessions
- **Responsive UI**: Works on desktop and mobile with black theme
- **Move History**: Full PGN notation with highlighted last move
- **Evaluation Bar**: Visual representation of position assessment (-10 to +10 scale)
- **Drag-and-Drop**: Full drag-and-drop piece movement with touch support
- **Click-to-Move**: Alternative click-based move input
- **AI Thinking Indicator**: Loading overlay when AI is calculating

## API Endpoints
- `GET /` - Main game UI
- `POST /api/new-game` - Start new game with player color selection
- `GET /api/state` - Get current game state
- `POST /api/move` - Make a player move
- `GET /api/ai-move/<depth>` - Get and make AI move
- `GET /move/<depth>/<fen>` - Get best move for any FEN position
- `GET /eval` - Get current position evaluation
- `GET /eval/<fen>` - Get evaluation for specific FEN position
- `POST /api/undo` - Undo last move(s)
- `POST /api/redo` - Redo undone move
- `GET /api/legal-moves/<square>` - Get legal moves from a square
- `GET /api/pgn` - Get game in PGN format

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
- Safety threshold prevents AI from making blunders (below -200 centipawns)
- Thematic move system maintains opening character even when out of book

## Recent Changes
- December 2024: Initial implementation with full feature set
  - Chess engine with minimax, alpha-beta pruning, and quiescence search
  - Opening books for English Opening and Modern Defense
  - Thematic move fallback for handling deviations
  - Safety threshold to prevent AI blunders
  - Responsive web UI with drag-and-drop
  - Session-based multiplayer support
