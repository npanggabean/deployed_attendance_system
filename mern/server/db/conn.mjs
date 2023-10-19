import { MongoClient } from "mongodb";

const connectionString = "mongodb+srv://Houston:sepakbola5@cluster0.ohyngyk.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(connectionString);

let conn;
try {
  conn = await client.connect();
  console.log("Pinged your deployment. You successfully connected to MongoDB!");
} catch(e) {
  console.error(e);
}

let db = conn.db("Attendance");

export default db;