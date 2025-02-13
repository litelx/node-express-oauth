const fs = require("fs")
const express = require("express")
const bodyParser = require("body-parser")
const jwt = require("jsonwebtoken")
const {
    randomString,
    containsAll,
    decodeAuthCredentials,
    timeout,
} = require("./utils")

const config = {
    port: 9001,
    privateKey: fs.readFileSync("assets/private_key.pem"),

    clientId: "my-client",
    clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
    redirectUri: "http://localhost:9000/callback",

    authorizationEndpoint: "http://localhost:9001/authorize",
}

const clients = {
    "my-client": {
        name: "Sample Client",
        clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
        scopes: ["permission:name", "permission:date_of_birth"],
    },
    "test-client": {
        name: "Test Client",
        clientSecret: "TestSecret",
        scopes: ["permission:name"],
    },
}

const users = {
    user1: "password1",
    john: "appleseed",
}

const requests = {}
const authorizationCodes = {}

let state = ""

const app = express()
app.set("view engine", "ejs")
app.set("views", "assets/authorization-server")
app.use(timeout)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

/*
Your code here
*/

app.get('/authorize', (req, res) => {
    let statusCode = 401;
    const client = clients[req.query.client_id];
    if (!client) {
        res.status(statusCode).end();
        return;
    }
    if (!(req.query.scope && containsAll(client.scopes, req.query.scope.split(" ")))) {
        res.status(statusCode).end();
        return;
    }
    statusCode = 200;
    const requestId = randomString();
    requests[requestId] = req.query;
    const params = {
        client,
        scope: client.scopes,
        requestId
    };
    res.render('login', params);

    res.status(statusCode);
});

app.post('/approve', (req, res) => {
    const { userName, password, requestId } = req.body;
    if (!userName || !password || users[userName] !== password) {
        res.status(401).end();
        return;
    }
    const clientReq = requests[requestId];
    delete requests[requestId];
    if (!clientReq) {
        res.status(401).end();
        return;
    }
    if (users[userName] === password) {
        const key = randomString();
        authorizationCodes[key] = {
            clientReq,
            userName
        };
        const redUri = `${clientReq.redirect_uri}?${clientReq.response_type}=${encodeURIComponent(key)}&state=${clientReq.state}`;
        res.redirect(redUri);
        return;
    }
    res.status(401);
});

app.post('/token', (req, res) => {
    if (req.headers.authorization) {
        const { code } = req.body;
        const auth = code && decodeAuthCredentials(req.headers.authorization);
        if (auth && 
            auth.clientSecret === clients[auth.clientId].clientSecret &&
            authorizationCodes[code]) {
            const { clientReq, userName } = authorizationCodes[code];
            delete authorizationCodes[code];
            const payload = { 
                userName,
                scope: clientReq.scope
            };
            const options = {
                algorithm: "RS256",
                expiresIn: 300,
                issuer: "http://localhost:" + config.port,
            };
            const jwtString = jwt.sign(payload, config.privateKey, options);
            const token = {
                access_token: jwtString,
                token_type: 'bearer'
            }
            res.json(token);
        }
    }
    res.status(401).end();
});

const server = app.listen(config.port, "localhost", function () {
    var host = server.address().address
    var port = server.address().port
})

// for testing purposes

module.exports = { app, requests, authorizationCodes, server }
