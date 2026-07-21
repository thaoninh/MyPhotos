const React = require('react');
const { createRoot } = require('react-dom/client');
const App = require('./App.js');

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(App));
}