import express from "express";
import multer from "multer"
import bodyParser from "body-parser";
const app = express();

const port = 4000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended : true}));
const upload = multer({ dest: 'uploads/' });

app.get("/",(req,res)=>{
    res.render("write.ejs");
})

app.post("/",upload.any(),(req,res)=>{
    console.log(req.files);
    res.send("OK");
})

app.listen(port,(err)=>{
    if (err) throw err;
    console.log("Server listening on 4000");
})