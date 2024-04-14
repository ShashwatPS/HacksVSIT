"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ws_1 = require("ws");
const redis_1 = require("redis");
const Redis = (0, redis_1.createClient)({});
startServer();
Redis.on('error', err => console.log('Redis Client Error', err));
const app = (0, express_1.default)();
const httpServer = app.listen(8080);
const wss = new ws_1.WebSocketServer({ server: httpServer });
wss.on('connection', function connection(ws) {
    ws.on('error', console.error);
    ws.on('message', function message(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // wss.clients.forEach(function each(client) {
            //     if (client.readyState === WebSocket.OPEN) {
            //         client.send(JSON.stringify( data));
            //     }
            // });
            const { user, image } = JSON.parse(data.toString());
            if (user !== undefined && image !== undefined) {
                yield Redis.lPush("posts", JSON.stringify({ user, image }));
                console.log({ "username": user });
                console.log({ "imageURL": image });
            }
            else {
                console.log("Either the image received or user received is NULL");
            }
        });
    });
    ws.send('Hello! Message From Server!!');
});
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield Redis.connect();
            console.log("Connected to redis");
        }
        catch (e) {
            console.log("Error Occured", e);
        }
    });
}
