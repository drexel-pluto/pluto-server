const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const port = process.env.PORT || 3555;
const app = express();
require('dotenv').config();




// ---
// Utilities
// ---

// Serve static files from the React frontend app
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client/')));



// Anything that doesn't match the above, send back index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname + '/client/index.html'))
});




app.listen(port, () => console.log(`Server runnning on port ${port}!`));
