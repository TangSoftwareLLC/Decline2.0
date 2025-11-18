import React from 'react';
import './Calendar.css';

const Calendar = () => {
  // Get current date and calculate the start of the week (Sunday)
  const today = new Date();
  const currentDay = today.getDay(); // 0 (Sunday) to 6 (Saturday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - currentDay);
  
  // Generate week days (Sunday to Saturday)
  const weekDays = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    weekDays.push({
      fullName: dayNames[date.getDay()],
      shortName: shortDayNames[date.getDay()],
      date: date.getDate(),
      month: date.getMonth() + 1,
      isToday: date.toDateString() === today.toDateString()
    });
  }
  
  // Generate time slots from 9 AM to 5 PM
  const timeSlots = [];
  for (let hour = 9; hour <= 17; hour++) {
    timeSlots.push({
      hour,
      displayHour: `${hour === 12 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`
    });
  }

  return (
    <div className="calendar">
      {/* Header with day names */}
      <div className="calendar-header">
        <div className="time-column-header">Time</div>
        {weekDays.map((day, index) => (
          <div 
            key={index} 
            className={`day-header ${day.isToday ? 'today' : ''}`}
          >
            <div className="day-name">{day.shortName}</div>
            <div className="date">
              {day.date}
              {day.isToday && <span className="today-badge">Today</span>}
            </div>
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="calendar-grid">
        {timeSlots.map((timeSlot, timeIndex) => (
          <React.Fragment key={timeIndex}>
            <div className="time-slot-label">
              {timeSlot.displayHour}
            </div>
            
            {weekDays.map((day, dayIndex) => (
              <div 
                key={`${timeIndex}-${dayIndex}`} 
                className={`time-slot ${day.isToday ? 'today' : ''}`}
                data-time={timeSlot.hour}
                data-day={day.shortName.toLowerCase()}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
