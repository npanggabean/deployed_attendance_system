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

// Since __dirname doesn't work in ES modules, use import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Adjust the path to point to the build directory
const clientBuildPath = path.join(__dirname, '../client/build');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
