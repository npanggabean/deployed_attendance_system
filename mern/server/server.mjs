import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import './loadEnvironment.mjs';
import records from './routes/record.mjs';

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors({
  exposedHeaders: ['Class-Name'],
}));
app.use(express.json());

app.use("/record", records);

// Define __dirname in ES module scope
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientBuildPath = path.join(__dirname, '../client/build');

if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(clientBuildPath));

  // Serve the React application's index.html file if no API route is hit
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(clientBuildPath, 'index.html'));
  });
}

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
