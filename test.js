import pg from 'pg';


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



async function testing(){
    db.query("SELECT * FROM blogs;", (err , result)=>{
      if(err) throw err;
      console.log(result);
    })
}

testing();

