
const express=require('express');
const mongoose=require('mongoose');
const path = require('path');
const port=process.env.port || 3000;


const app =express();
con

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/',(req,res)=>{
    res.render('index');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});