const express = require("express");
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;

///Must be full path to save to the right location. 
var upload = multer({ dest: path.join(__dirname, './productsImages') }); 
//var upload = multer({ dest: 'productsImages/' }); 

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


app.get('/products/:category',function(req,res){
    var category = req.params.category;
    let data = []
    console.log("Query category: " + category);
    if(productsCollection !== null){
        productsCollection.find({ productCategories: category }).toArray(function(err,items){
            for (let i = 0 ; i < items.length; i++){
                console.log("Product: " + i + "  " + JSON.stringify(items[i]));
                data.push(
                    {
                        title:items[i]["productName"],
                        description:null,
                        info:null,
                        pic:null,
                        price:null
                    }
                );
            }
            res.send(data);
        });
    }else{
        console.log("Failed to get products");
    }
});


app.post('/product',upload.single('file'), function(req,res,next){
    console.log("Input strings: " + JSON.stringify(req.body));
    if(productsCollection != null){
        let error = [];
        let isError = false;
        if(typeof req.file === "undefined" || req.file === null){
            error.push("Need to upload a picture for product");
            isError = true;
        }
        if(typeof req.body.name === "undefined" || req.body.name == null || req.body.name == "null" || req.body.name == ""){
            error.push("Product needs a name");
            isError = true;
        }
        if(typeof req.body.description === "undefined" || req.body.description == null || req.body.description == "null" || req.body.description == ""){
            error.push("Product needs a description");
            isError = true;
        }
        if(typeof req.body.info === "undefined" || req.body.info == null || req.body.info == "null" || req.body.info == ""){
            error.push("Need to provide info for this product");
            isError = true;
        }
        if(typeof req.body.categories === "undefined" || req.body.categories == null || req.body.categories == "null" || req.body.categories == ""){
            error.push("Need to put the product in one or more categories.");
            isError = true;
        }
        if(typeof req.body.number === "undefined" || req.body.number == null || req.body.number == "null" || req.body.number == ""){
            error.push("Add the number of products");
            isError = true;
        }
        console.log("Error: " + error);
        if(isError){
            res.send(error);
        }else{
		    let body = Object.assign(req.body,{file:req.file.originalname});
		    console.log("Product uploaded: " + JSON.stringify(body));
		    productsCollection.count({'name':body.name},function(err, count) {            
		      console.log("Count " + count);
		      if(count > 0){
		        res.send("This product already exists. (Change the name)");
		      }else{
		        productsCollection.insert(body, {w:1}, function(err, result) {
		            console.log("Added. Result: " +  JSON.stringify(result));
		            res.send("Product Added");
		        });
		      }
		    });
		    //Must rename the file to match what was passed in
		    fs.rename(path.join(__dirname, './productsImages', req.file.filename) , path.join(__dirname, './productsImages', req.file.originalname));
        }
    }
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
    console.log("Post account " + req.body.name);
    if(accountsCollection != null){
        ///let itemsNum = null; Can't pass this into array????
        accountsCollection.find({name:req.body.name}).toArray(function(err,it){
            console.log("Item number(inside): " + it.length);
	        if(it.length === 0){
	            accountsCollection.insert(req.body, {w:1}, function(err, result) {
	                console.log("Account added. Result: " +  JSON.stringify(result));
	            });
	        }else{
	            accountsCollection.update( { name: req.body.name }, { $addToSet: { title: { $each: req.body.title } } },function(err,result){
	                console.log("Account updated. Result: " +  JSON.stringify(result));
	            } );
	        }
        });
    }
});

app.get('/account',function(req,res){
    console.log("Get account");
    if(accountsCollection != null){
        let items = [];
        accountsCollection.find({name:req.body.name}).toArray(function(err,it){
            for(let i=0; i< items.length ; i++){
                items.push(it["title"])
            }
            res.send(items);
        });
    }
});
//GET products in chronological order customers were looking at. 
//Query Accounts for most recent searches to oldest.
//Return block of products  
app.get('/others/:start/:end',function(req,res){

});

app.listen(app.get("port"), () => {});
