import { useState } from 'react';
import './App.css';
import MeetingBlock from './components/MeetingBlock';

function App() {
  const [count, setCount] = useState(0);
  
  // Example meeting data
  const exampleMeeting = {
    title: 'Team Standup',
    time: '10:00 AM - 10:30 AM',
    participants: ['Alice', 'Bob', 'Charlie']
  };

  return (
    <div className="app">
      <h1>My React App</h1>
      
      <div className="meeting-container">
        <h2>Upcoming Meetings</h2>
        <MeetingBlock 
          title={exampleMeeting.title}
          time={exampleMeeting.time}
          participants={exampleMeeting.participants}
        />
      </div>
      
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click to see the component in action
      </p>
    </div>
  );
}

export default App;
