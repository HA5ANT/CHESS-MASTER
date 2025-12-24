# Chess Master

A full-featured web-based chess application with an AI opponent built using Flask and the `python-chess` library. Play against a computer opponent with adjustable difficulty levels, move suggestions, and a modern user interface.

## Features

### Game Features
- **AI Opponent**: Play against a computer opponent with adjustable depth (1-5 levels)
- **Opening Books**: AI uses opening theory (English Opening as White, Modern Defense as Black)
- **Move Evaluation**: Real-time position evaluation with visual evaluation bar
- **Move Suggestions**: Get AI suggestions for your moves
- **Move History**: View complete game history in PGN notation
- **Undo/Redo**: Take back moves and redo them
- **Legal Move Highlighting**: Visual indicators for legal moves and captures
- **Check Detection**: Visual indicators when the king is in check
- **Game Over Detection**: Automatically detects checkmate, stalemate, and draw conditions

### User Interface
- **Drag and Drop**: Intuitive piece movement with drag-and-drop support
- **Touch Support**: Full touch support for mobile devices
- **Board Flipping**: Flip the board to view from either side
- **Visual Highlights**: 
  - Last move highlighting
  - Legal move indicators
  - Check indicators
  - Custom arrows and red squares (right-click to draw)
- **Evaluation Bar**: Visual representation of position evaluation
- **Responsive Design**: Modern, dark-themed UI that works on various screen sizes

### AI Engine
- **Minimax Algorithm**: Advanced search algorithm with alpha-beta pruning
- **Quiescence Search**: Extended search for tactical sequences
- **Position Evaluation**: 
  - Piece-square tables for all pieces
  - Mobility evaluation
  - King safety evaluation
  - Endgame detection
- **Move Ordering**: Optimized move ordering for better pruning
- **Safety Checks**: AI avoids moves that lead to losing positions

## Installation

### Prerequisites
- Python 3.7 or higher
- pip (Python package manager)

### Setup

1. **Clone the repository** (or navigate to the project directory):
   ```bash
   cd Chess-Master
   ```

2. **Install dependencies**:
   ```bash
   pip install flask python-chess
   ```

3. **Run the application**:
   ```bash
   python app.py
   ```

   Or using the main entry point:
   ```bash
   python main.py
   ```

4. **Access the application**:
   Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

## Usage

### Starting a New Game
1. Select your color (White or Black) from the dropdown
2. Click "New Game" to start
3. If playing as Black, the AI will make the first move

### Making Moves
- **Click to Move**: Click on a piece, then click on a destination square
- **Drag and Drop**: Click and drag a piece to its destination
- **Touch**: On mobile devices, touch and drag pieces

### Controls
- **New Game**: Start a fresh game
- **Take Back**: Undo the last move (removes both player and AI moves)
- **Suggest Move**: Get an AI suggestion for your next move (shown as a green arrow)
- **Flip Board**: Rotate the board 180 degrees
- **AI Depth**: Adjust the AI difficulty (1 = Fast/Weak, 5 = Slow/Strong)

### Advanced Features
- **Right-Click Drawing**: 
  - Right-click and drag to draw arrows between squares
  - Right-click on a square to mark it with a red square
  - Right-click on empty space to clear all annotations
- **Move History**: View the complete game in PGN notation in the side panel

## API Endpoints

The application provides a RESTful API for game management:

### Game Management
- `POST /api/new-game` - Start a new game
  - Body: `{"player_color": "white" | "black"}`
- `GET /api/state` - Get current game state
- `POST /api/undo` - Undo the last move
- `POST /api/redo` - Redo a move

### Move Making
- `POST /api/move` - Make a move
  - Body: `{"move": "e2e4"}` (UCI notation)
- `GET /api/ai-move/<depth>` - Get and execute AI move
- `GET /api/suggest-move/<depth>` - Get move suggestion without executing

### Analysis
- `GET /api/legal-moves/<square>` - Get legal moves for a square (e.g., `/api/legal-moves/e2`)
- `GET /eval` - Get current position evaluation
- `GET /eval/<fen>` - Evaluate a specific FEN position
- `GET /move/<depth>/<fen>` - Get best move for a FEN position
- `GET /api/pgn` - Get game in PGN notation

### Assets
- `GET /pieces/<filename>` - Serve chess piece images

## Project Structure

```
Chess-Master/
├── app.py                 # Flask application and API routes
├── chess_engine.py        # AI engine with minimax, evaluation, and opening books
├── main.py               # Entry point (optional)
├── ChessPieces/          # Chess piece images (PNG files)
│   ├── wK.png, wQ.png, wR.png, wB.png, wN.png, wP.png
│   └── bK.png, bQ.png, bR.png, bB.png, bN.png, bP.png
├── static/
│   ├── css/
│   │   └── style.css     # Application styles
│   ├── js/
│   │   └── chess.js      # Frontend game logic and UI
│   └── favicon.svg       # Favicon
└── templates/
    └── index.html        # Main HTML template
```

## Technologies Used

### Backend
- **Flask**: Web framework for the application server
- **python-chess**: Chess library for move validation, board representation, and game logic

### Frontend
- **Vanilla JavaScript**: No frameworks - pure JavaScript for game logic
- **HTML5/CSS3**: Modern web standards
- **Canvas API**: For drawing arrows and highlights on the board

### AI Algorithm
- **Minimax**: Decision-making algorithm for optimal moves
- **Alpha-Beta Pruning**: Optimization to reduce search space
- **Quiescence Search**: Extended search for tactical positions
- **Piece-Square Tables**: Positional evaluation based on piece placement
- **Opening Books**: Pre-defined opening sequences for better early-game play

## Configuration

### Environment Variables
- `SESSION_SECRET`: Secret key for Flask sessions (defaults to a development key if not set)

### AI Settings
The AI engine can be configured in `chess_engine.py`:
- `max_time`: Maximum time for AI to think (default: 5.0 seconds)
- `safety_threshold`: Minimum evaluation score for AI moves (default: -200)

## Game Rules

The application follows standard chess rules:
- All standard piece movements
- Castling (kingside and queenside)
- En passant captures
- Pawn promotion (defaults to queen)
- Check and checkmate detection
- Stalemate detection
- Draw conditions (insufficient material, fifty-move rule, threefold repetition)

## License

This project is open source and available for educational and personal use.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## Acknowledgments

- Built with the `python-chess` library for chess logic
- Chess piece images included in the project
- AI algorithm inspired by classic chess engine design principles

