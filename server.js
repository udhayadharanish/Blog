import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import bodyParser from "body-parser";
import pg from "pg";
import multer from "multer";
import fs from "fs";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import bcrypt from "bcrypt";
import env from "dotenv";

env.config();


const db = new pg.Client({
    
    user : process.env.DATABASE_USER,
    host : process.env.DATABASE_HOST,
    database : process.env.DATABASE,
    password : process.env.DATABASE_PASS,
    port : process.env.DATABASE_PORT,
    ssl: {
        rejectUnauthorized: false, // If your SSL/TLS certificate is self-signed or not trusted by a certificate authority (CA), set this to false
      },
});
db.connect();
const saltRounds = 10;

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
const port = process.env.PORT;
// const host = "0.0.0.0";


// const upload = multer();

// middleware

app.use(session({
    secret : process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized : true,
    cookie : {
        maxAge : 2*60*60*1000,
    }
}))

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended : true}));
app.use(passport.initialize())
app.use(passport.session());

const upload = multer({ dest: 'uploads/' });

app.get("/",(req, res )=>{
    // res.sendFile( __dirname + `/views/index.html`);
    res.render("index.ejs");
});



// app.post("/",async (req ,res)=>{
//     const email = req.body.email;
//     var context = {}
//     try{
//         const user = await db.query("SELECT name FROM users WHERE email = $1",[email]);
        
//         console.log(user);
        
//         if(user.rows.length == 0){
//             context.error = "no user found";
//             context.logged_in = false;
//             // res.render("index.ejs",{error : "no user found"});
//         }
//         else{
//             const password = await db.query("SELECT password FROM users WHERE email = $1",[email]);
//             console.log(password);
//             if(password.rows[0].password == req.body.password){
//                 console.log("logged in");
//                 context.logged_in = true;
                
//             }
//             else{
//                 console.log("wrong password");
//                 context.error = "Wrong password";
//                 context.logged_in = false;
//                 // res.render("index.ejs",{error : "wrong password"});
//             }
//         }
//     }
//     catch{
//         console.log("no user exist");
//     }

//     if(context.logged_in){
//         res.redirect("/blogs");
//     }
//     else{
//         res.render("index.ejs",context);
//     }
// })

app.post("/", (req, res , next)=>{
    passport.authenticate( "local" , (err , user , info)=>{
        if(err){
            return res.render("index.ejs",{ error : err})
        }
        req.login(user , (err)=>{
            if(err){
                throw err;
                return res.render("index.ejs",{error : err});
            }
    
            res.redirect("/blogs")
            
        })
    })(req , res , next);
})


app.get('/signup',(req, res)=>{
    console.log(req.body);
    // res.sendFile(__dirname + `/views/signup.html` )
    res.render("signup.ejs");
});

app.post("/signup", async (req,res)=>{
    var error = false;
    const email = req.body.username;
    const password = req.body.password;
    console.log(req.body);
    try{
        const check  = await db.query("SELECT * FROM users WHERE email = $1;",[email],(err , r)=>{
            if(err) throw err;
            if(r.rows.length > 0){
                return res.render("signup.ejs",{error : "User already exist with this email"});
            }
            else{
                bcrypt.hash(password , saltRounds , async (err , encryptedPass)=>{
                    if (err) {
                        console.log(err.message);
                        throw err;
                    }
                    else{
                        const result = await db.query(`INSERT INTO users (name , email , password ) VALUES ($1,$2,$3) RETURNING id;`,[req.body.name , req.body.email , encryptedPass]);
                        console.log(result.rows[0].id);
                        const userDetails = await db.query(`SELECT * FROM users WHERE id=$1;`,[result.rows[0].id]);
                        const user = userDetails.rows[0];
                        
                        console.log(user);
                        req.login(user , (err)=>{
                            if(err){
                                console.log("ERROR LOGIN");
                                throw err;
                            }
                            res.redirect("/blogs");
                        });
                    }
                    
                })
                
            }

        });    
    }
    catch(err){
        return res.render("signup.ejs",{error : err});
    }
    
    
});
app.get("/blogs", async (req,res)=>{
    console.log(req.user)
    if(req.isAuthenticated()){
        let result = [];
        if(req.query.q){
            result = await db.query(`SELECT id,title,description,author FROM blogs WHERE title ILIKE '%${req.query.q}%';`);
        }
        else{
            result = await db.query("SELECT id,title,description,author FROM blogs;");
        }
        
        // console.log(result.rows);
        res.render("blog.ejs",{data : result.rows , id : req.user.id});
    }
    else{
        res.redirect('/');
    }
    
})


