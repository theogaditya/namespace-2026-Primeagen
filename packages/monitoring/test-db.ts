import net from 'net';
const host = 'ep-still-wildflower-a4n3nwk3-pooler.us-east-1.aws.neon.tech';
const socket = new net.Socket();
socket.connect(5432, host);
socket.on('error', err => console.error('ERR:', err.message));
socket.on('connect', () => { console.log('CONNECTED!'); socket.destroy(); });
