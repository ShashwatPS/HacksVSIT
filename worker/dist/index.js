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
const redis_1 = require("redis");
const client_1 = require("@prisma/client");
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
let prisma = new client_1.PrismaClient();
const Redis = (0, redis_1.createClient)({
    password: '93yDM29DC2XjVXPigsSerWvXaY6yFbYk',
    socket: {
        host: 'redis-15621.c305.ap-south-1-1.ec2.cloud.redislabs.com',
        port: 15621
    }
});
Redis.on('error', err => console.log('Redis Client Error', err));
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.use((0, cors_1.default)());
const httpServer = app.listen(3000);
function startWorkwer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield Redis.connect();
            console.log("Worker connected to Redis");
            while (true) {
                try {
                    const submission = yield Redis.brPop("posts", 0);
                    console.log("This is the worker");
                    const { email, image, latitude, longitude } = JSON.parse(submission.element);
                    const imageData = JSON.parse(image);
                    const finalURL = imageData.signedUrl;
                    console.log(finalURL);
                    const data = {
                        url: finalURL
                    };
                    console.log(email);
                    console.log(image);
                    console.log(latitude);
                    console.log(longitude);
                    console.log("The model will start working now");
                    const response = yield fetch('http://ec2-13-232-224-92.ap-south-1.compute.amazonaws.com:3000/upload/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                    });
                    const responseBody = yield response.json();
                    console.log(responseBody.description);
                    console.log(responseBody.sentiment);
                    const user = yield prisma.user.findUnique({
                        where: {
                            email: email
                        }
                    });
                    const newPost = yield prisma.post.create({
                        data: {
                            content: responseBody.description,
                            longitude: longitude,
                            latitude: latitude,
                            image: finalURL,
                            sentiment: responseBody.sentiment,
                            censor: "true",
                            userId: user.id
                        }
                    });
                    console.log("New post created:", newPost);
                }
                catch (error) {
                    console.error("Error processing submission: ", error);
                }
            }
        }
        catch (error) {
            console.error("Failed to connect to Redis", error);
        }
    });
}
startWorkwer();
app.post('/signUp', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, firstname, lastname, MobileNo, password } = req.body;
    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }
    try {
        let user = yield prisma.user.findUnique({
            where: {
                email: email.toString()
            }
        });
        if (!user) {
            user = yield prisma.user.create({
                data: {
                    email,
                    firstname,
                    lastname,
                    MobileNo,
                    password
                }
            });
            console.log();
            res.json({ created: true, user });
        }
        else {
            res.json({ created: false, user });
        }
    }
    catch (error) {
        console.error('Error querying/creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
app.post('/signIn', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield prisma.user.findUnique({
            where: {
                email: email,
                password: password
            }
        });
        if (user) {
            return res.json({ user });
        }
        else {
            return res.json({ message: 'User does not exist' });
        }
    }
    catch (error) {
        console.error('Error checking user:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}));
app.post('/createPost', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, content, longitude, latitude, image, sentiment, censor } = req.body;
    try {
        const user = yield prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const post = yield prisma.post.create({
            data: {
                content,
                longitude,
                latitude,
                image,
                sentiment,
                censor,
                userId: user.id
            }
        });
        return res.json({ post });
    }
    catch (error) {
        console.error('Error creating post:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}));
app.get('/userPosts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, censor } = req.body;
    try {
        const user = yield prisma.user.findUnique({
            where: {
                email: email.toString()
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userPosts = yield prisma.post.findMany({
            where: {
                userId: user.id,
                censor: "true"
            }
        });
        return res.json({ userPosts });
    }
    catch (error) {
        console.error('Error getting user posts:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}));
app.delete('/deletePost', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.body;
    if (!postId) {
        return res.status(400).json({ error: 'Post ID is required in the request body' });
    }
    try {
        const post = yield prisma.post.findUnique({
            where: {
                id: parseInt(postId)
            }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        yield prisma.post.delete({
            where: {
                id: parseInt(postId)
            }
        });
        return res.json({ message: 'Post deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting post:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}));
app.get('/getpostId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.body;
    try {
        const post = yield prisma.post.findUnique({
            where: {
                id: parseInt(postId)
            },
            include: {
                User: true
            }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        return res.json({ post });
    }
    catch (error) {
        console.error('Error getting post:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}));
app.put('/postcensor', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.body;
    try {
        const post = yield prisma.post.findUnique({
            where: {
                id: parseInt(postId)
            }
        });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        let updatedCensor;
        if (post.censor === "true") {
            updatedCensor = "false";
        }
        else if (post.censor === "false") {
            updatedCensor = "true";
        }
        else {
            // Handle unexpected censor values
            return res.status(400).json({ error: 'Invalid censor value' });
        }
        const updatedPost = yield prisma.post.update({
            where: {
                id: parseInt(postId)
            },
            data: {
                censor: updatedCensor
            }
        });
        return res.json({ message: 'Censor value updated successfully', post: updatedPost });
    }
    catch (error) {
        console.error('Error updating censor value:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}));
app.get('/posts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const posts = yield prisma.post.findMany();
        return res.json({ posts });
    }
    catch (error) {
        console.error('Error fetching posts:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}));
app.post('/admin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    try {
        const admin = yield prisma.admin.findFirst({
            where: { username: username, password: password }
        });
        if (admin) {
            return res.status(200).json({ message: "Yes" });
        }
        else {
            return res.status(200).json({ message: "No" });
        }
    }
    catch (error) {
        console.error('Error during admin login:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
