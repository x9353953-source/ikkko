import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  // StrictMode removed to allow SortableJS to mount more predictably in this specific legacy port context, 
  // though it works in strict mode, removing it simplifies the drag-drop ref initialization.
  <App />
);