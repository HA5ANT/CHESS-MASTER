"""
Chess Engine Module
Provides AI evaluation, minimax search with alpha-beta pruning, and opening books.
Supports English Opening (as White) and Modern Defense (as Black).
"""

import chess
import random
import time
from typing import Optional, Tuple, List, Dict

PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000
}

PAWN_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5,  5, 10, 25, 25, 10,  5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5, -5,-10,  0,  0,-10, -5,  5,
    5, 10, 10,-20,-20, 10, 10,  5,
    0,  0,  0,  0,  0,  0,  0,  0
]

KNIGHT_TABLE = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
]

BISHOP_TABLE = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
]

ROOK_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
]

QUEEN_TABLE = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
]

KING_MIDDLE_TABLE = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
    20, 20,  0,  0,  0,  0, 20, 20,
    20, 30, 10,  0,  0, 10, 30, 20
]

KING_END_TABLE = [
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50
]

ENGLISH_OPENING = {
    "": ["c2c4"],
    "e7e5": ["b1c3", "g2g3"],
    "e7e5 b1c3": ["g8f6", "b8c6"],
    "e7e5 g2g3": ["g8f6", "b8c6"],
    "c7c5": ["b1c3", "g2g3"],
    "c7c5 b1c3": ["b8c6", "g8f6"],
    "g8f6": ["b1c3", "g2g3"],
    "g8f6 b1c3": ["e7e5", "d7d5"],
    "d7d5": ["c4d5", "b1c3"],
    "e7e6": ["b1c3", "g2g3", "g1f3"],
}

ENGLISH_THEMATIC_MOVES = ["b1c3", "g2g3", "f1g2", "g1f3", "e1g1", "d2d3", "e2e4", "b2b3"]

MODERN_DEFENSE = {
    "e2e4": ["g7g6"],
    "e2e4 g7g6": ["d7d6", "f8g7"],
    "e2e4 g7g6 d2d4": ["f8g7"],
    "e2e4 g7g6 d2d4 f8g7": ["b8c6", "d7d6"],
    "e2e4 g7g6 g1f3": ["f8g7"],
    "e2e4 g7g6 g1f3 f8g7": ["d7d6", "c7c5"],
    "e2e4 g7g6 b1c3": ["f8g7"],
    "e2e4 g7g6 b1c3 f8g7": ["d7d6", "c7c5"],
    "d2d4": ["g7g6"],
    "d2d4 g7g6": ["f8g7"],
    "d2d4 g7g6 e2e4": ["f8g7"],
    "d2d4 g7g6 c2c4": ["f8g7"],
    "g1f3": ["g7g6"],
    "c2c4": ["g7g6"],
}

MODERN_THEMATIC_MOVES = ["g7g6", "f8g7", "d7d6", "b8d7", "e7e5", "c7c6", "a7a6", "b7b5"]


