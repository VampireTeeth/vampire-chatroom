var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache= {};

var server = http.createServer(function (request, response) {
    var filePath = false;
    if(request.url == '/') {
        filePath = 'public/index.html';
    } else {
        filePath = 'public' + request.url;
    }

    var absPath = './' + filePath;
    console.log('serving static ' + absPath);
    serveStatic(response, cache, absPath);
});

server.listen(3000, function(){
    console.log('Server listening on 3000....');
});

function send404(response) {
    response.writeHead(404, {'Content-Type' : 'text/plain'});
    response.write('Error 404: resource not found.');
    response.end();
}

function sendFile(response, filePath, fileContents) {
    response.writeHead(
        200, 
        {'Content-Type' : mime.lookup(path.basename(filePath))}
    );
    response.end(fileContents);
}

function serveStatic(response, cache, abspath) {
    if(cache[abspath]) {
        sendFile(response, abspath, cache[abspath])
    } else {
        var readFinished = readFinishedCallback(response, abspath);
        fs.exists(abspath, existsFinishedCallback(response, abspath, readFinished));
    }
}

function existsFinishedCallback(response, abspath, readFinished) {
    return function (exists) {
        if(exists) {
            fs.readFile(abspath, readFinished);
        } else {
            send404(response);
        }
    }
}

function readFinishedCallback(response, abspath) {
    return function (err, data) {
        if(err) {
            send404(response);
        } else {
            sendFile(response, abspath, data);
        }
    }
}
