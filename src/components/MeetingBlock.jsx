import React from 'react';

const MeetingBlock = ({ title, time, participants = [] }) => {
  return (
    <div className="meeting-block">
      <h3>{title}</h3>
      <p className="meeting-time">{time}</p>
      {participants.length > 0 && (
        <div className="participants">
          <span>Participants: </span>
          <span>{participants.join(', ')}</span>
        </div>
      )}
    </div>
  );
};

export default MeetingBlock;