app.get("/blogs/:id", async (req,res)=>{
    if(req.isAuthenticated()){
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
        // console.log(response.rows[0].id);
        const q = await db.query("SELECT id,email,name from users WHERE id = $1;",[response.rows[0].author]);
        console.log(q.rows);
        const author = q.rows[0].name;
        const authorId = q.rows[0].id;
        // console.log(response);
        const email = q.rows[0].email;
        
        const data = response.rows[0].data;
        console.log(data);
        let blog = {};
        var paracount = 0;
        var subheading = 0;
        var heading = 0;
        var imageCount = 0;
        for(var field of data){
            // console.log(field);
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
                // console.log(pdata.rows[0]);
                const bufferString = pdata.rows[0].image_data;
                const base64 = bufferString.toString('base64');
                blog[`img-${imageCount}`] = base64;

                blog[`type-img-${imageCount}`] = pdata.rows[0].ext;
                imageCount++;
            }
        }
        let own = false;
        if(req.user.email == email){
            own = true;
        }
        res.render("blogPage.ejs",{id : id ,title : title , description : description, email : email , user : req.user , author : author , authorId : authorId , blog : blog});
    }
    else{
        res.redirect("/");
    }
});


// var cpUpload = upload.fields([]);

app.get("/write",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("write.ejs");
    }
    else{
        res.redirect('/')
    }
    
})

