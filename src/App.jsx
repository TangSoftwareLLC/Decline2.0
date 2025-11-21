import { useEffect, useMemo, useState } from 'react';
import './App.css';
import MeetingBlock from './components/MeetingBlock';

const START_HOUR = 8;
const END_HOUR = 18;
const MEETING_PADDING = 6;
const DEBUG_NOW = false;
const DEBUG_TIME_STRING = '17:50'; // 5:50 PM

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

  const days = useMemo(() => {
    const today = new Date();
    const todayKey = today.toDateString();
    const currentDay = today.getDay(); // 0 = Sun
    const offsetToMonday = (currentDay + 6) % 7; // days since Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - offsetToMonday);

    return Array.from({ length: 5 }, (_, idx) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + idx);
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

  const dayGridHeight = totalSlots * slotHeight;
  const heightForLength = (length) => (length / 15) * slotHeight;
  const nowLineOffset = ((currentMinutes - (START_HOUR * 60)) / 15) * slotHeight;
  const showNowLine = currentMinutes >= START_HOUR * 60 && currentMinutes <= END_HOUR * 60;

  return (
    <div className="page">
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

        <div className="day-columns">
          {days.map((day) => (
            <div key={day.id} className={`day-column${day.isToday ? ' current-day' : ''}`}>
              <div className="day-header">
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
    </div>
  );
}

export default App;
