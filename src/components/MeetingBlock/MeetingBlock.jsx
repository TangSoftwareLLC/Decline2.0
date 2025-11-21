import React from 'react';
import './MeetingBlock.css';

const MEETING_TITLES = [
  'Team Standup',
  'Product Review',
  'Planning Session',
  'Design Review',
  'Client Meeting',
  'Sprint Retrospective',
  'Tech Sync',
  'One-on-One',
  'Workshop',
  'Q&A Session',
  'Code Review',
  'Strategy Discussion',
  'Demo Day',
  'All Hands',
  'Coffee Chat',
];

const ROOM_NAMES = [
  'Conference Room A',
  'Conference Room B',
  'Meeting Room 101',
  'Meeting Room 202',
  'Board Room',
  'Training Room',
  'Breakout Room 1',
  'Breakout Room 2',
  'Zoom Room',
  'Virtual',
  'Main Conference',
  'Small Conference',
];

const ORGANIZER_NAMES = [
  'John Smith',
  'Sarah Johnson',
  'Michael Chen',
  'Emily Davis',
  'David Wilson',
  'Lisa Anderson',
  'James Brown',
  'Maria Garcia',
  'Robert Taylor',
  'Jennifer Martinez',
  'William Lee',
  'Jessica White',
];

// Random data generation utilities
function generateRandomTitle() {
  return MEETING_TITLES[Math.floor(Math.random() * MEETING_TITLES.length)];
}

function generateRandomRoomInfo() {
  return ROOM_NAMES[Math.floor(Math.random() * ROOM_NAMES.length)];
}

function generateRandomOrganizerInfo() {
  return ORGANIZER_NAMES[Math.floor(Math.random() * ORGANIZER_NAMES.length)];
}

function generateRandomVariant() {
  const variants = ['tentative', 'accepted'];
  return variants[Math.floor(Math.random() * variants.length)];
}

function generateRandomLength() {
  const lengths = [15, 30, 60, 120];
  return lengths[Math.floor(Math.random() * lengths.length)];
}

export const HEIGHT_MAP = {
  15: 20,
  30: 40,
  60: 80,
  120: 160,
};

const MeetingBlock = ({
  variant = generateRandomVariant(),
  length = generateRandomLength(),
  title,
  roomInfo,
  organizerInfo,
}) => {
  const height = HEIGHT_MAP[length] || 40;
  const className = `meeting-block ${variant}`;

  // Generate random values if props are not provided
  const displayTitle = generateRandomTitle();
  const displayRoomInfo = generateRandomRoomInfo();
  const displayOrganizerInfo = generateRandomOrganizerInfo();

  return (
    <div className={className} style={{ height }} aria-label={`meeting ${displayTitle}`}>
      <div className="meeting-content">
        <div className="meeting-title">{displayTitle}</div>
        {length !== 15 && (
          <>
            <div className="meeting-room-info">{displayRoomInfo}</div>
            <div className="meeting-organizer-info">{displayOrganizerInfo}</div>
          </>
        )}
      </div>
    </div>
  );
};

export default MeetingBlock;
