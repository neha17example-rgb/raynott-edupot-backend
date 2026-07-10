require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./Route/Route');

const app = express();

// Middleware
app.use(cors({
  origin:[
        'http://localhost:5173',
        'https://raynott-edupot.vercel.app',
        'https://raynott-edupot-one.vercel.app'
    ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],  // optional but good
  allowedHeaders: ['Content-Type', 'Authorization'],     // add if you use auth headers
}));

app.use(express.json({ limit: '10mb' }))

// Routes
app.use('/', routes);

// LOCAL SERVER - Only runs when NOT on Firebase
if (!process.env.FUNCTIONS_TARGET) {  // Firebase sets this env variable
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`server running on http://localhost:${PORT}`);
    
  });
}