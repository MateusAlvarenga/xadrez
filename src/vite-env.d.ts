/// <reference types="vite/client" />

declare module '@chrisoakman/chessboardjs' {
  type BoardConfig = {
    draggable?: boolean;
    position?: string;
    orientation?: 'white' | 'black';
    pieceTheme?: string | ((piece: string) => string);
    onDragStart?: (source: string, piece: string) => boolean;
    onDrop?: (source: string, target: string) => 'snapback' | void;
    onSnapEnd?: () => void;
  };

  const Chessboard: (element: HTMLElement, config: BoardConfig) => BoardInstance;
  export default Chessboard;
}

declare module '@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js';

declare module 'chess.js' {
  type Color = 'w' | 'b';

  type MoveInput = {
    from: string;
    to: string;
    promotion?: 'q' | 'r' | 'b' | 'n';
  };

  export class Chess {
    constructor(fen?: string);
    fen(): string;
    turn(): Color;
    get(square: string): { type: string; color: Color } | null;
    move(move: MoveInput): unknown | null;
    in_check(): boolean;
    in_checkmate(): boolean;
    in_draw(): boolean;
  }
}

type BoardInstance = {
  position: (fen: string, useAnimation?: boolean) => void;
  orientation: (color: 'white' | 'black') => void;
  resize: () => void;
  destroy: () => void;
};