// Second route handler to handle the updated multer middleware
app.post("/write", upload.any() ,async (req, res) => {
    if(req.isAuthenticated()){
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
                    const filteredObject = files.find(obj => obj.fieldname === key);
                    const imageData = fs.readFileSync(`./uploads/${filteredObject.filename}`);
                    const bufferData = Buffer.from(imageData, 'hex'); // Create Buffer from hexadecimal string
                    
                    await db.query("INSERT INTO images (image_data , ext) VALUES ($1,$2) RETURNING id;",[bufferData,filteredObject.mimetype],(err , response)=>{
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
            const q = await db.query("SELECT id FROM users WHERE email=$1;",[req.user.email]);
            const userid = q.rows[0].id;
            await db.query("INSERT INTO blogs (title,description,data,author) VALUES ($1,$2,$3,$4) RETURNING id;",[req.body.title , req.body.description , result , userid],(err , response)=>{
                if (err) throw err;
                console.log("Respjnse insert : ",response);
                const id = response.rows[0].id;
                console.log("Blog added successfully !" + id);
            });

        }
        catch(error){
            console.log("ERROR WHILE BLOG ADDED");
        }
        res.redirect("/blogs");
    }
    else{
        res.redirect("/");
    }
    //res.redirect("/write") // for testing
    
});


app.get("/profile/:id",async (req,res)=>{
   if(req.isAuthenticated()){
    console.log("------------------------------------",req.user);
    const id = req.params.id;
    let context = {}
    let data = {}
    let b = {};
    try{
        const result = await db.query("SELECT * FROM users WHERE id = $1;",[id]);
        console.log(result,id);
        context = result.rows[0];
        // console.log(context);
        const blogs = await db.query("SELECT * FROM blogs WHERE author = $1;",[id]);
        b = blogs.rows;
        
        const count = await db.query(`SELECT COUNT(author) FROM blogs WHERE author = $1;`,[id]);
        data['blog_count'] = count.rows[0].count;
    }
    catch(error){
        if (error) throw error;
    }
    console.log(context)
    data["name"] = context.name;
    data["blogs"] = b;
    if(context.image){
        data['image'] = context.image.toString("base64");
    }
    else{
        data['image'] = "";
    }
    
    data['ext'] = context.ext;
    data["about"] = context.about;
    data["user"] = req.user;
    data["email"] = context.email;
    // console.log(data);
    // console.log("jiwelkweklw",context);
    res.render("profile.ejs",data);
   }
   else{
    return res.redirect("/");
   }
    
})

app.post("/profile/:id", upload.single('image'), async (req, res) => {
    
    if(req.isAuthenticated()){
        const id = req.params.id;
        const file = req.file;
        console.log("files",file);
        if(file){
            const imageData = fs.readFileSync(`uploads/${file.filename}`);
            const bufferData = Buffer.from(imageData);
            console.log(req.body);
            try{
                const result = await db.query("UPDATE users SET image = $1 WHERE id=$2;",[bufferData,id]);
                const result2 = await db.query("UPDATE users SET about = $1 WHERE id=$2;",[req.body.about,id]);
            }
            catch(error){
                if (error) throw error;
            }
        }
        else{
            
            try{
                const result3 = await db.query("UPDATE users SET about = $1 WHERE id=$2;",[req.body.about,id]);
            }
            catch(error){
                if (error) throw error;
            }
        }
        
        res.redirect(`/profile/${id}`);
    }
    else{
        res.redirect("/");
    }

    // Now you can access file properties like file.filename, file.path, etc.
});


app.get("/update/:id",upload.any(),async (req,res)=>{
    if(req.isAuthenticated()){
        const id = req.params.id;
        let data = [];
        let context = {};
        let count = 1;
        try{
            const blog = await db.query(`SELECT * FROM blogs WHERE id = ${id};`);
            context = blog.rows[0];
            data = blog.rows[0].data;
        }
        catch(error){
            if (error) throw error;
        }

        for(let field of data){
            const l = field.split("-");
            if(l[0] == "h"){
                const heading = await db.query("SELECT heading FROM headings WHERE id = $1",[l[1]]);
                context[field] = heading.rows[0].heading;
            }
            else if(l[0] == 'sb'){
                const subheading = await db.query("SELECT subheading FROM subheadings WHERE id = $1",[l[1]]);
                context[field] = subheading.rows[0].subheading;
            }
            else if(l[0] == 'para'){
                const para = await db.query("SELECT para FROM paragraphs WHERE id = $1",[l[1]]);
                context[field] = para.rows[0].para;
            }
            else if(l[0] == "img"){
                const images = await db.query("SELECT image_data,ext FROM images WHERE id = $1",[l[1]]);
                context[field] = images.rows[0];
            }  
        }
        // console.log(context);
        res.render("update.ejs",{context : context});
    }
    else{
        res.redirect("/")
    }
});

app.post("/update/:id",upload.any(), async (req,res)=>{
    if(req.isAuthenticated()){
        const id = req.params.id;
        var records = [];
        const body = req.body;
        const files = req.files;
        console.log(files);
        try{
            const result = await db.query("UPDATE blogs SET title = $1 WHERE id = $2;",[body.title,id]);
        }
        catch(error){
            if (error) throw error;
        }

        try{
            const result = await db.query("UPDATE blogs SET description = $1 WHERE id = $2;",[body.description,id]);
        }
        catch(error){
            if (error) throw error;
        }

        for(let field in body){
            console.log("weiofj",field);
            const l = field.split("-");
            console.log(l);
            if(l[0] == "h"){
                const heading = await db.query("UPDATE headings SET heading = $1 WHERE id = $2",[body[field],l[1]]);
                records.push(field);
                console.log(records);
                // try{
                    
                //     console.log("hey");
                //     data.push(field);
                //     console.log(data);
                // }
                // catch(error){
                //     if (error) throw error;
                // }
                
                
            }
            else if(l[0] == 'sb'){
                // try{
                //     const subheading = await db.query("UPDATE subheadings SET subheading = $1 WHERE id = $2",[body[field],l[1]]);
                //     data.push(field);
                // }
                // catch(error){
                //     if (error) throw error;
                // }
                const subheading = await db.query("UPDATE subheadings SET subheading = $1 WHERE id = $2",[body[field],l[1]]);
                records.push(field);
                
                
            }
            else if(l[0] == 'para'){
                // try{
                //     const para = await db.query("UPDATE paragraphs SET para = $1 WHERE id = $2",[body[field],l[1]]);
                //     data.push(field);
                // }
                // catch(error){
                //     if (error) throw error;
                // }
                const para = await db.query("UPDATE paragraphs SET para = $1 WHERE id = $2",[body[field],l[1]]);
                records.push(field);
                
            }
            else if(l[0] == "img"){
                const filteredObject = files.find(obj => obj.fieldname === field);
                // console.log(filteredObject);
                if(filteredObject){
                    const imageData = fs.readFileSync(`./uploads/${filteredObject.filename}`);
                    const bufferData = Buffer.from(imageData);
                    const images = await db.query("UPDATE images SET image_data = $1 WHERE id = $2",[bufferData,l[1]]);
                    const ext = await db.query("UPDATE images SET ext = $1 WHERE id = $2",[filteredObject.mimetype,l[1]]);
                
                }
                records.push(field);
                
            }  
            else if(l[0] == "new"){
                if(l[1] == "h"){
                    console.log("new");
                    try{
                        await db.query("INSERT INTO headings (heading) VALUES ($1) RETURNING id;",[body[field]],(err , response)=>{
                            const id = response.rows[0].id;
                            records.push(`h-${id}`);
                        });
                        // console.log(response);
                    }
                    catch(error){
                        if (error) throw error;
                    }
                }
                else if(l[1] == "sb"){
                    console.log("new");
                    const sb = await db.query("INSERT INTO subheadings (subheading) VALUES ($1) RETURNING id;",[body[field]]);
                    const id = sb.rows[0].id
                    records.push(`sb-${id}`);
                }
                else if(l[1] == "para"){
                    console.log("new");
                    const para = await db.query("INSERT INTO paragraphs (para) VALUES ($1) RETURNING id;",[body[field]]);
                    const id = para.rows[0].id;
                    records.push(`para-${id}`);
                    
                }
                else if(l[1] == "img"){
                    console.log("new");
                    const filteredObject = files.find(obj => obj.fieldname === field);
                    const imageData = fs.readFileSync(`./uploads/${filteredObject.filename}`);
                    const bufferData = Buffer.from(imageData, 'hex'); // Create Buffer from hexadecimal string
                    
                    const image = await db.query("INSERT INTO images (image_data , ext) VALUES ($1,$2) RETURNING id;",[bufferData,filteredObject.mimetype]);
                    const id = image.rows[0].id;
                    records.push(`img-${id}`);
                    console.log("images added ")
                }
            }
        }
        const finalDataUpdate = await db.query("UPDATE blogs SET data=$1 WHERE id=$2;",[records,id]);
        res.redirect(`/blogs/${id}`);
    }
    else{
        res.redirect("/");
    }
})

app.get('/delete/:id',async (req,res)=>{
    const id = req.params.id;
    try{
        const result = await db.query("DELETE FROM blogs WHERE id = $1;",[id]);
        res.redirect("/blogs");
    }
    catch(err){
        // throw err;
        console.log(err);
        return "error";
    }
})

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

passport.use("local" , new Strategy(async function verify(username , password , cb) {
    try{
        const result = await db.query("SELECT * FROM users WHERE email=$1;",[username]);
        
        if(result.rows.length > 0){
            const user = result.rows[0];
            const storedPass = user.password;
            bcrypt.compare(password , storedPass , (err , valid)=>{
                if(err){
                    cb(err);
                }
                if(valid){
                    cb(null,user);
                }
                else{
                    cb("Password doesn't match");
                }
            })
        }
        else{
            cb("No user found");
        }
    }
    catch(err){
        if (err) throw err;
    }
} ));


passport.serializeUser((user, cb) => {
    cb(null, user);
  });
passport.deserializeUser((user, cb) => {
cb(null, user);
});
  
app.listen(port ,(err)=>{
    if(err) throw err;
    console.log(`Server is listening on ${port}`);
})