class ChessEngine:
    def __init__(self):
        self.board = chess.Board()
        self.move_history: List[chess.Move] = []
        self.redo_stack: List[chess.Move] = []
        self.ai_color: Optional[chess.Color] = None
        self.max_time = 5.0
        self.start_time = 0.0
        self.nodes_searched = 0
        self.safety_threshold = -200
        
    def reset(self):
        self.board = chess.Board()
        self.move_history = []
        self.redo_stack = []
        self.ai_color = None
        
    def set_ai_color(self, color: chess.Color):
        self.ai_color = color
        
    def get_fen(self) -> str:
        return self.board.fen()
    
    def set_fen(self, fen: str) -> bool:
        try:
            self.board.set_fen(fen)
            return True
        except ValueError:
            return False
    
    def is_valid_fen(self, fen: str) -> bool:
        try:
            chess.Board(fen)
            return True
        except ValueError:
            return False
    
    def make_move(self, move_uci: str) -> bool:
        try:
            move = chess.Move.from_uci(move_uci)
            if move in self.board.legal_moves:
                self.board.push(move)
                self.move_history.append(move)
                self.redo_stack.clear()
                return True
            return False
        except ValueError:
            return False
    
    def undo_move(self) -> Optional[str]:
        if self.move_history:
            move = self.move_history.pop()
            self.redo_stack.append(move)
            self.board.pop()
            return move.uci()
        return None
    
    def redo_move(self) -> Optional[str]:
        if self.redo_stack:
            move = self.redo_stack.pop()
            self.board.push(move)
            self.move_history.append(move)
            return move.uci()
        return None
    
    def get_move_history_uci(self) -> List[str]:
        return [move.uci() for move in self.move_history]
    
    def get_pgn(self) -> str:
        temp_board = chess.Board()
        pgn_moves = []
        for i, move in enumerate(self.move_history):
            if i % 2 == 0:
                pgn_moves.append(f"{i // 2 + 1}.")
            pgn_moves.append(temp_board.san(move))
            temp_board.push(move)
        return " ".join(pgn_moves)
    
    def get_legal_moves(self) -> List[str]:
        return [move.uci() for move in self.board.legal_moves]
    
    def is_game_over(self) -> bool:
        return self.board.is_game_over()
    
    def get_game_result(self) -> Optional[str]:
        if self.board.is_checkmate():
            return "1-0" if self.board.turn == chess.BLACK else "0-1"
        elif self.board.is_stalemate():
            return "1/2-1/2 (Stalemate)"
        elif self.board.is_insufficient_material():
            return "1/2-1/2 (Insufficient material)"
        elif self.board.is_fifty_moves():
            return "1/2-1/2 (Fifty-move rule)"
        elif self.board.is_repetition():
            return "1/2-1/2 (Threefold repetition)"
        return None
    
    def is_endgame(self) -> bool:
        queens = len(self.board.pieces(chess.QUEEN, chess.WHITE)) + len(self.board.pieces(chess.QUEEN, chess.BLACK))
        minor_pieces = (len(self.board.pieces(chess.KNIGHT, chess.WHITE)) + 
                       len(self.board.pieces(chess.BISHOP, chess.WHITE)) +
                       len(self.board.pieces(chess.KNIGHT, chess.BLACK)) + 
                       len(self.board.pieces(chess.BISHOP, chess.BLACK)))
        return queens == 0 or (queens == 2 and minor_pieces <= 2)
    
    def get_piece_square_value(self, piece: chess.Piece, square: int) -> int:
        piece_tables = {
            chess.PAWN: PAWN_TABLE,
            chess.KNIGHT: KNIGHT_TABLE,
            chess.BISHOP: BISHOP_TABLE,
            chess.ROOK: ROOK_TABLE,
            chess.QUEEN: QUEEN_TABLE,
        }
        
        if piece.piece_type == chess.KING:
            table = KING_END_TABLE if self.is_endgame() else KING_MIDDLE_TABLE
        else:
            table = piece_tables.get(piece.piece_type, [0] * 64)
        
        if piece.color == chess.WHITE:
            return table[63 - square]
        else:
            return table[square]
    
    def evaluate_mobility(self) -> int:
        current_turn = self.board.turn
        
        self.board.turn = chess.WHITE
        white_mobility = len(list(self.board.legal_moves))
        
        self.board.turn = chess.BLACK
        black_mobility = len(list(self.board.legal_moves))
        
        self.board.turn = current_turn
        
        return (white_mobility - black_mobility) * 5
    
    def evaluate_king_safety(self) -> int:
        score = 0
        
        for color in [chess.WHITE, chess.BLACK]:
            king_square = self.board.king(color)
            if king_square is None:
                continue
                
            king_file = chess.square_file(king_square)
            king_rank = chess.square_rank(king_square)
            
            shield_bonus = 0
            pawn_direction = 1 if color == chess.WHITE else -1
            
            for file_offset in [-1, 0, 1]:
                check_file = king_file + file_offset
                check_rank = king_rank + pawn_direction
                
                if 0 <= check_file <= 7 and 0 <= check_rank <= 7:
                    square = chess.square(check_file, check_rank)
                    piece = self.board.piece_at(square)
                    if piece and piece.piece_type == chess.PAWN and piece.color == color:
                        shield_bonus += 10
            
            if color == chess.WHITE:
                score += shield_bonus
            else:
                score -= shield_bonus
        
        return score
    
    def evaluate(self) -> int:
        if self.board.is_checkmate():
            return -30000 if self.board.turn == chess.WHITE else 30000
        
        if self.board.is_stalemate() or self.board.is_insufficient_material():
            return 0
        
        score = 0
        
        for square in chess.SQUARES:
            piece = self.board.piece_at(square)
            if piece:
                value = PIECE_VALUES[piece.piece_type]
                value += self.get_piece_square_value(piece, square)
                
                if piece.color == chess.WHITE:
                    score += value
                else:
                    score -= value
        
        score += self.evaluate_mobility()
        
        if not self.is_endgame():
            score += self.evaluate_king_safety()
        
        if self.board.is_check():
            score += -30 if self.board.turn == chess.WHITE else 30
        
        return score
    
    def get_normalized_eval(self) -> float:
        raw_eval = self.evaluate()
        perspective = 1 if self.board.turn == chess.WHITE else -1
        eval_from_white = raw_eval
        normalized = max(-10.0, min(10.0, eval_from_white / 100.0))
        return round(normalized, 2)
    
    def get_opening_move(self) -> Optional[str]:
        move_sequence = " ".join(self.get_move_history_uci())
        move_count = len(self.move_history)
        
        if self.ai_color == chess.WHITE:
            if move_sequence in ENGLISH_OPENING:
                moves = ENGLISH_OPENING[move_sequence]
                return random.choice(moves)
            elif move_count < 12:
                return self._get_thematic_move(ENGLISH_THEMATIC_MOVES)
        elif self.ai_color == chess.BLACK:
            if move_sequence in MODERN_DEFENSE:
                moves = MODERN_DEFENSE[move_sequence]
                return random.choice(moves)
            elif move_count < 12:
                return self._get_thematic_move(MODERN_THEMATIC_MOVES)
        
        return None
    
    def _get_thematic_move(self, thematic_moves: List[str]) -> Optional[str]:
        legal_moves = list(self.board.legal_moves)
        thematic_legal = []
        
        for move in legal_moves:
            if move.uci() in thematic_moves:
                self.board.push(move)
                eval_score = self.evaluate()
                self.board.pop()
                
                perspective = 1 if self.ai_color == chess.WHITE else -1
                if eval_score * perspective >= self.safety_threshold:
                    thematic_legal.append(move.uci())
        
        if thematic_legal and random.random() < 0.7:
            return random.choice(thematic_legal)
        
        return None
    
    def order_moves(self, moves: List[chess.Move]) -> List[chess.Move]:
        scored_moves = []
        
        for move in moves:
            score = 0
            
            if self.board.is_capture(move):
                captured = self.board.piece_at(move.to_square)
                attacker = self.board.piece_at(move.from_square)
                if captured and attacker:
                    score += 10 * PIECE_VALUES[captured.piece_type] - PIECE_VALUES[attacker.piece_type]
            
            if move.promotion:
                score += PIECE_VALUES[move.promotion]
            
            self.board.push(move)
            if self.board.is_check():
                score += 50
            self.board.pop()
            
            to_file = chess.square_file(move.to_square)
            to_rank = chess.square_rank(move.to_square)
            center_bonus = (3.5 - abs(to_file - 3.5)) + (3.5 - abs(to_rank - 3.5))
            score += int(center_bonus * 5)
            
            scored_moves.append((score, move))
        
        scored_moves.sort(key=lambda x: x[0], reverse=True)
        return [move for _, move in scored_moves]
    
    def quiescence(self, alpha: float, beta: float, depth: int = 0) -> float:
        self.nodes_searched += 1
        
        stand_pat = self.evaluate()
        if self.board.turn == chess.BLACK:
            stand_pat = -stand_pat
        
        if stand_pat >= beta:
            return beta
        
        if alpha < stand_pat:
            alpha = stand_pat
        
        if depth > 4:
            return alpha
        
        for move in self.board.legal_moves:
            if not self.board.is_capture(move):
                continue
            
            self.board.push(move)
            score = -self.quiescence(-beta, -alpha, depth + 1)
            self.board.pop()
            
            if score >= beta:
                return beta
            if score > alpha:
                alpha = score
        
        return alpha
    
    def minimax(self, depth: int, alpha: float, beta: float, maximizing: bool) -> Tuple[float, Optional[chess.Move]]:
        self.nodes_searched += 1
        
        if time.time() - self.start_time > self.max_time:
            eval_score = self.evaluate()
            return (eval_score if maximizing else -eval_score, None)
        
        if depth == 0 or self.board.is_game_over():
            score = self.quiescence(alpha, beta)
            return (score if self.board.turn == chess.WHITE else -score, None)
        
        best_move = None
        moves = self.order_moves(list(self.board.legal_moves))
        
        if maximizing:
            max_eval = -float('inf')
            for move in moves:
                self.board.push(move)
                eval_score, _ = self.minimax(depth - 1, alpha, beta, False)
                self.board.pop()
                
                if eval_score > max_eval:
                    max_eval = eval_score
                    best_move = move
                
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break
            
            return (max_eval, best_move)
        else:
            min_eval = float('inf')
            for move in moves:
                self.board.push(move)
                eval_score, _ = self.minimax(depth - 1, alpha, beta, True)
                self.board.pop()
                
                if eval_score < min_eval:
                    min_eval = eval_score
                    best_move = move
                
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break
            
            return (min_eval, best_move)
    
    def get_best_move(self, depth: int = 3) -> Optional[str]:
        if self.board.is_game_over():
            return None
        
        opening_move = self.get_opening_move()
        if opening_move:
            try:
                move = chess.Move.from_uci(opening_move)
                if move in self.board.legal_moves:
                    return opening_move
            except ValueError:
                pass
        
        self.start_time = time.time()
        self.nodes_searched = 0
        
        depth = max(1, min(5, depth))
        
        is_maximizing = self.board.turn == chess.WHITE
        _, best_move = self.minimax(depth, -float('inf'), float('inf'), is_maximizing)
        
        if best_move is None:
            legal_moves = list(self.board.legal_moves)
            if legal_moves:
                best_move = random.choice(legal_moves)
        
        if best_move and self.ai_color is not None:
            self.board.push(best_move)
            post_eval = self.evaluate()
            self.board.pop()
            
            perspective = 1 if self.ai_color == chess.WHITE else -1
            ai_eval = post_eval * perspective
            
            if ai_eval < self.safety_threshold:
                safe_moves = []
                for move in self.board.legal_moves:
                    self.board.push(move)
                    eval_after = self.evaluate() * perspective
                    self.board.pop()
                    if eval_after >= self.safety_threshold:
                        safe_moves.append((eval_after, move))
                
                if safe_moves:
                    safe_moves.sort(key=lambda x: x[0], reverse=True)
                    best_move = safe_moves[0][1]
        
        return best_move.uci() if best_move else None
    
    def get_best_move_for_fen(self, fen: str, depth: int = 3) -> Optional[str]:
        if not self.is_valid_fen(fen):
            return None
        
        original_board = self.board.copy()
        original_history = self.move_history.copy()
        original_redo = self.redo_stack.copy()
        
        try:
            self.board = chess.Board(fen)
            result = self.get_best_move(depth)
            return result
        finally:
            self.board = original_board
            self.move_history = original_history
            self.redo_stack = original_redo
    
    def get_state(self) -> Dict:
        return {
            "fen": self.get_fen(),
            "pgn": self.get_pgn(),
            "legal_moves": self.get_legal_moves(),
            "is_game_over": self.is_game_over(),
            "result": self.get_game_result(),
            "evaluation": self.get_normalized_eval(),
            "turn": "white" if self.board.turn == chess.WHITE else "black",
            "in_check": self.board.is_check(),
            "move_history": self.get_move_history_uci(),
            "can_undo": len(self.move_history) > 0,
            "can_redo": len(self.redo_stack) > 0,
            "ai_color": "white" if self.ai_color == chess.WHITE else "black" if self.ai_color == chess.BLACK else None
        }
