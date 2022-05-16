const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');


const app = express();
app.use(cors());


const server = http.createServer(app);

// Create socket server instance
const io = new socketio.Server(server, {
  cors: {
    origin: ['http://localhost:3000']
  }
});

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Create the roomlist and userlist
let roomsList = [];
let userlist = [];
let chatMessageList = [];


// Run when client connects
io.on('connection', (socket) => {
  console.log('new ws connection');

  // Single client emit, Welcome current user
  socket.emit('message', `Welcome to chat. Your socket id is ${socket.id}`);

  // Create room
  socket.on('createRoom', user => {

    // If room doesn't exist create room, else send error message to user socket id
    if (roomsList.indexOf(user.roomName) < 0) {

      // Connect socket instance to room
      socket.join(user.roomName);

      // Push new user and roomname to their own lists
      userlist.push(user);
      roomsList.push(user.roomName);

      // emit createRoom message to front end
      io.to(socket.id).emit('createRoom', {...user, roomsList: roomsList});

      // Update room list for all instances
      io.emit('updateRoomList', roomsList);

      // Update user list
      var listOfUsers = userlist.map(item => {
        if (item.roomName === user.roomName) {
          return item.username;
        }
      }).filter(item => item !== undefined);
      console.log(listOfUsers);

      io.in(user.roomName).emit('updateUserList', listOfUsers);

      // Log the username and roomname to terminal
      console.log(`User ${user.username} has created room ${user.roomName}`);

    } else {

      // emit error message to user with matching socket id
      io.to(socket.id).emit('createRoomError', user.roomName);
    }
  })

  // Run when client emits joinRoom
  socket.on('joinRoom', body => {

    // If room exists send error message to socket id, else push the new user to roomlist and emit it
    if (roomsList.includes(body.roomName)) {

      // Connect socket instance to room
      socket.join(body.roomName);

      // Filter userlist and emit to client
      userlist.push(body);
      var listOfUsers = userlist.map(item => {
        if (item.roomName === body.roomName) {
          return item.username;
        }
      }).filter(item => item !== undefined);

      io.in(body.roomName).emit('updateUserList', listOfUsers);

      // Emit new user to other users
      io.to(socket.id).emit('joinRoom', { ...body, userList: listOfUsers });

      //console.log(`User ${body.username} has joined the room`);

      // Emit chat messages of the room to new user that joined the room
      const filteredList = [...chatMessageList].filter(message => message.roomname === body.roomName);
      io.to(socket.id).emit('chatMessage', filteredList);

    } else {
      // Send error to user if room doesn't exist
      io.to(socket.id).emit('joinRoomError', body.roomName);
    }

  })

  // chat messages
  socket.on('chatMessage', (msg) => {

    //socket.join(msg.roomname);
    console.log(`Socket received chat message ${msg.message} from room ${msg.roomname} on the back end`);
    chatMessageList.push(msg)

    const filteredList = [...chatMessageList].filter(message => message.roomname === msg.roomname);
    io.in(msg.roomname).emit('chatMessage', filteredList);
  })


})

// listen to enviroment port or port 3003
const PORT = process.env.PORT || 3003;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));