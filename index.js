var express = require('express');
var ejs = require('ejs');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var multer=require('multer');
var session = require('express-session');
var cookieParser = require('cookie-parser');
const { query } = require('express');
const { cookie } = require('request');
const path = require('path')


var app = express();
console.log("started")

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.listen(8080);
app.use(bodyParser.urlencoded({extended:true}))
app.use(session({secret:"secret"}))
app.use(cookieParser())

var con = mysql.createConnection({
    host:"localhost",
    user:"root",
    port:"3308",
    password:"",
    database:"iwp_project"
});
console.log(con);

const storage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null,'public/img')
    },
    filename: (req, file, cb)=>{
        cb(null,Date.now() + path.extname(file.originalname))
        console.log(file);
    }
});

const upload = multer({storage: storage});


function isProductInCart(cart,id){
    
    for(let i=0; i<cart.length;i++){
        if(cart[i].id == id){
            return true;
        }
    }

    return false;

}

function calculateTotal(cart,req){
    var total = 0;
    for(let i=0; i<cart.length; i++){
        total = total + (cart[i].cost)*(cart[i].quantity);
    }
    if(req.session.discount){
    req.session.total = total - total*(req.session.discount)/100;
    }
    else{
        req.session.total=total;
    }
    return total;
}

app.use(function(req, res, next) {
    res.locals.user = req.session.user;
    next();
});

app.get('/',function(req,res){

    con.query(`SELECT * FROM item`,(err,result,fields)=>{
        res.render('pages/index',{result:result});
    });


})


app.get('/shop',function(req,res){

    con.query(`SELECT * FROM item`,(err,result,fields)=>{
        res.render('pages/shop',{result:result});
    });


});


app.get('/blog',function(req,res){

    con.query(`SELECT * FROM blog`,(err,result,fields)=>{
        console.log(result);
        res.render('pages/blog',{result:result});
    });

});

app.get('/cart',function(req,res){

    if(req.session.user){
    var cart = req.session.cart;
    var total = req.session.total;
    res.render('pages/cart',{cart:cart,total:total});}
    else{
        res.redirect('/login');
    }

});

app.get('/login',function(req,res){

    res.render('pages/login');

});

app.get('/sproduct',function(req,res){

    var product=req.session.product;
    con.query(`SELECT * FROM item`,(err,result,fields)=>{
        res.render('pages/sproduct',{result:result,product:product});
    });
    

});

app.get('/checkout',function(req,res){

    if(req.session.user){
    if(req.session.cart){
    var total = req.session.total;
    res.render('pages/checkout',{total:total});
    }
    else{
        res.redirect('/');
    }
    }
    else{
        res.redirect('/login');
    }

});

app.get('/history',function(req,res){

    var id=req.session.user.id;

    con.query(`SELECT orders.item_id AS pid,orders.quantity AS quantity,orders.img AS img,bill.date AS date FROM orders INNER JOIN bill WHERE orders.bill_id=bill.id AND bill.user_id=?`,[id],(err,result,fields)=>{
        res.render('pages/history',{result:result});

    });

});

app.get('/upload',function(req,res){
    if(req.session.user){
    res.render('pages/upload');
    }
    else{
        res.redirect('/login');
    }
});


app.post('/sproduct',function(req,res){

    var id=req.body.id;
    var name=req.body.name;
    var cost=req.body.cost;
    var img1=req.body.img1;
    var img2=req.body.img2;
    var img3=req.body.img3;
    var img4=req.body.img4;
    var desc=req.body.desc;
    var seller=req.body.seller;
    var category=req.body.category;
    var qty=req.body.qty;

    var product={id:id,name:name,cost:cost,img1:img1,img2:img2,img3:img3,img4:img4,desc:desc,seller:seller,category:category,qty:qty}

    req.session.product=product;
    res.redirect('/sproduct');

});

app.post('/add_to_cart',function(req,res){

    var id=req.body.id;
    var name=req.body.name;
    var cost=req.body.cost;
    var quantity=req.body.pqty;
    var img=req.body.img;
    

    var pro = {id:id,name:name,cost:cost,quantity:quantity,img:img}

    if(req.session.cart){
        var cart = req.session.cart;

        if(!isProductInCart(cart,id)){
            cart.push(pro);
        }
    }
    else{
        
        req.session.cart = [pro];
        var cart = req.session.cart;
    }

    calculateTotal(cart,req);

    res.redirect('/cart');

});

