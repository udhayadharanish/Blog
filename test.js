import pg from 'pg';
import fs from 'fs';

// Create a PostgreSQL connection db
const db = new pg.Client({
  user: 'postgres',
  host: 'localhost',
  database: 'blog',
  password: 'Udhay123',
  port: 5432, // Default PostgreSQL port
});

db.connect();

// Function to encode an image to a base64 string
function encodeImageToBase64(imagePath) {
  const imageBuffer = readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

// Function to decode a base64 string to an image buffer
function decodeBase64ToImage(base64String) {
  return Buffer.from(base64String, 'base64');
}

// Function to save an image string to the database
async function saveImageStringToDB(imageString) {
  try {
    const query = 'INSERT INTO images (data) VALUES ($1) RETURNING id';
    const result = await db.query(query, [imageString]);
    console.log('Image string saved with ID:', result.rows[0].id);
  } catch (error) {
    console.error('Error saving image string:', error);
  }
}

// Function to retrieve an image string from the database
async function retrieveImageStringFromDB(imageId) {
  try {
    const query = 'SELECT data FROM images WHERE id = $2';
    const result = await db.query(query, [imageId]);
    if (result.rows.length > 0) {
      const imageString = result.rows[0].data;
      // Do something with the image string
    //   console.log('Retrieved image string:', imageString);
    } else {
      console.log('Image not found');
    }
  } catch (error) {
    console.error('Error retrieving image string:', error);
  }
}

// // Example usage
// const imagePath = './image2.jpg'; // Replace with the path to your image
// const imageString = encodeImageToBase64(imagePath);
// // console.log(imageString);
// saveImageStringToDB(imageString);

// // Replace 1 with the ID of the image you want to retrieve
// retrieveImageStringFromDB(1);

// Function to retrieve an image from the database as a Base64 string
async function retrieveImageAsBase64(imageId) {
    try {
      const query = 'SELECT data FROM images WHERE id = $1';
      const result = await db.query(query, [imageId]);
      if (result.rows.length > 0) {
        const imageBuffer = result.rows[0].data;
        // const base64Image = imageBuffer.toString('base64');
        return imageBuffer;
      } else {
        console.log('Image not found');
        return null;
      }
    } catch (error) {
      console.error('Error retrieving image:', error);
      return null;
    }
  }
  
  // Example usage
  async function displayImage(imageId) {
    const base64Image = await retrieveImageAsBase64(imageId);
    if (base64Image) {
      // Output HTML with the retrieved image as a Base64 string
      console.log(`<img src="data:image/jpg;base64,${base64Image}" />`);
    }
  }
  
  // Replace 1 with the ID of the image you want to retrieve
  // displayImage(5);

  function convertToBase64(encodedText) {
    // Convert encoded text to binary
    const binaryData = Buffer.from(encodedText, 'binary');

    // Convert binary data to Base64
    const base64String = binaryData.toString('base64');

    return base64String;
}

// const imageData = fs.readFileSync("./uploads/5d51c40cfc2d621a0453c7032d093f4b");



// // const bufferHexString = "89504e470d0a1a0a0000000d49484452000003b40000035a0806000000b989005c0000800049444154785eec9d07981545ba"; // Hexadecimal string
// const bufferData = Buffer.from(imageData, 'hex'); // Create Buffer from hexadecimal string
// const base64Data = bufferData.toString('base64'); // Convert Buffer to Base64

// console.log(base64Data);


// // console.log(base64Data);
// const result =await db.query("SELECT * FROM images WHERE id = 12");
// const data = result.rows[0];
// console.log(data);

// const imageData = fs.readFileSync("./uploads/33ef3af12bc6be567a73fed0d43ae1c1");
// // const bufferData = Buffer.from(imageData, 'hex'); // Create Buffer from hexadecimal string
// // const base64Data = bufferData.toString('base64'); // Convert Buffer to Base64
const imageData = fs.readFileSync("profile.jpg");
const bufferData = Buffer.from(imageData, 'hex'); // Create Buffer from hexadecimal string
// const base64Data = bufferData.toString('base64'); // Convert Buffer to Base64
const result = await db.query("SELECT image FROM users;");
console.log(result.rows);