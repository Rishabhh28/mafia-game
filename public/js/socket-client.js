/* global io */

function connectSocket() {
  return io({ autoConnect: true });
}

function attachCommonErrors(socket) {
  socket.on('error', ({ message }) => showError(message));
  socket.on('connect_error', () => showError('Cannot reach the server.'));
}

function joinRoom(socket) {
  socket.emit('room:join', {
    code: GameState.code,
    playerName: GameState.name,
    uuid: GameState.uuid,
  });
}
