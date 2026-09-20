import { useEffect, useRef } from 'react';
import $ from 'jquery';

type BoardInstance = {
  position: (fen: string, useAnimation?: boolean) => void;
  orientation: (color: 'white' | 'black') => void;
  resize: () => void;
  destroy: () => void;
};

type ChessboardFactory = (
  element: HTMLElement,
  config: {
    draggable: boolean;
    position: string;
    orientation: 'white' | 'black';
    onDrop: (from: string, to: string) => 'snapback' | void;
  },
) => BoardInstance;

declare global {
  interface Window {
    Chessboard?: ChessboardFactory;
    jQuery?: typeof $;
    $?: typeof $;
  }
}

type ChessBoardJsProps = {
  fen: string;
  orientation: 'white' | 'black';
  onMove: (from: string, to: string) => 'snapback' | void;
};

export function ChessBoardJs({ fen, orientation, onMove }: ChessBoardJsProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<BoardInstance | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!elementRef.current) return;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    window.jQuery = $;
    window.$ = $;
    import('@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.js').then(() => {
      if (disposed || !elementRef.current || !window.Chessboard) return;
      const board = window.Chessboard(elementRef.current, {
        draggable: true,
        position: fen,
        orientation,
        onDrop: (from, to) => onMoveRef.current(from, to),
      });
      boardRef.current = board;
      resizeObserver = new ResizeObserver(() => board.resize());
      resizeObserver.observe(elementRef.current);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      boardRef.current?.destroy();
      boardRef.current = null;
    };
    // The board is intentionally created once; position updates use the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    boardRef.current?.position(fen);
  }, [fen]);

  useEffect(() => {
    boardRef.current?.orientation(orientation);
  }, [orientation]);

  return <div className="chessboard-container" ref={elementRef} />;
}
