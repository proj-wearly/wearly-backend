import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'wearly backend running' });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});