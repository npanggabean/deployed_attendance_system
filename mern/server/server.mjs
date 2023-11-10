import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import './loadEnvironment.mjs';
import records from './routes/record.mjs';

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors({
  exposedHeaders: ['Class-Name'],
}));
app.use(express.json());

app.use("/record", records);

const clientBuildPath = path.join(process.cwd(), 'mern/client/build');

fs.readdir(clientBuildPath, (err, files) => {
  if (err) console.log(err);
  else console.log("Files in build directory:", files);
});

app.use(express.static(clientBuildPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

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
