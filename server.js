const express = require("express");
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const stringToObject = require('mongodb').ObjectID

///Must be full path to save to the right location. 
var upload = multer({ dest: path.join(__dirname, './productsImages') }); 
//var upload = multer({ dest: 'productsImages/' }); 

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set("port", process.env.PORT || 3001);
app.use("/productsImages", express.static(__dirname + "/productsImages"));//point to productImages if requested otherwise get from build location
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

app.get('/admin',function(req,res){
 res.sendFile(path.join(__dirname+'/client/build/admin.html'));
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
        productsCollection.count({ categories:{$regex : category}},function(err, count) {
            if(count > 0 ){
		        productsCollection.find({ categories: {$regex : category}}).toArray(function(err,items){
		            let obj = {
		                name:category,
		                products:items
		            }
		            res.send(obj);
		        });
            }else{
	            let obj = {
	                name:category,
	                products:[]
	            }
	            res.send(obj);
            }
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
        if(!req.file){
            error.push("Need to upload a picture for product");
            isError = true;
        }else{
            if(!req.file.originalname.includes(".png") && !req.file.originalname.includes(".jpg")){
	            error.push("Uploaded files does not have the extension png or jpeg");
	            isError = true;
            }
        }
        if(!req.body.name || req.body.name == "null" || req.body.name == ""){
            error.push("Product needs a name");
            isError = true;
        }
        if(!req.body.description || req.body.description == "null" || req.body.description == ""){
            error.push("Product needs a description");
            isError = true;
        }
        if(!req.body.info || req.body.info == "null" || req.body.info == ""){
            error.push("Need to provide info for this product");
            isError = true;
        }else{
            let array = req.body.info.split(" ");
            console.log("Array: " + JSON.stringify(array));
            array.map((el)=>{
	            if(el.split(":").length !== 2 && !isError){
	                error.push("Info not name:value pair in input.");
	                isError = true;
	            }
            });
        }
        if(!req.body.categories || req.body.categories == "null" || req.body.categories == ""){
            error.push("Need to put the product in one or more categories.");
            isError = true;
        }
        if(!req.body.number|| req.body.number == "null" || req.body.number == ""){
            error.push("Add the number of products");
            isError = true;
        }
        console.log("Error: " + error);
        if(isError){
            res.send(error);
            //Remove file saved if we have an error.
            if(req.file){
                fs.unlink(path.join(__dirname, './productsImages', req.file.filename));
            }
        }else{
            let pathFile = "/productsImages/"+req.file.originalname;
		    let body = Object.assign(req.body,{file:pathFile});
		    console.log("Product uploaded: " + JSON.stringify(body));
		    productsCollection.count({'name':body.name},function(err, count) {            
		      console.log("Count " + count);
		      if(count > 0){
                if(req.file){
                    fs.unlink(path.join(__dirname, './productsImages', req.file.filename));
                }
		        res.send(["This product already exists. (Change the name)"]);
		      }else{
                productsCollection.count({'file':pathFile},function(err, count) {
                    if(count > 0){
                        if(req.file){
                            fs.unlink(path.join(__dirname, './productsImages', req.file.filename));
                        }
                        res.send(["The name of the picture already exists. Rename it"]);
                    }else{
				        productsCollection.insert(body, {w:1}, function(err, result) {
				            console.log("Added. Result: " +  JSON.stringify(result));
                            //Must rename the file to match what was passed in
                            fs.rename(path.join(__dirname, './productsImages', req.file.filename) , path.join(__dirname, './productsImages', req.file.originalname));
				            res.send(["Product Added"]);
				        });
                    }
                });
		      }
		    });

        }
    }
});



app.post('/update-product',upload.single('file'), function(req,res,next){
    console.log("Input strings: " + JSON.stringify(req.body));
    if(productsCollection != null){
        let error = [];
        let isError = false;
        let isFileChange = false;
        if(typeof req.file !== "undefined" && req.file !== null){//Only need to check extension if file passed.
            isFileChange = true;
            if(!req.file.originalname.includes(".png") && !req.file.originalname.includes(".jpg")){
                isError = true;
                error.push("Uploaded files does not have the extension png or jpeg");
            }
            let pathFile = "/productsImages/"+req.file.originalname
            productsCollection.count({$and:[ 
                    {'file':pathFile}, 
                    {'_id':{ $ne: stringToObject(req.body.id) }}  
                ]},
                function(err, count) {
	                if(count > 0){
	                    isError = true;
	                    error.push("The name of picture exists. Rename it.");
	                }
                }
            );
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
            if(isFileChange){
	            productsCollection.findOne({_id:stringToObject(req.body.id)}, function(err, result){
                    //Delete old file
                    console.log("dir: " + __dirname + " file: " + result.file )  
                    fs.unlink(path.join(__dirname ,result.file));
                    //Save new file with the original name.
                    fs.rename(path.join(__dirname, './productsImages', req.file.filename) , path.join(__dirname, './productsImages', req.file.originalname));
	            });
            }
            productsCollection.find(
                {
                    _id:{ $ne: stringToObject(req.body.id) }, ////Must convert from string to mongoDb object
                    name:req.body.name 
                }
            ).count(function(err, count) {            
              console.log("Update Count: " + count);
              if(count > 0){
                if(isFileChange){
                    fs.unlink(path.join(__dirname, './productsImages', req.file.filename));
                }
                res.send(["This product already exists. (Change the name)"]);
              }else{
                if(isFileChange){//If file added then update everything.
                    let pathFile = "/productsImages/"+req.file.originalname;
                    let body = Object.assign(req.body,{file:pathFile});
                    console.log("Product uploaded: " + JSON.stringify(body));
	                productsCollection.update({_id:stringToObject(req.body.id)},body, function(err, result) {
	                    res.send(["Product Updated (with new image)"]);
	                });
                }else{
                    productsCollection.update({_id:stringToObject(req.body.id)},{$set: {
                        name:req.body.name,
                        description:req.body.description,
                        info:req.body.info,
                        number:req.body.number,
                        categories:req.body.categories
                        }}, 
                        function(err, result) {
                            console.log("Added. Result: " +  JSON.stringify(result));
                            res.send(["Product Updated(No new image)"]);
                        }
                    );
                }
              }
            });
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
    console.log("Category uploaded: " +  JSON.stringify(req.body));
    if(categoriesCollection != null){
        categoriesCollection.count({productCategory:req.body.productCategory},function(err,count){
            if(count > 0){
                res.send(["This category already exists"]);
                console.log("Category already exists");
            }else{
	            if(typeof req.body.productCategory === "undefined" || req.body.productCategory == null || req.body.productCategory == "null" || req.body.productCategory == ""){
	                res.send(["Category is empty"]);
                    console.log("Category is Empty");
	            }else{
	                categoriesCollection.insert(req.body, {w:1}, function(err, result) {
                        res.send(["Category Added"]);
	                    console.log("Category added. Result: " +  JSON.stringify(result));
	                });
	            }
            }
        });
    }else{
        console.log("Failed to add category info.");
    }
});


app.post('/account',function(req,res){
    console.log("Post account " + JSON.stringify(req.body));
    if(accountsCollection != null){
        accountsCollection.find({name:req.body.name}).count(function(err,count){
            if(count == 0 ){//If no name found then assume new and create account
                if(typeof req.body.email !== "undefined"){
                    let obj = {
	                    name:req.body.name,
	                    email:req.body.email,
	                    bought:[],
	                    looked:[]
                    }
		            accountsCollection.insert(obj,{w:1}, function(err, result) {
			                res.send({bought:obj.bought,looked:obj.looked});
			                console.log("Category added with email. Result: " +  JSON.stringify(result));
	                });
                }else{
                    let obj = {
                        name:req.body.name,
                        bought:[],
                        looked:[]
                    }
                    accountsCollection.insert(obj,{w:1}, function(err, result) {
                            res.send({bought:obj.bought,looked:obj.looked});
                            console.log("Category added without email. Result: " +  JSON.stringify(result));
                    });
                }
            }else if(count == 1){//We already have an entry so just send it back.
                accountsCollection.findOne({name:req.body.name}, function(err, result){
                    console.log("Found account. Send");
                    res.send({bought:result.bought,looked:result.looked});
                });
            }else{//If we have two entries then look for email to try to work out who they are.
                if(typeof req.body.email !== "undefined"){
                    accountsCollection.find({name:req.body.email}).count(function(err,count){
                        if(count == 1){//If we find unique email then send that
                            accountsCollection.findOne({_id:stringToObject(req.body.id)}, function(err, result){
                                console.log("Found account with email. Send");
                                res.send({bought:result.bought,looked:result.looked});
                            });
                        }
                        else{//Multiple entries or none so send nothing
                            console.log("Email and name repeated. Who are you???");
                            res.send({});
                        }
                    });
                }else{
                    console.log("No way to identify you. Same name as someone else and no email address.");
                    res.send({});
                }
            }
        });
    }
});
//GET products in chronological order customers were looking at. 
//Query Accounts for most recent searches to oldest.
//Return block of products  
app.get('/others/:start/:end',function(req,res){


});

app.listen(app.get("port"), () => {});
