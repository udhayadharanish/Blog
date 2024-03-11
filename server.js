import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import bodyParser from "body-parser";
import pg from "pg";
import multer from "multer";
import fs from "fs";

const db = new pg.Client({
    user : "postgres",
    host : "localhost",
    database : "blog",
    password : "Udhay123",
    port : 5432,
});
db.connect();


function saveImageToDB(filename){
    const hexa = fs.readFileSync(`./uploads/${filename}`);
    const bufferData = Buffer.from(hexa , 'hex');
    const imageBase64 = bufferData.toString("base64");
    console.log(imageBase64);
    return imageBase64
}


const __filename = fileURLToPath(import.meta.url);
console.log("filename : ",__filename);

const __dirname = dirname(__filename);
console.log("dirname : " , __dirname);

const app = express();
const port = 3000;
const host = "localhost";


// const upload = multer();

// middleware

app.use(bodyParser.urlencoded({extended : true}));
const upload = multer({ dest: 'uploads/' });

app.get("/",(req, res )=>{
    // res.sendFile( __dirname + `/views/index.html`);
    res.render("index.ejs");
});



app.post("/",async (req ,res)=>{
    const email = req.body.email;
    var context = {}
    try{
        const user = await db.query("SELECT name FROM users WHERE email = $1",[email]);
        
        console.log(user);
        
        if(user.rows.length == 0){
            context.error = "no user found";
            context.logged_in = false;
            // res.render("index.ejs",{error : "no user found"});
        }
        else{
            const password = await db.query("SELECT password FROM users WHERE email = $1",[email]);
            console.log(password);
            if(password.rows[0].password == req.body.password){
                console.log("logged in");
                context.logged_in = true;
                
            }
            else{
                console.log("wrong password");
                context.error = "Wrong password";
                context.logged_in = false;
                // res.render("index.ejs",{error : "wrong password"});
            }
        }
        

    }
    catch{
        console.log("no user exist");
    }

    if(context.logged_in){
        res.redirect("/blogs");
    }
    else{
        res.render("index.ejs",context);
    }
    
    
})


app.get('/signup',(req, res)=>{
    console.log(req.body);
    // res.sendFile(__dirname + `/views/signup.html` )
    res.render("signup.ejs");
});

app.post("/signup", async (req,res)=>{
    var error = false;
    
    try{
        const result = await db.query(`INSERT INTO users (name , email , password ) VALUES ($1,$2,$3)`,[req.body.name , req.body.email , req.body.pass]);
        console.log(result.rows);
    }
    catch(err){
        console.log("Executing SQL query ", err.message);
        error = true;
    }
    console.log("error :",error);
    if(error){
        res.render("signup.ejs",{error : "user already exist"});
    }
    else{
        res.redirect("/");
    }
    
});
app.get("/blogs", async (req,res)=>{
    const result = await db.query("SELECT id,title,description,author FROM blogs;");
    console.log(result.rows);
    res.render("blog.ejs",{data : result.rows});
})



app.get("/blogs/:id", async (req,res)=>{
    const id = parseInt(req.params.id);
    console.log(id);
    let response = {};
    try{
        response = await db.query(`SELECT * FROM blogs WHERE id = ${id};`);
        console.log(response.rows);
    }
    catch(error){
        if(error) throw error;
        console.log("Error while retriving blogs");
    }
    const title = response.rows[0].title;
    const description = response.rows[0].description;
    const author = response.rows[0].author;
    const data = response.rows[0].data;
    console.log(data);
    let blog = {};
    var paracount = 0;
    var subheading = 0;
    var heading = 0;
    var imageCount = 0;
    for(var field of data){
        console.log(field);
        let l = field.split('-');
        if("para" === l[0]){
            const pdata = await db.query(`SELECT para FROM paragraphs WHERE id=${l[1]};`);
            blog[`para-${paracount++}`] = pdata.rows[0].para;
        }
        else if("sb" === l[0]){
            const pdata = await db.query(`SELECT subheading FROM subheadings WHERE id=${l[1]};`);
            blog[`sb-${subheading++}`] = pdata.rows[0].subheading;
        }
        else if("h" === l[0]){
            const pdata = await db.query(`SELECT heading FROM headings WHERE id=${l[1]};`);
            blog[`h-${heading++}`] = pdata.rows[0].heading;
        }
        else if("img" === l[0]){
            console.log(l[1]);
            const pdata = await db.query(`SELECT image_data , ext  FROM images WHERE id=${l[1]};`);
            console.log(pdata.rows[0]);
            const bufferString = pdata.rows[0].image_data;
            const base64 = bufferString.toString('base64');
            blog[`img-${imageCount}`] = base64;

            blog[`type-img-${imageCount}`] = pdata.rows[0].ext;
            imageCount++;
        }
    }
    res.render("blogPage.ejs",{title : title , description : description , author : author , blog : blog});
});


