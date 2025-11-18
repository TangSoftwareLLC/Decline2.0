import React from 'react';
import './App.css';
import Calendar from './components/Calendar/Calendar';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Weekly Calendar</h1>
      </header>
      <main className="app-content">
        <Calendar />
      </main>
    </div>
  );
}

export default App;
