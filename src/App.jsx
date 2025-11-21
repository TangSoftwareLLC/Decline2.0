import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import MeetingBlock from './components/MeetingBlock';

const START_HOUR = 8;
const END_HOUR = 18;
const MEETING_PADDING = 6;
const DEBUG_NOW = false;
const DEBUG_TIME_STRING = '17:50'; // 5:50 PM
const BALL_SIZE = 14;
const BALL_SPEED = { x: 180, y: 260 }; // px per second

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MEETINGS = [
  {
    id: 'm1',
    day: 0,
    start: '09:00',
    length: 60,
    variant: 'accepted',
    title: 'Design Review',
    roomInfo: 'Conf Room A',
    organizerInfo: 'Laura Chen',
  },
  {
    id: 'm2',
    day: 0,
    start: '13:30',
    length: 30,
    variant: 'tentative',
    title: '1:1 Sync',
    roomInfo: 'Virtual',
    organizerInfo: 'Anthony Ruiz',
  },
  {
    id: 'm3',
    day: 1,
    start: '10:00',
    length: 120,
    variant: 'accepted',
    title: 'Product Planning',
    roomInfo: 'Board Room',
    organizerInfo: 'Leadership',
  },
  {
    id: 'm4',
    day: 2,
    start: '08:30',
    length: 30,
    variant: 'accepted',
    title: 'Daily Standup',
    roomInfo: 'Breakout 1',
    organizerInfo: 'Delivery Team',
  },
  {
    id: 'm5',
    day: 3,
    start: '15:00',
    length: 60,
    variant: 'tentative',
    title: 'Customer Call',
    roomInfo: 'Zoom Room',
    organizerInfo: 'CS Team',
  },
  {
    id: 'm6',
    day: 4,
    start: '11:00',
    length: 60,
    variant: 'accepted',
    title: 'Engineering Sync',
    roomInfo: 'Main Conference',
    organizerInfo: 'Eng Leads',
  },
];

const hourMarks = Array.from({ length: (END_HOUR - START_HOUR) + 1 }, (_, idx) => {
  const hour = START_HOUR + idx;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const label = `${displayHour}:00 ${suffix}`;
  return { id: idx, label };
});

const totalMinutes = (END_HOUR - START_HOUR) * 60;
const totalSlots = totalMinutes / 15;

const parseTimeString = (value) => {
  const [h, m] = value.split(':').map(Number);
  return (h * 60) + m;
};

const getCurrentMinutes = () => {
  if (DEBUG_NOW) {
    return parseTimeString(DEBUG_TIME_STRING);
  }
  const now = new Date();
  return (now.getHours() * 60) + now.getMinutes();
};

const computeSlotHeight = () => {
  if (typeof window === 'undefined') return 20;

  const reservedForChrome = 240; // header + padding + breathing room
  const available = Math.max(window.innerHeight - reservedForChrome, 360);
  const raw = available / totalSlots;
  const clamped = Math.min(Math.max(raw, 12), 26);
  const rounded = Math.round(clamped);
  const projectedHeight = rounded * totalSlots;
  if (projectedHeight > available) {
    return Math.max(10, Math.floor(available / totalSlots));
  }
  return rounded;
};

const timeToOffset = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const minsFromStart = (hours - START_HOUR) * 60 + minutes;
  return (minsFromStart / 15);
};

