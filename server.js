const express = require('express');
const path = require('path');
const routingRouter = require('./routes/routing');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', routingRouter);

app.listen(PORT, () => {
  console.log(`Route Navigator running at http://localhost:${PORT}`);
});
