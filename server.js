const express = require("express");
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const MongoClient = require('mongodb').MongoClient;

var upload = multer({ dest: path.join(__dirname, './productsImages') }); 

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set("port", process.env.PORT || 3001);
app.use(express.static("client/build"));

var accountsCollection = null; 
var productsCollection = null; 
var categoriesCollection = null; 
//Hostname(db) comes from service name provide in docker.compose.
MongoClient.connect("mongodb://db:27017", function(err, db) {
  if(!err) {
    console.log("We are connected");
    db.collection('accounts', function(err, collection) {
        if(!err){
            console.log("Accessed account collection");
            accountsCollection = collection

        }
    });
    db.collection('products', function(err, collection) {
        if(!err){
            console.log("Accessed account products");
            productsCollection = collection

        }
    });
    db.collection('categories', function(err, collection) {
        if(!err){
            console.log("Accessed account categores");
            categoriesCollection = collection

        }
    });
  }
});





app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname+'/client/build/index.html'));
});

app.get('/about',function(req,res){
 res.sendFile(path.join(__dirname+'/client/build/about.html'));
});

app.get('/more',function(req,res){
 res.sendFile(path.join(__dirname+'/client/build/more.html'));
});

app.get('/account',function(req,res){
 res.sendFile(path.join(__dirname+'/client/build/account.html'));
});

app.get('/products',function(req,res){
    if(productsCollection != null){
        productsCollection.find({}).toArray(function(err,items){
            for (let i = 0 ; i < items.length; i++){
                console.log("Product: " + i + "  " + JSON.stringify(items[i]));
            }
            res.send(items);
        });
    }else{
        console.log("Failed to get products");
    }
});

app.post('/product',upload.single('productFile'), function(req,res,next){
    console.log('\n uploaded file %s',  req.file);
    console.log('\n uploaded name %s',  JSON.stringify(req.body));
    if(productsCollection != null){
        productsCollection.insert(req.body, {w:1}, function(err, result) {
        console.log("Added. Result: " +  JSON.stringify(result));
        });
    }else{
        console.log("Failed to add product info.");
    }
    res.redirect('/account');
});

app.get('/categories',function(req,res){
    console.log("Get categories");
    if(categoriesCollection != null){
        categoriesCollection.find({}).toArray(function(err,items){
            let cat = [];
            for (let i = 0 ; i < items.length; i++){
                cat.push(items[i]["productCategory"]);
                console.log("Category: " + i + "  " + JSON.stringify(items[i]["productCategory"]));
            }
            res.send(cat);
        });
    }else{
        console.log("Failed to get products");
    }
});


app.post('/category', function(req,res,next){
    console.log('\n uploaded name %s',  JSON.stringify(req.body));
    if(categoriesCollection != null){
        categoriesCollection.insert(req.body, {w:1}, function(err, result) {
        console.log("Category added. Result: " +  JSON.stringify(result));
        });
    }else{
        console.log("Failed to add product info.");
    }
    res.redirect('/account');
});


app.post('/account',function(req,res){
    console.log("About to add account info: " + req.body);
    if(accountsCollection != null){
	    accountsCollection.insert(req.body, {w:1}, function(err, result) {
            console.log("Added");
        });
    }else{
        console.log("Failed to add account info.");
    }

})

app.listen(app.get("port"), () => {});
