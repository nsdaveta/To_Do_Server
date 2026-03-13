require('dotenv').config();
const express=require('express')
const mongoose=require('mongoose')
const TodoRouter=require('./routes/routes.js');
const cors=require('cors');
const path=require('path');

const app=express();
app.use(express.json());
app.use(cors());

app.use('/todos',TodoRouter)

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/todos';

const connectionOptions = {
  tls: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
};

mongoose.connect(process.env.MONGO_URI, connectionOptions)
  .then(() => console.log("✅ Connected To Database"))
  .catch((err) => {
    console.error("❌ Database connection error:", err.message);
    console.error("Full error details:", err);
  });
 app.listen(PORT, () => {console.log(`Server is listening on port ${PORT}`);});