app.post('/remove_product',function(req,res){

    var id = req.body.id
    var cart = req.session.cart;

    for(let i=0; i<cart.length; i++)
    {
        if(cart[i].id == id){
            cart.splice(cart.indexOf(i),1);
        }
    }
    if(cart.length==0){
        delete req.session.cart;
    }

    calculateTotal(cart,req);
    res.redirect('/cart');

});

app.post('/edit_product_quantity',function(req,res){

    var id = req.body.id;
    var quantity = req.body.quantity;
    var increase_btn = req.body.increase_product_quantity;
    var decrease_btn = req.body.decrease_product_quantity;

    var cart = req.session.cart;

    if(increase_btn){
        for(let i=0; i<cart.length; i++){

            if(cart[i].id == id)
            {
                if(cart[i].quantity > 0){
                    cart[i].quantity++;
                }
            }

        }
    }

    if(decrease_btn){
        for(let i=0; i<cart.length; i++){

            if(cart[i].id == id)
            {
                if(cart[i].quantity > 1){
                    cart[i].quantity--;
                }
            }

        }
    }

    calculateTotal(cart,req);
    res.redirect('/cart');

});


app.post('/sign_in',function(req,res){

    var name=req.body.uname;
    var pass=req.body.pass;
    var flag=0;
    var j;
    con.query(`SELECT id,name,email,password FROM user`,(err,result,fields)=>{
    for(let i=0; i<result.length; i++){
        if(result[i].name==name && result[i].password==pass){
            flag=1;
            j=i;
            break;
        }  
    }
    if(flag==1){
        req.session.user=result[j];
        res.redirect('/');
    }
    else{
        res.redirect('/login');
    }
});
});

app.post('/sign_up',function(req,res){

    var name=req.body.uname
    var email=req.body.email
    var password=req.body.pass
    con.query(`SELECT * FROM user where name=?`,[name],(err,result,fields)=>{
        if(result==[]){
            console.log(result);
            res.redirect('/login');
        }
        else{
            console.log('Hello');
            con.query(`INSERT INTO user (id, name, email, password) VALUES (NULL, ?, ?, ?);`,[name,email,password]);
            res.redirect('/login');
        }

    });

});

app.get('/logout',function(req,res){

    delete req.session.user;
    res.redirect('/');

});

app.post('/discount',function(req,res){

    var code=req.body.code;
    var cart = req.session.cart;
    var discount;
    con.query(`SELECT code,discount FROM coupon WHERE code=?`,[code],(err,result,fields)=>{
            if(result[0].code==code){
            if(cart){
            req.session.discount=result[0].discount;
            calculateTotal(cart,req);
            res.redirect('/cart');
            }
        }
        else{
        res.redirect('/cart');
        }
    });

});

app.post('/place_order',function(req,res){

    var phone = req.body.pno;
    var address = req.body.add1 + "," + req.body.add2 + "," + req.body.city + "," + req.body.state + ". -" + req.body.pin;
    var final = req.body.final;
    var uid= req.session.user.id;
    var cart= req.session.cart;

    con.query(`INSERT INTO bill (user_id,total,phone,address) VALUES (?,?,?,?)`,[uid,final,phone,address]);
    con.query(`SELECT id FROM bill`,(err,result,fields)=>{
        var length=result.length;
        for(let i=0;i<cart.length;i++){
            con.query(`INSERT INTO orders (item_id,bill_id,quantity,img) VALUES (?,?,?,?)`,[cart[i].id,result[length-1].id,cart[i].quantity,cart[i].img]);
            con.query(`SELECT * FROM item WHERE item_id=?`,[cart[i].id],(errs,result1,field)=>{
            con.query(`UPDATE item SET qty = ? WHERE item.item_id = ?;`,[result1[0].qty-cart[i].quantity,cart[i].id]);
        });
        }
    });
    delete req.session.cart;
    delete req.session.total;
    res.redirect('/');
});

app.post('/view',function(req,res){

    var id = req.session.user.id;
    con.query('SELECT * FROM item WHERE item_id=?',[id],(err,result,fields)=>{
        var product={id:result[0].item_id,name:result[0].name,cost:result[0].cost,img1:result[0].img1,img2:result[0].img2,img3:result[0].img3,img4:result[0].img4,desc:result[0].description,seller:result[0].Seller,category:result[0].category,qty:result[0].qty};
        req.session.product=product;
    res.redirect('/sproduct');
    });

});

app.post('/add',upload.single('img1'),upload.single('img2'),upload.single('img3'),upload.single('img4'), (req,res) => {

    var name=req.body.name;
    var Seller=req.body.seller;
    var category=req.body.category;
    var desc=req.body.desc;
    var cost=req.body.cost;
    var qty=req.body.qty;
    console.log(req.body);     
    res.redirect('/');

});