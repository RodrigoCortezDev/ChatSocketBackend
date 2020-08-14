import http from 'http';
import socketIO from 'socket.io';
import uuid from 'uuid-random';

const rooms = [{ id: '', userDe: '999', userPara: '999' }];

export default class Socket {
	private server: http.Server;
	private port: number;

	constructor(port: number, app: http.RequestListener) {
		this.port = port;
		this.server = new http.Server(app);
		const io: socketIO.Server = socketIO(this.server);

		io.on('connection', (socket: socketIO.Socket) => {
			console.log(socket.id + ' - Socket conectado');

			//Envios padrão para o socket ao conectar
			socket.emit('message', 'Olá ' + socket.id);

			//Escuta (caso o app envie cai aqui)
			socket.on('login', (userDe, userPara) => {
				console.log(socket.id + ' - (login)');
				const room = this.retornaRoom(userDe, userPara);
				if (room) {
					console.log(`${socket.id} - (logado - ${room})`);
					socket.join(room);
					socket.handshake.headers.sala = room;
				}
			});

			//Escuta (caso o app envie cai aqui)
			socket.on('messageroom', (msg, userDe, userPara) => {
				//tenta achar a sala dos usuarios
				//const room = this.retornaRoom(userDe, userPara);

				if (socket.handshake.headers.sala) {
					//Envia a msg para a sala
					io.to(socket.handshake.headers.sala).emit('messageroom', msg);

					//Enviando para sala
					console.log(`${socket.id} - (message) - ${msg} to ${socket.handshake.headers.sala}`);
				}
			});

			//Escuta de desconexão
			socket.on('disconnect', () => {
				console.log(socket.id + ' - Socket desconectado');
			});
		});

		//Teste de varios envios globais
		setInterval(() => {
			io.emit('ping', new Date().toString());
		}, 1000);

		//Exibir qtde de sockets conectados
		// setInterval(() => {
		// 	console.log(Object.keys(io.sockets.sockets).length);
		// }, 5000);
	}

	public retornaRoom(userDe: string, userPara: string) {
		//Tenta encontrar a sala para os usuários em questão
		const room = rooms.filter(r => {
			return (r.userDe === userDe && r.userPara === userPara) || (r.userDe === userPara && r.userPara === userDe);
		})[0];

		//Caso não tenha a sala cria uma nova
		if (room) {
			return room.id;
		} else {
			const idSala = uuid();
			rooms.push({ id: idSala, userDe, userPara });
			return idSala;
		}
	}

	public start() {
		this.server.listen(this.port);
		console.log('Socket disponivel');
	}
}
