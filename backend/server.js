const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

const app = express();
dotenv.config();

//Middleware
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('API is running...');
});

PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});