// var cpUpload = upload.fields([]);

app.get("/write",(req,res)=>{
    res.render("write.ejs");
})

// Second route handler to handle the updated multer middleware
app.post("/write", upload.fields([{name : "img-0",maxCount : 1},{name : "img-1",maxCount : 1},{name : "img-2",maxCount : 1},{name : "img-3",maxCount : 1},{name : "img-4",maxCount : 1}]) ,async (req, res) => {
    var result = [];
    const blog = req.body;
    const files = req.files;
    console.log(blog);
    console.log(req.files);

    for( let key in blog){
        var sections = key.split("-");
        console.log(sections);
        if(sections[0] == "h"){
            try{
                await db.query("INSERT INTO headings (heading) VALUES ($1) RETURNING id;",[blog[key]],(err , response)=>{
                    const id = response.rows[0].id;
                    result.push(`h-${id}`);
                });
                // console.log(response);
            }
            catch(error){
                console.log("Error while inserting headings table");
            }
        }
        else if(sections[0] == "sb"){
            try{
                await db.query("INSERT INTO subheadings (subheading) VALUES ($1) RETURNING id;",[blog[key]],(err , response)=>{
                    const id = response.rows[0].id;
                    result.push(`sb-${id}`);
                });
                // console.log(response);
            }
            catch(error){
                console.log("Error while inserting subheadings table");
            }
        }
        else if(sections[0] == "para"){
            try{
                await db.query("INSERT INTO paragraphs (para) VALUES ($1) RETURNING id;",[blog[key]],(err , response)=>{
                    const id = response.rows[0].id;
                    result.push(`para-${id}`);
                });
                // console.log(response);
            }
            catch(error){
                console.log("Error while inserting para table");
            }
        }
        else if(sections[0] == "img"){
            try{
                const imageData = fs.readFileSync(`./uploads/${files[key][0].filename}`);
                const bufferData = Buffer.from(imageData, 'hex'); // Create Buffer from hexadecimal string
                
                await db.query("INSERT INTO images (image_data , ext) VALUES ($1,$2) RETURNING id;",[bufferData,files[key][0].mimetype],(err , response)=>{
                    if (err) throw err;
                    console.log(response);
                    const id = response.rows[0].id;
                    result.push(`img-${id}`);
                });
                // console.log(response);
            }
            catch(error){
                if (error) throw error; 
                console.log("Error while inserting image table");
            }
        }
    }
    try{
        await db.query("INSERT INTO blogs (title,description,data,author) VALUES ($1,$2,$3,$4) RETURNING id;",[req.body.title , req.body.description , result , req.body.author],(err , response)=>{
            const id = response.rows[0].id;
            console.log("Blog added successfully !" + id);
        });

    }
    catch(error){
        console.log("ERROR WHILE BLOG ADDED");
    }
    res.redirect("/blogs");
    //res.redirect("/write") // for testing
    
});


app.get("/profile/:id",async (req,res)=>{
    const id = req.params.id;
    let context = {}
    let data = {}
    let b = {};
    try{
        const result = await db.query("SELECT * FROM users WHERE id = $1",[id]);
        context = result.rows[0];
        const blogs = await db.query("SELECT * FROM blogs WHERE author = $1",[id]);
        b = blogs.rows;
    }
    catch(error){
        if (error) throw error;
    }

    data["name"] = context.name;
    data["blogs"] = b;
    console.log(data);
    res.render("profile.ejs",data);
    // res.sendStatus(200);
})



app.listen(port , host,(err)=>{
    if(err) throw err;
    console.log(`Server is listening on http://${host}:${port}`);
})