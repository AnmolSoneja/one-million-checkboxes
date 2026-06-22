import http from "node:http";
import express from "express";
import path from "node:path";
import { Server } from "socket.io"
import { publisher, subscriber, redis } from "./redis-connection.js";

const CHECKBOX_SIZE = 100;
const CHECKBOX_STATE_KEY = 'checkbox-state'

//socket io use karna hai isiliye http use karenege usse server banayenge
async function main() {
    const app = express();
    const server = http.createServer(app);
    const PORT = process.env.PORT ?? 8000;
    
    const io = new Server();
    io.attach(server);

    await subscriber.subscribe('internal-server:checkbox:change');
    subscriber.on('message', (channel, message) => {
        if(channel === 'internal-server:checkbox:change') {
            const {index, checked} = JSON.parse(message);
            io.emit('server:checkbox:change', {index, checked});
        }
    })


    //Socket IO handler
    io.on('connection', (socket) => {
        console.log(`Socket connected`, {id:socket.id}); 
        
        socket.on('client:checkbox:change', async (data)=>{
            console.log(`[Socket:${socket.id}]:client:checkbox:change`, data);

            const existingState = await redis.get(CHECKBOX_STATE_KEY);
            
            if(existingState) {
                const remoteData = JSON.parse(existingState);
                remoteData[data.index] = data.checked;
                await redis.set(CHECKBOX_STATE_KEY, JSON.stringify(remoteData));
            }
            else {
                await redis.set(
                    CHECKBOX_STATE_KEY, 
                    JSON.stringify(new Array(CHECKBOX_SIZE).fill(false)),
                );
            }
            publisher.publish('internal-server:checkbox:change', JSON.stringify(data)); //redis server ko bheja whatever user did

        })
    });

    //Express
    app.use(express.static(path.resolve('./public')));
    //iske ander ki files ki access de sakte hain user ko baakiyon ki nahiii allow karta express 

    app.get('/health', (req, res)=> {
        res.json({healthy: true});
    })

    app.get('/checkboxes', async (req, res)=> {
        const existingState = await redis.get(CHECKBOX_STATE_KEY);
        if(existingState) {
            const remoteData = JSON.parse(existingState);
            return res.json({ checkboxes: remoteData });
        }
        return res.json({ checkboxes: new Array(CHECKBOX_SIZE).fill(false) });  
    })

    server.listen(PORT, () =>{
        console.log(`Server running on http://localhost:${PORT}`);
        
    })
}

main();
