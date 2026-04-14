import { useEffect, useRef, useState } from 'react';
import './Paddle.css';

const Paddle = ({ paddleRef, laneRef, onMove }) => {
  const [paddleX, setPaddleX] = useState(0);
  const shadowRef = useRef(null);

  useEffect(() => {
    const updatePosition = (event) => {
      if (!paddleRef.current || !laneRef.current) return;
      const laneRect = laneRef.current.getBoundingClientRect();
      const paddleRect = paddleRef.current.getBoundingClientRect();
      const offsetX = event.clientX - laneRect.left - paddleRect.width / 2;
      const leftMargin = Math.max(0, Math.min(laneRect.width * 0.04, 28));
      const shadowStyle = shadowRef.current ? window.getComputedStyle(shadowRef.current) : null;
      const extraRight = shadowStyle ? parseFloat(shadowStyle.paddingRight || '0') : 0;
      const maxX = laneRect.width - paddleRect.width + extraRight;
      const clamped = Math.max(-leftMargin, Math.min(offsetX, maxX));
      setPaddleX(clamped);
    };

    const centerPaddle = () => {
      if (!paddleRef.current || !laneRef.current) return;
      const laneRect = laneRef.current.getBoundingClientRect();
      const paddleRect = paddleRef.current.getBoundingClientRect();
      const centered = (laneRect.width - paddleRect.width) / 2;
      setPaddleX(centered);
    };

    centerPaddle();
    window.addEventListener('resize', centerPaddle);
    window.addEventListener('mousemove', updatePosition);
    return () => {
      window.removeEventListener('resize', centerPaddle);
      window.removeEventListener('mousemove', updatePosition);
    };
  }, [paddleRef, laneRef]);

  useEffect(() => {
    if (onMove) onMove();
  }, [paddleX, onMove]);

  return (
    <section className="paddle-area" aria-label="game paddle lane">
      <div className="paddle-grid">
        <div className="paddle-gutter" />
        <div className="paddle-lane" ref={laneRef}>
          <div className="paddle-shadow" ref={shadowRef}>
            <div
              className="paddle"
              ref={paddleRef}
              style={{ transform: `translate(${paddleX}px, -50%)` }}
            >
              <div className="paddle-grip" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Paddle;
