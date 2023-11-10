import express from "express";
import cors from "cors";
import path from 'path';
import "./loadEnvironment.mjs";
import records from "./routes/record.mjs";

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors({
  exposedHeaders: ['Class-Name'],
}));
app.use(express.json());

app.use("/record", records);

if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../../client/build')));

  // Serve the React application's index.html file if no API route is hit
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../client', 'build', 'index.html'));
  });
}

// start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});