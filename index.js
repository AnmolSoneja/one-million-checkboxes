import http from "node:http";
import express from "express";
import path from "node:path";
import { Server } from "socket.io"

const CHECKBOX_SIZE = 100;

const state = {
    checkboxes: new Array(CHECKBOX_SIZE).fill(false),
}

//socket io use karna hai isiliye http use karenege usse server banayenge
async function main() {
    const app = express();
    const server = http.createServer(app);
    const PORT = process.env.PORT ?? 8000;
    const io = new Server();
    
    io.attach(server);

    //Socket IO handler
    io.on('connection', (socket) => {
        console.log(`Socket connected`, {id:socket.id}); 
        
        socket.on('client:checkbox:change', (data)=>{
            console.log(`[Socket:${socket.id}]:client:checkbox:change`, data);
            io.emit('server:checkbox:change', data);
            state.checkboxes[data.index] = data.checked;
        })
    });

    //Express
    app.use(express.static(path.resolve('./public')));
    //iske ander ki files ki access de sakte hain user ko baakiyon ki nahiii allow karta express 

    app.get('/health', (req, res)=> {
        res.json({healthy: true});
    })

    app.get('/checkboxes', (req, res)=> {
        return res.json({ checkboxes: state.checkboxes });
        
    })

    server.listen(PORT, () =>{
        console.log(`Server running on http://localhost:${PORT}`);
        
    })
}

main();
