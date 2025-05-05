const express = require('express');
const path = require('path');
const app = express();

// Basic middleware
app.use(express.static('public'));

// Basic error handler 
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Server Error');
});

// Simple routes first
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/home.html')); 
});

app.get('/cordai', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/cordai/index.html'));
});

app.get('/cordchain', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/cordchain/index.html'));
});

module.exports = app;
