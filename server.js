require('dotenv').config();
const express=require('express')
const mongoose=require('mongoose')
const TodoRouter=require('./routes/routes.js');
const cors=require('cors');
const path=require('path');

const app=express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/todos',TodoRouter)

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in environment variables! Database connection will fail.");
}

const connectionOptions = {
  tls: true,
  serverSelectionTimeoutMS: 5000,
};

if (MONGO_URI) {
  mongoose.connect(MONGO_URI, connectionOptions)
    .then(() => console.log("✅ Connected To Database"))
    .catch((err) => {
      console.error("❌ Database connection error:", err.message);
    });
}

app.listen(PORT, () => {
    console.log(`🚀 Server is listening on port ${PORT}`);
    console.log(`🌐 Base URL: http://localhost:${PORT}/todos`);
});
 