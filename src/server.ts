import express from 'express';
import Socket from './socket';

const app = express();
const objSocket = new Socket(3000, app);
objSocket.start();

// app.listen(3333, () => {
// 	console.log('Server iniciou');
// });
