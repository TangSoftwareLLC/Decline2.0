import { useEffect, useState } from 'react';
import './App.css';
import MeetingBlock from './components/MeetingBlock';

const START_HOUR = 8;
const END_HOUR = 18;
const MEETING_PADDING = 6;

const DAYS = [
  { id: 'mon', label: 'Mon', date: 'Mar 3' },
  { id: 'tue', label: 'Tue', date: 'Mar 4' },
  { id: 'wed', label: 'Wed', date: 'Mar 5' },
  { id: 'thu', label: 'Thu', date: 'Mar 6' },
  { id: 'fri', label: 'Fri', date: 'Mar 7' },
];

const MEETINGS = [
  {
    id: 'm1',
    day: 'mon',
    start: '09:00',
    length: 60,
    variant: 'accepted',
    title: 'Design Review',
    roomInfo: 'Conf Room A',
    organizerInfo: 'Laura Chen',
  },
  {
    id: 'm2',
    day: 'mon',
    start: '13:30',
    length: 30,
    variant: 'tentative',
    title: '1:1 Sync',
    roomInfo: 'Virtual',
    organizerInfo: 'Anthony Ruiz',
  },
  {
    id: 'm3',
    day: 'tue',
    start: '10:00',
    length: 120,
    variant: 'accepted',
    title: 'Product Planning',
    roomInfo: 'Board Room',
    organizerInfo: 'Leadership',
  },
  {
    id: 'm4',
    day: 'wed',
    start: '08:30',
    length: 30,
    variant: 'accepted',
    title: 'Daily Standup',
    roomInfo: 'Breakout 1',
    organizerInfo: 'Delivery Team',
  },
  {
    id: 'm5',
    day: 'thu',
    start: '15:00',
    length: 60,
    variant: 'tentative',
    title: 'Customer Call',
    roomInfo: 'Zoom Room',
    organizerInfo: 'CS Team',
  },
  {
    id: 'm6',
    day: 'fri',
    start: '11:00',
    length: 60,
    variant: 'accepted',
    title: 'Engineering Sync',
    roomInfo: 'Main Conference',
    organizerInfo: 'Eng Leads',
  },
];

const hourMarks = Array.from(
  { length: (END_HOUR - START_HOUR) + 1 },
  (_, idx) => {
    const hour = START_HOUR + idx;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const label = `${displayHour}:00 ${suffix}`;
    return { id: idx, label };
  },
);

const totalMinutes = (END_HOUR - START_HOUR) * 60;
const totalSlots = totalMinutes / 15;

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

  useEffect(() => {
    const onResize = () => setSlotHeight(computeSlotHeight());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const dayGridHeight = totalSlots * slotHeight;
  const heightForLength = (length) => (length / 15) * slotHeight;

  return (
    <div className="page">
      <section className="calendar" style={{ '--slot-height': `${slotHeight}px` }}>
        <div className="time-gutter">
          {hourMarks.map((mark) => (
            <div key={mark.id} className="time-label">
              {mark.label}
            </div>
          ))}
        </div>

        <div className="day-columns">
          {DAYS.map((day) => (
            <div key={day.id} className="day-column">
              <div className="day-header">
                <span className="day-label">{day.label}</span>
                <span className="day-date">{day.date}</span>
              </div>
              <div
                className="day-grid"
                style={{ height: dayGridHeight }}
              >
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
