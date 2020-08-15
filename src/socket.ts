import http from 'http';
import socketIO from 'socket.io';
import uuid from 'uuid-random';

const arrMessagesDB = [{ id: '', userDe: '', userPara: '', message: '' }];

export default class Socket {
	private server: http.Server;
	private port: number;
	private io: socketIO.Server;

	constructor(port: number, app: http.RequestListener) {
		this.port = port;
		this.server = new http.Server(app);
		this.io = socketIO(this.server);

		this.io.on('connection', (socket: socketIO.Socket) => {
			console.log(socket.id + ' - Socket conectado');

			//Envios padrão para o socket ao conectar
			//socket.emit('message', 'Olá ' + socket.id);

			//Escuta (caso o app envie cai aqui)
			socket.on('login', (userDe, userPara) => {
				//Iniciando Login
				console.log(socket.id + ' - (login)');
				//Recuperando/criando sala
				const room = this.retornaRoom(userDe, userPara);
				//Recuperando mensagens antigas e enviando
				const oldMsg = arrMessagesDB.filter(r => {
					return r.id === room && r.message !== '';
				});
				if (oldMsg.length > 0) {
					socket.emit('oldmessages', oldMsg);
				}

				console.log(`${socket.id} - sala - ${room})`);
				socket.join(room);
				socket.handshake.headers.user = userDe;
				socket.handshake.headers.sala = room;
			});

			//Escuta (caso o app envie cai aqui)
			socket.on('messageroom', (msg, userDe, userPara) => {
				if (socket.handshake.headers.sala) {
					try {
						//Criando a mensagem
						const mensagem = { id: socket.handshake.headers.sala, userDe, userPara, message: msg };
						//gravando no historico
						arrMessagesDB.push(mensagem);
						//Envia a msg para a sala
						this.io.to(socket.handshake.headers.sala).emit('messageroom', mensagem);
						//console.log(`${socket.id} - (message) - ${msg} to ${socket.handshake.headers.sala}`);
					} catch (error) {
						const erro = {
							id: socket.handshake.headers.sala,
							userDe,
							userPara,
							message: 'Erro ao enviar ensagem',
						};
						this.io.to(socket.handshake.headers.sala).emit('messageroom', erro);
					}

					//Se o userPara não está conectado enviar o Push (firebase)
					if (!this.isUserConnected(userPara)) {
						console.log(`Enviando notificação para ${userPara}`);
					}
				}
			});

			//Escuta de desconexão
			socket.on('disconnect', () => {
				console.log(socket.id + ' - Socket desconectado');
			});
		});

		//Teste de varios envios globais
		setInterval(() => {
			this.io.emit('ping', new Date().toISOString());
		}, 1000);

		//Exibir qtde de sockets conectados
		setInterval(() => {
			console.log(Object.keys(this.io.sockets.sockets).length);
		}, 10000);
	}

	public isUserConnected(user: string) {
		// Object.keys(io.sockets.sockets).forEach(element => {
		// 	console.log(
		// 		' - user: ' +
		// 			io.sockets.sockets[element].handshake.headers.user +
		// 			' - sala: ' +
		// 			io.sockets.sockets[element].handshake.headers.sala,
		// 	);
		// });

		// for (var socketId in io.sockets.sockets) {
		// 	console.log(
		// 		' - user: ' +
		// 			io.sockets.sockets[socketId].handshake.headers.user +
		// 			' - sala: ' +
		// 			io.sockets.sockets[socketId].handshake.headers.sala,
		// 	);
		// }

		//console.log(Array(io.sockets.sockets));

		const isUserConnected = Object.values(this.io.sockets.sockets).filter(socket => {
			return socket.handshake.headers.user === user && socket.connected;
		})[0];
		return isUserConnected;
	}

	public retornaRoom(userDe: string, userPara: string) {
		//Tenta encontrar a sala para os usuários em questão
		const room = arrMessagesDB.filter(r => {
			return (r.userDe === userDe && r.userPara === userPara) || (r.userDe === userPara && r.userPara === userDe);
		})[0];

		//Caso não tenha a sala cria uma nova
		if (room) {
			return room.id;
		} else {
			const idSala = uuid();
			//Precisa inclluir algo pois se os 2 usuários abrirem o chat, e realizar o login
			//vão entrar em salas diferentes, no caso o primeiro que entrar cria a sala para os 2
			arrMessagesDB.push({ id: idSala, userDe, userPara, message: '' });
			return idSala;
		}
	}

	public start() {
		this.server.listen(this.port);
		console.log('Socket disponivel');
	}
}
