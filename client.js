const express = require("express")
const bodyParser = require("body-parser")
const axios = require("axios").default
const { randomString, timeout } = require("./utils")

const config = {
    port: 9000,

    clientId: "my-client",
    clientSecret: "zETqHgl0d7ThysUqPnaFuLOmG1E=",
    redirectUri: "http://localhost:9000/callback",

    authorizationEndpoint: "http://localhost:9001/authorize",
    tokenEndpoint: "http://localhost:9001/token",
    userInfoEndpoint: "http://localhost:9002/user-info",
}
let state = ""

const app = express()
app.set("view engine", "ejs")
app.set("views", "assets/client")
app.use(timeout)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

/*
Your code here
*/
app.get('/authorize', (req, res) => {
    state = randomString();
    const response_type = `response_type=code`
    const client_id = `client_id=${config.clientId}`
    const redirect_uri = `redirect_uri=${config.redirectUri}`
    const client_secret = `client_secret=${config.clientSecret}`
    const scope = `scope=permission:name permission:date_of_birth`

    let redUrl = `${config.authorizationEndpoint}?${response_type}&${client_id}&${client_secret}&${redirect_uri}&${scope}&state=${state}`;
    res.redirect(redUrl)
})

app.get('/callback', async (req, res) => {
    if (req.query.state !== state) {
        res.status(403).end()
        return
    }
    const { code } = req.query
    const { access_token } = (await axios({
        url: config.tokenEndpoint,
        method: 'POST',
        auth: {
            username: config.clientId,
            password: config.clientSecret
        },
        data: { code: code },
        validateStatus: null
    })).data;

    const userInfo = await axios({
        url: config.userInfoEndpoint,
        method: 'GET',
        headers: {
            authorization: `bearer ${access_token}`,
        }
    })
    res.render("welcome", { user: userInfo.data })

    res.status(200).end()
})
const server = app.listen(config.port, "localhost", function () {
    var host = server.address().address
    var port = server.address().port
})

// for testing purposes

module.exports = {
    app,
    server,
    getState() {
        return state
    },
    setState(s) {
        state = s
    },
}