function App() {
  const [slotHeight, setSlotHeight] = useState(computeSlotHeight);
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentMinutes);
  const [paddleX, setPaddleX] = useState(0);
  const paddleRef = useRef(null);
  const paddleLaneRef = useRef(null);
  const playfieldRef = useRef(null);
  const dayColumnsRef = useRef(null);
  const dayHeaderRef = useRef(null);
  const boundsRef = useRef({
    playfield: { left: 0, top: 0, width: 0, height: 0 },
    dayColumns: { left: 0, top: 0, width: 0 },
    headerBottom: 0,
    paddleLane: { left: 0, top: 0, width: 0, height: 0 },
  });
  const ballStateRef = useRef({
    x: 0,
    y: 0,
    vx: BALL_SPEED.x,
    vy: BALL_SPEED.y,
    active: false,
  });
  const [ballRender, setBallRender] = useState(ballStateRef.current);
  const [awaitingLaunch, setAwaitingLaunch] = useState(true);

  const days = useMemo(() => {
    const today = new Date();
    const todayKey = today.toDateString();
    const currentDay = today.getDay(); // 0 = Sun
    const offsetToSunday = currentDay; // days since Sunday
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - offsetToSunday);

    return Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + idx);
      const label = DAY_NAMES[date.getDay()];
      const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const isToday = date.toDateString() === todayKey;
      return { id: idx, label, date: dateLabel, isToday };
    });
  }, []);

  useEffect(() => {
    const onResize = () => setSlotHeight(computeSlotHeight());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const tick = () => setCurrentMinutes(getCurrentMinutes());
    const id = window.setInterval(tick, 60 * 1000);
    tick();
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const updatePosition = (event) => {
      if (!paddleRef.current || !paddleLaneRef.current) return;
      const laneRect = paddleLaneRef.current.getBoundingClientRect();
      const paddleRect = paddleRef.current.getBoundingClientRect();
      const offsetX = event.clientX - laneRect.left - paddleRect.width / 2;
      const clamped = Math.max(0, Math.min(offsetX, laneRect.width - paddleRect.width));
      setPaddleX(clamped);
    };

    const centerPaddle = () => {
      if (!paddleRef.current || !paddleLaneRef.current) return;
      const laneRect = paddleLaneRef.current.getBoundingClientRect();
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
  }, []);

  useEffect(() => {
    const measure = () => {
      if (!playfieldRef.current || !dayColumnsRef.current || !paddleLaneRef.current) return;
      const playRect = playfieldRef.current.getBoundingClientRect();
      const dayRect = dayColumnsRef.current.getBoundingClientRect();
      const headerRect = dayHeaderRef.current?.getBoundingClientRect();
      const laneRect = paddleLaneRef.current.getBoundingClientRect();
      boundsRef.current = {
        playfield: { left: playRect.left, top: playRect.top, width: playRect.width, height: playRect.height },
        dayColumns: { left: dayRect.left, top: dayRect.top, width: dayRect.width },
        headerBottom: headerRect ? headerRect.bottom : dayRect.top + 42,
        paddleLane: { left: laneRect.left, top: laneRect.top, width: laneRect.width, height: laneRect.height },
      };
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const launchBall = () => {
      const { playfield, dayColumns, headerBottom } = boundsRef.current;
      if (!playfield.width || !dayColumns.width) return;
      const startX = (dayColumns.left - playfield.left) + (dayColumns.width / 2) - BALL_SIZE / 2;
      const startY = (headerBottom - playfield.top) + 20;
      ballStateRef.current = {
        x: startX,
        y: startY,
        vx: BALL_SPEED.x,
        vy: BALL_SPEED.y,
        active: true,
      };
      setBallRender(ballStateRef.current);
      setAwaitingLaunch(false);
    };

    const handleClick = () => {
      if (awaitingLaunch) launchBall();
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [awaitingLaunch]);

  useEffect(() => {
    let animationId;
    let lastTs;

    const step = (ts) => {
      if (!ballStateRef.current.active) {
        lastTs = ts;
        animationId = requestAnimationFrame(step);
        return;
      }

      if (!lastTs) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      const state = { ...ballStateRef.current };
      const bounds = boundsRef.current;

      const pfLeft = bounds.playfield.left;
      const pfTop = bounds.playfield.top;
      const leftBound = bounds.dayColumns.left - pfLeft;
      const rightBound = leftBound + bounds.dayColumns.width - BALL_SIZE;
      const topBound = bounds.headerBottom - pfTop;

      const prevX = state.x;
      const prevY = state.y;

      state.x += state.vx * dt;
      state.y += state.vy * dt;

      // Wall collisions (left/right within day columns)
      if (state.x <= leftBound) {
        state.x = leftBound;
        state.vx = Math.abs(state.vx);
      } else if (state.x >= rightBound) {
        state.x = rightBound;
        state.vx = -Math.abs(state.vx);
      }

      // Header bottom collision (floor with upward bounce)
      if (state.y <= topBound) {
        state.y = topBound;
        state.vy = Math.abs(state.vy);
      }

      // Paddle collision (use actual paddle bounds)
      if (paddleRef.current && playfieldRef.current) {
        const playRect = playfieldRef.current.getBoundingClientRect();
        const paddleRect = paddleRef.current.getBoundingClientRect();
        const paddleLeft = paddleRect.left - playRect.left;
        const paddleRight = paddleLeft + paddleRect.width;
        const paddleTop = paddleRect.top - playRect.top;
        const paddleBottom = paddleTop + paddleRect.height;
        const ballBottom = state.y + BALL_SIZE;
        const prevBallBottom = prevY + BALL_SIZE;
        const nextBallBottom = ballBottom;
        const ballLeft = state.x;
        const ballRight = state.x + BALL_SIZE;

        if (
          state.vy > 0 &&
          prevBallBottom <= paddleTop &&
          nextBallBottom >= paddleTop &&
          ballRight > paddleLeft &&
          ballLeft < paddleRight
        ) {
          state.y = paddleTop - BALL_SIZE;
          state.vy = -Math.abs(state.vy);
        }
      }

      // Out of bounds bottom
      if (state.y > bounds.playfield.height) {
        state.active = false;
        setAwaitingLaunch(true);
      }

      ballStateRef.current = state;
      setBallRender(state);
      animationId = requestAnimationFrame(step);
    };

    animationId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const dayGridHeight = totalSlots * slotHeight;
  const heightForLength = (length) => (length / 15) * slotHeight;
  const nowLineOffset = ((currentMinutes - (START_HOUR * 60)) / 15) * slotHeight;
  const showNowLine = currentMinutes >= START_HOUR * 60 && currentMinutes <= END_HOUR * 60;

  return (
    <div className="page">
      <div className="playfield" ref={playfieldRef}>
        <section className="calendar" style={{ '--slot-height': `${slotHeight}px` }}>
          <div className="time-gutter">
            {hourMarks.map((mark) => (
              <div key={mark.id} className="time-label">
                {mark.label}
              </div>
            ))}
            {showNowLine && (
              <div
                className="now-line gutter"
                style={{ top: nowLineOffset }}
                aria-hidden="true"
              />
            )}
          </div>

          <div className="day-columns" ref={dayColumnsRef}>
            {days.map((day) => (
              <div key={day.id} className={`day-column${day.isToday ? ' current-day' : ''}`}>
                <div className="day-header" ref={day.id === 0 ? dayHeaderRef : undefined}>
                  <span className="day-label">{day.label}</span>
                  <span className="day-date">{day.date}</span>
                </div>
                <div
                  className="day-grid"
                  style={{ height: dayGridHeight }}
                >
                  {showNowLine && (
                    <div
                      className="now-line"
                      style={{ top: nowLineOffset }}
                      aria-label="current time indicator"
                    />
                  )}
                  {MEETINGS.filter((meeting) => meeting.day === day.id).map((meeting) => {
                    const top = timeToOffset(meeting.start) * slotHeight;
                    const height = heightForLength(meeting.length);
                    const innerHeight = Math.max(0, height - MEETING_PADDING * 2);
                    return (
                      <div
                        key={meeting.id}
                        className="meeting-wrapper"
                        style={{ top, height }}
                      >
                        <MeetingBlock
                          variant={meeting.variant}
                          length={meeting.length}
                          height={innerHeight}
                          title={meeting.title}
                          roomInfo={meeting.roomInfo}
                          organizerInfo={meeting.organizerInfo}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="paddle-area" aria-label="game paddle lane">
          <div className="paddle-grid">
            <div className="paddle-gutter" />
            <div className="paddle-lane" ref={paddleLaneRef}>
              <div className="paddle-shadow">
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

        <div
          className="ball"
          style={{
            transform: `translate(${ballRender.x}px, ${ballRender.y}px)`,
            opacity: ballRender.active ? 1 : 0,
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export default App;
