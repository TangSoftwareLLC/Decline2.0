import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import MeetingBlock from './components/MeetingBlock';

const START_HOUR = 8;
const END_HOUR = 18;
const MEETING_PADDING = 6;
const DEBUG_NOW = false;
const DEBUG_TIME_STRING = '17:50'; // 5:50 PM
const BALL_SIZE = 14;
const BALL_SPEED = { x: 270, y: 390 }; // px per second
const BALL_PADDLE_OFFSET = { x: 0, y: -2 }; // visual offset when ball sits on paddle
const MEETING_HIT_COOLDOWN_MS = 180;
const REQUIRE_REBOUND_BEFORE_REHIT = true;
const DEBUG_LOG_LIMIT = 60;
const PADDLE_MAX_DEFLECTION_DEG = 55; // max angle away from vertical on paddle hit

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const INITIAL_MEETINGS = [
  {
    id: 'm1',
    day: 1,
    start: '09:00',
    length: 60,
    variant: 'accepted',
    title: 'Design Review',
    roomInfo: 'Conf Room A',
    organizerInfo: 'Laura Chen',
  },
  {
    id: 'm2',
    day: 5,
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

const minutesToOffset = (minutes) => {
  const minsFromStart = minutes - (START_HOUR * 60);
  return minsFromStart / 15;
};

const minutesToTimeString = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hh = h.toString().padStart(2, '0');
  const mm = m.toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

const clampMeetingStart = (startMinutes, length) => {
  const earliest = START_HOUR * 60;
  const latest = (END_HOUR * 60) - length;
  return Math.min(Math.max(startMinutes, earliest), Math.max(earliest, latest));
};

function App() {
  const [slotHeight, setSlotHeight] = useState(computeSlotHeight);
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentMinutes);
  const [meetings, setMeetings] = useState(() => INITIAL_MEETINGS.map((meeting) => ({
    ...meeting,
    startMinutes: parseTimeString(meeting.start),
    isRemoving: false,
  })));
  const [paddleX, setPaddleX] = useState(0);
  const paddleRef = useRef(null);
  const paddleLaneRef = useRef(null);
  const paddleShadowRef = useRef(null);
  const playfieldRef = useRef(null);
  const dayColumnsRef = useRef(null);
  const dayHeaderRef = useRef(null);
  const meetingRefs = useRef({});
  const removalTimersRef = useRef({});
  const boundsRef = useRef({
    playfield: { left: 0, top: 0, width: 0, height: 0 },
    dayColumns: { left: 0, top: 0, width: 0 },
    headerBottom: 0,
    paddleLane: { left: 0, top: 0, width: 0, height: 0 },
    meetings: [],
  });
  const lastHitRef = useRef({ id: null, until: 0, needsClear: false });
  const ballStateRef = useRef({
    x: 0,
    y: 0,
    vx: BALL_SPEED.x,
    vy: BALL_SPEED.y,
    active: false,
  });
  const [ballRender, setBallRender] = useState(ballStateRef.current);
  const [awaitingLaunch, setAwaitingLaunch] = useState(true);
  const [lastHitInfo, setLastHitInfo] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  const prevMeetingsRef = useRef(null);
  const debugLogRef = useRef(null);
  const [showDebug, setShowDebug] = useState(false);

  const recordDebug = useCallback((entry, markAsLastHit = false) => {
    setDebugLog((prev) => {
      const next = [entry, ...prev];
      if (next.length > DEBUG_LOG_LIMIT) next.length = DEBUG_LOG_LIMIT;
      return next;
    });
    if (markAsLastHit) {
      setLastHitInfo(entry);
    }
  }, []);

  const scheduleMeetingRemoval = useCallback((meetingId) => {
    if (removalTimersRef.current[meetingId]) return;
    const timerId = window.setTimeout(() => {
      setMeetings((prev) => prev.filter((meeting) => meeting.id !== meetingId));
      delete removalTimersRef.current[meetingId];
    }, 240);
    removalTimersRef.current[meetingId] = timerId;
  }, []);

  const handleMeetingImpact = useCallback((meetingId, side, extra = {}) => {
    let entry = null;
    setMeetings((prev) => prev.map((meeting) => {
      if (meeting.id !== meetingId) return meeting;
      if (meeting.isRemoving) return meeting;

      const beforeStart = meeting.startMinutes;
      const beforeLength = meeting.length;
      const isAlreadyMin = beforeLength <= 30;
      let afterLength = beforeLength;
      let afterStart = beforeStart;

      if (isAlreadyMin) {
        // A 30-minute block is destroyed on contact
        scheduleMeetingRemoval(meetingId);
        entry = {
          id: meetingId,
          side,
          beforeLength,
          afterLength,
          beforeStart,
          afterStart,
          removing: true,
          day: meeting.day,
          title: meeting.title,
          ts: Date.now(),
          face: extra.face,
          midpointSide: extra.midpointSide || false,
        };
        return {
          ...meeting,
          isRemoving: true,
        };
      }

      afterLength = Math.max(30, beforeLength - 30);
      afterStart = beforeStart + (side === 'top' ? 15 : 0);
      afterStart = clampMeetingStart(afterStart, afterLength);

      entry = {
        id: meetingId,
        side,
        beforeLength,
        afterLength,
        beforeStart,
        afterStart,
        removing: false,
        day: meeting.day,
        title: meeting.title,
        ts: Date.now(),
        face: extra.face,
        midpointSide: extra.midpointSide || false,
      };
      return {
        ...meeting,
        startMinutes: afterStart,
        length: afterLength,
      };
    }));

    if (entry) {
      recordDebug({ type: 'impact', ...entry }, true);
    }
  }, [scheduleMeetingRemoval, recordDebug]);

  useEffect(() => () => {
    Object.values(removalTimersRef.current).forEach((id) => clearTimeout(id));
  }, []);

  // Track meeting state changes (length/start/removal) to surface in the overlay log
  useEffect(() => {
    if (!prevMeetingsRef.current) {
      prevMeetingsRef.current = meetings;
      return;
    }
    const prevById = new Map(prevMeetingsRef.current.map((m) => [m.id, m]));

    meetings.forEach((meeting) => {
      const prev = prevById.get(meeting.id);
      if (!prev) return;
      const changed = (
        prev.length !== meeting.length ||
        prev.startMinutes !== meeting.startMinutes ||
        prev.isRemoving !== meeting.isRemoving
      );
      if (changed) {
        recordDebug({
          type: 'state-change',
          id: meeting.id,
          day: meeting.day,
          title: meeting.title,
          beforeLength: prev.length,
          afterLength: meeting.length,
          beforeStart: prev.startMinutes,
          afterStart: meeting.startMinutes,
          removing: meeting.isRemoving,
          ts: Date.now(),
        });
      }
    });

    prevMeetingsRef.current = meetings;
  }, [meetings, recordDebug]);

  useEffect(() => {
    if (!debugLogRef.current) return;
    const el = debugLogRef.current;
    el.scrollTop = el.scrollHeight;
  }, [debugLog]);

  useEffect(() => {
    if (meetings.length === 0) {
      const state = { ...ballStateRef.current, active: false, vx: 0, vy: 0 };
      ballStateRef.current = state;
      setBallRender(state);
    }
  }, [meetings.length]);

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
      const leftMargin = Math.max(0, Math.min(laneRect.width * 0.04, 28)); // allow slight overtravel left
      const shadowStyle = paddleShadowRef.current ? window.getComputedStyle(paddleShadowRef.current) : null;
      const extraRight = shadowStyle ? parseFloat(shadowStyle.paddingRight || '0') : 0;
      const maxX = laneRect.width - paddleRect.width + extraRight;
      const clamped = Math.max(-leftMargin, Math.min(offsetX, maxX));
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
      const activeIds = new Set(meetings.filter((m) => !m.isRemoving).map((m) => m.id));

      const meetingRects = Object.entries(meetingRefs.current)
        .filter(([, node]) => node)
        .filter(([id]) => activeIds.has(id))
        .map(([id, node]) => {
          const rect = node.getBoundingClientRect();
          return {
            id,
            left: rect.left - playRect.left,
            top: rect.top - playRect.top,
            right: rect.right - playRect.left,
            bottom: rect.bottom - playRect.top,
          };
        });

      boundsRef.current = {
        playfield: { left: playRect.left, top: playRect.top, width: playRect.width, height: playRect.height },
        dayColumns: { left: dayRect.left, top: dayRect.top, width: dayRect.width },
        headerBottom: headerRect ? headerRect.bottom : dayRect.top + 42,
        paddleLane: { left: laneRect.left, top: laneRect.top, width: laneRect.width, height: laneRect.height },
        meetings: meetingRects,
      };
    };

    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [slotHeight, meetings]);

    // Position the ball on the paddle while awaiting launch so it appears anchored
    useEffect(() => {
      const positionOnPaddle = () => {
        if (!awaitingLaunch) return;
        if (!playfieldRef.current || !paddleRef.current || !paddleLaneRef.current) return;
        const playRect = playfieldRef.current.getBoundingClientRect();
        const paddleRect = paddleRef.current.getBoundingClientRect();

        const x = (paddleRect.left - playRect.left) + (paddleRect.width / 2) - BALL_SIZE / 2 + BALL_PADDLE_OFFSET.x;
        const y = (paddleRect.top - playRect.top) - BALL_SIZE + BALL_PADDLE_OFFSET.y;

        ballStateRef.current = { ...ballStateRef.current, x, y, active: false };
        setBallRender(ballStateRef.current);
      };

      positionOnPaddle();
      window.addEventListener('resize', positionOnPaddle);
      return () => window.removeEventListener('resize', positionOnPaddle);
    }, [awaitingLaunch, paddleX]);

  useEffect(() => {
    const launchBall = () => {
      const { playfield, dayColumns, headerBottom } = boundsRef.current;
      if (!playfield.width || !dayColumns.width) return;

      let startX;
      let startY;
      const vx = (Math.random() < 0.5 ? -1 : 1) * BALL_SPEED.x;
      const vy = -Math.abs(BALL_SPEED.y);

      if (paddleRef.current && playfieldRef.current) {
        const playRect = playfieldRef.current.getBoundingClientRect();
        const paddleRect = paddleRef.current.getBoundingClientRect();
        startX = (paddleRect.left - playRect.left) + (paddleRect.width / 2) - BALL_SIZE / 2 + BALL_PADDLE_OFFSET.x;
        startY = (paddleRect.top - playRect.top) - BALL_SIZE + BALL_PADDLE_OFFSET.y;
      } else {
        startX = (dayColumns.left - playfield.left) + (dayColumns.width / 2) - BALL_SIZE / 2;
        startY = (headerBottom - playfield.top) + 20;
      }

      ballStateRef.current = {
        x: startX,
        y: startY,
        vx,
        vy,
        active: true,
      };
      setBallRender(ballStateRef.current);
      setAwaitingLaunch(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'd' || event.key === 'D') {
        setShowDebug((prev) => !prev);
        return;
      }
      if (awaitingLaunch) launchBall();
    };

    const handleClick = (event) => {
      if (awaitingLaunch) launchBall();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
    };
  }, [awaitingLaunch]);

  useEffect(() => {
    let animationId;
    let lastTs;

    const clearMeetingLock = () => {
      if (REQUIRE_REBOUND_BEFORE_REHIT && lastHitRef.current.needsClear) {
        lastHitRef.current = { id: lastHitRef.current.id, until: 0, needsClear: false };
      }
    };

    const step = (ts) => {
      const now = ts || performance.now();
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
      const meetingRects = bounds.meetings || [];

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
        clearMeetingLock();
      } else if (state.x >= rightBound) {
        state.x = rightBound;
        state.vx = -Math.abs(state.vx);
        clearMeetingLock();
      }

      // Header bottom collision (floor with upward bounce)
      if (state.y <= topBound) {
        state.y = topBound;
        state.vy = Math.abs(state.vy);
        clearMeetingLock();
      }

      // Paddle collision (use actual paddle bounds)
      if (paddleRef.current && playfieldRef.current) {
        const playRect = playfieldRef.current.getBoundingClientRect();
        const paddleRect = paddleRef.current.getBoundingClientRect();
        const paddleLeft = paddleRect.left - playRect.left;
        const paddleRight = paddleLeft + paddleRect.width;
          const paddleTop = paddleRect.top - playRect.top - 4; // raise a touch to reduce bottom gap
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
          const ballCenter = state.x + BALL_SIZE / 2;
          const hitOffset = ((ballCenter - paddleLeft) / paddleRect.width) - 0.5; // -0.5 left, 0 center, 0.5 right
          const normalized = Math.max(-1, Math.min(hitOffset * 2, 1));

          // If dead-center, choose a slight random direction to avoid perfectly vertical loops
          const adjusted =
            Math.abs(normalized) < 0.02 ? (Math.random() < 0.5 ? -0.02 : 0.02) : normalized;

          const maxRad = (PADDLE_MAX_DEFLECTION_DEG * Math.PI) / 180;
          const angle = adjusted * maxRad; // deflect away from vertical
          const speed = Math.hypot(state.vx, state.vy) || Math.hypot(BALL_SPEED.x, BALL_SPEED.y);
          state.vx = speed * Math.sin(angle);
          state.vy = -Math.abs(speed * Math.cos(angle));
          clearMeetingLock();
        }
      }

      // Meeting collisions (treat each block as a brick)
      for (const rect of meetingRects) {
        const lastHit = lastHitRef.current;
        if (
          lastHit.id === rect.id &&
          (
            (REQUIRE_REBOUND_BEFORE_REHIT && lastHit.needsClear) ||
            now < lastHit.until
          )
        ) {
          continue;
        }

        const ballLeft = state.x;
        const ballRight = state.x + BALL_SIZE;
        const ballTop = state.y;
        const ballBottom = state.y + BALL_SIZE;

        if (
          ballRight > rect.left &&
          ballLeft < rect.right &&
          ballBottom > rect.top &&
          ballTop < rect.bottom
        ) {
          const overlapTop = Math.abs(ballBottom - rect.top);
          const overlapBottom = Math.abs(rect.bottom - ballTop);
          const overlapLeft = Math.abs(ballRight - rect.left);
          const overlapRight = Math.abs(rect.right - ballLeft);
          const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);
          let hitSide = null;
          let face = null;
          let midpointSide = false;

          if (minOverlap === overlapTop) {
            state.y = rect.top - BALL_SIZE - 0.5;
            state.vy = -Math.abs(state.vy);
            hitSide = 'top';
            face = 'top';
          } else if (minOverlap === overlapBottom) {
            state.y = rect.bottom + 0.5;
            state.vy = Math.abs(state.vy);
            hitSide = 'bottom';
            face = 'bottom';
          } else if (minOverlap === overlapLeft) {
            state.x = rect.left - BALL_SIZE - 0.5;
            state.vx = -Math.abs(state.vx);
            face = 'left';
          } else {
            state.x = rect.right + 0.5;
            state.vx = Math.abs(state.vx);
            face = 'right';
          }

          lastHitRef.current = {
            id: rect.id,
            until: now + MEETING_HIT_COOLDOWN_MS,
            needsClear: REQUIRE_REBOUND_BEFORE_REHIT,
          };

          if (face === 'left' || face === 'right') {
            const ballCenterY = state.y + BALL_SIZE / 2;
            const rectMid = (rect.top + rect.bottom) / 2;
            const epsilon = 0.5;
            if (Math.abs(ballCenterY - rectMid) <= epsilon) {
              hitSide = Math.random() < 0.5 ? 'top' : 'bottom';
              midpointSide = true;
            } else {
              hitSide = ballCenterY < rectMid ? 'top' : 'bottom';
            }
          }

          if (hitSide === 'top' || hitSide === 'bottom') {
            handleMeetingImpact(rect.id, hitSide, { face, midpointSide });
          }
          break;
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
  }, [handleMeetingImpact]);

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
                  {meetings.filter((meeting) => meeting.day === day.id).map((meeting) => {
                    const top = minutesToOffset(meeting.startMinutes) * slotHeight;
                    const height = heightForLength(meeting.length);
                    const innerHeight = Math.max(0, height - MEETING_PADDING * 2);
                    return (
                      <div
                        key={meeting.id}
                        className={`meeting-wrapper${meeting.isRemoving ? ' removing' : ''}`}
                        style={{ top, height }}
                        ref={(node) => {
                          if (node) {
                            meetingRefs.current[meeting.id] = node;
                          } else {
                            delete meetingRefs.current[meeting.id];
                          }
                        }}
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
              <div className="paddle-shadow" ref={paddleShadowRef}>
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
            opacity: (ballRender.active || awaitingLaunch) ? 1 : 0,
          }}
          aria-hidden="true"
        />
        {showDebug && (
          <div className="debug-overlay" aria-live="polite">
            <div className="debug-row">
              <strong>Ball</strong>
              <span>{`pos (${ballRender.x.toFixed(1)}, ${ballRender.y.toFixed(1)})`}</span>
              <span>{`vel (${ballStateRef.current.vx.toFixed(0)}, ${ballStateRef.current.vy.toFixed(0)})`}</span>
              <span>{`speed ${Math.hypot(ballStateRef.current.vx, ballStateRef.current.vy).toFixed(0)} px/s`}</span>
            </div>
            {lastHitInfo && (
              <div className="debug-row">
                <strong>Last Hit</strong>
                <span>{`meeting ${lastHitInfo.id}`}</span>
                {lastHitInfo.title && <span>{`"${lastHitInfo.title}"`}</span>}
                <span>{`day ${lastHitInfo.day}`}</span>
                <span>{`side ${lastHitInfo.side}`}</span>
                {lastHitInfo.face && <span>{`face ${lastHitInfo.face}`}</span>}
                {lastHitInfo.midpointSide && <span className="debug-tag">midpoint</span>}
                <span>{`len ${lastHitInfo.beforeLength}→${lastHitInfo.afterLength}`}</span>
                <span>{`start ${minutesToTimeString(lastHitInfo.beforeStart)}→${minutesToTimeString(lastHitInfo.afterStart)}`}</span>
                {lastHitInfo.removing && <span>removing</span>}
              </div>
            )}
            <div className="debug-log" ref={debugLogRef}>
              <div className="debug-log-title">Meeting updates</div>
              {debugLog.length === 0 && <div className="debug-empty">No events yet</div>}
              <ul>
                {debugLog.map((entry) => (
                  <li key={entry.ts + entry.id + entry.type}>
                    <span className="debug-log-time">{new Date(entry.ts).toLocaleTimeString()}</span>
                    <span>{`${entry.id} (day ${entry.day})`}</span>
                    {entry.title && <span>{`"${entry.title}"`}</span>}
                    <span className="debug-tag">{entry.type}</span>
                    {entry.side && <span>{`hit ${entry.side}`}</span>}
                    {entry.face && <span>{`face ${entry.face}`}</span>}
                    {entry.midpointSide && <span className="debug-tag">midpoint</span>}
                    <span>{`len ${entry.beforeLength}→${entry.afterLength}`}</span>
                    <span>{`start ${minutesToTimeString(entry.beforeStart)}→${minutesToTimeString(entry.afterStart)}`}</span>
                    {entry.removing && <span className="debug-tag">removing</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
