const mongoose = require('mongoose'); 
require('dotenv').config(); 

const connectdb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB...');
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error.message);
    }
};

// Using CommonJS module.exports instead of export default
module.exports = connectdb;
