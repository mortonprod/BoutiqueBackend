const express = require("express");
const path = require('path');
const app = express();

app.set("port", process.env.PORT || 3001);


app.use(express.static("client/build"));

app.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname+'/client/build/index.html'));
})
app.listen(app.get("port"), () => {});
