import React from 'react';
import TrainSeatingChart from './trainSeatingChart';
import 'react-tooltip/dist/react-tooltip.css';
import { Tooltip } from 'react-tooltip';


function App() {
  return (
    <div className="App">
      <h1 className="text-2xl font-bold text-center my-4">Train Seat Reservation</h1>
      <TrainSeatingChart />
    </div>
  );
}

export default App;