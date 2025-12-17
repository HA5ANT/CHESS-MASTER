"""
Flask Chess Application
Main application server with session-based game state management.
"""

import os
import uuid
from flask import Flask, render_template, jsonify, request, session, send_from_directory
from chess_engine import ChessEngine
import chess

app = Flask(__name__)
app.secret_key = os.environ.get('SESSION_SECRET', 'chess-app-secret-key-dev')

game_sessions = {}

def get_engine() -> ChessEngine:
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    
    session_id = session['session_id']
    
    if session_id not in game_sessions:
        game_sessions[session_id] = ChessEngine()
    
    return game_sessions[session_id]


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/pieces/<path:filename>')
def serve_piece(filename: str):
    pieces_dir = os.path.join(app.root_path, 'ChessPieces')
    return send_from_directory(pieces_dir, filename)


@app.route('/api/new-game', methods=['POST'])
def new_game():
    engine = get_engine()
    engine.reset()
    
    data = request.get_json() or {}
    player_color = data.get('player_color', 'white')
    
    if player_color == 'white':
        engine.set_ai_color(chess.BLACK)
    else:
        engine.set_ai_color(chess.WHITE)
    
    return jsonify(engine.get_state())


@app.route('/api/state')
def get_state():
    engine = get_engine()
    return jsonify(engine.get_state())


@app.route('/api/move', methods=['POST'])
def make_move():
    engine = get_engine()
    data = request.get_json()
    
    if not data or 'move' not in data:
        return jsonify({"error": "No move provided"}), 400
    
    move_uci = data['move']
    
    if not engine.make_move(move_uci):
        return jsonify({"error": "Invalid move"}), 400
    
    return jsonify(engine.get_state())


@app.route('/api/ai-move/<int:depth>')
def get_ai_move(depth: int):
    engine = get_engine()
    
    depth = max(1, min(5, depth))
    
    best_move = engine.get_best_move(depth)
    
    if best_move:
        engine.make_move(best_move)
        state = engine.get_state()
        state['ai_move'] = best_move
        return jsonify(state)
    else:
        return jsonify({"error": "No valid move found"}), 400


@app.route('/api/suggest-move/<int:depth>')
def suggest_move(depth: int):
    engine = get_engine()
    
    depth = max(1, min(5, depth))
    
    original_ai_color = engine.ai_color
    try:
        # Treat the side to move as the "AI" for evaluation safety
        engine.ai_color = engine.board.turn
        best_move = engine.get_best_move(depth)
    finally:
        engine.ai_color = original_ai_color
    
    if best_move:
        state = engine.get_state()
        state['suggested_move'] = best_move
        return jsonify(state)
    else:
        return jsonify({"error": "No valid move found"}), 400


@app.route('/move/<int:depth>/<path:fen>')
def get_best_move_for_fen(depth: int, fen: str):
    engine = get_engine()
    
    depth = max(1, min(5, depth))
    
    if not engine.is_valid_fen(fen):
        return jsonify({"error": "Invalid FEN string"}), 400
    
    best_move = engine.get_best_move_for_fen(fen, depth)
    
    if best_move:
        return jsonify({"move": best_move, "fen": fen, "depth": depth})
    else:
        return jsonify({"error": "No valid move found"}), 400


@app.route('/eval')
def get_evaluation():
    engine = get_engine()
    state = engine.get_state()
    return jsonify({
        "evaluation": state['evaluation'],
        "fen": state['fen'],
        "turn": state['turn'],
        "in_check": state['in_check']
    })


@app.route('/eval/<path:fen>')
def get_evaluation_for_fen(fen: str):
    engine = get_engine()
    
    if not engine.is_valid_fen(fen):
        return jsonify({"error": "Invalid FEN string"}), 400
    
    original_board = engine.board.copy()
    
    try:
        engine.board = chess.Board(fen)
        evaluation = engine.get_normalized_eval()
        turn = "white" if engine.board.turn == chess.WHITE else "black"
        in_check = engine.board.is_check()
        
        return jsonify({
            "evaluation": evaluation,
            "fen": fen,
            "turn": turn,
            "in_check": in_check
        })
    finally:
        engine.board = original_board


@app.route('/api/undo', methods=['POST'])
def undo_move():
    engine = get_engine()
    
    undone = engine.undo_move()
    if undone:
        if engine.ai_color is not None:
            ai_turn = engine.board.turn == engine.ai_color
            if not ai_turn and engine.move_history:
                engine.undo_move()
        
        return jsonify(engine.get_state())
    else:
        return jsonify({"error": "No moves to undo"}), 400


@app.route('/api/redo', methods=['POST'])
def redo_move():
    engine = get_engine()
    
    redone = engine.redo_move()
    if redone:
        return jsonify(engine.get_state())
    else:
        return jsonify({"error": "No moves to redo"}), 400


@app.route('/api/legal-moves/<square>')
def get_legal_moves_for_square(square: str):
    engine = get_engine()
    
    try:
        from_square = chess.parse_square(square)
    except ValueError:
        return jsonify({"error": "Invalid square"}), 400
    
    legal_destinations = []
    for move in engine.board.legal_moves:
        if move.from_square == from_square:
            legal_destinations.append(chess.square_name(move.to_square))
    
    return jsonify({"square": square, "legal_moves": legal_destinations})


@app.route('/api/pgn')
def get_pgn():
    engine = get_engine()
    return jsonify({"pgn": engine.get_pgn()})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
