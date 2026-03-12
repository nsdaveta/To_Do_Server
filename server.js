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

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    
    // Use this regex for Express 5 catch-all
    app.get(/^(?!\/todos).+/, (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
    });
}

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/todos';

 mongoose.connect(MONGO_URI).then(()=>console.log("Connected To Database"));
 app.listen(PORT, () => {console.log(`Server is listening on port ${PORT}`);});