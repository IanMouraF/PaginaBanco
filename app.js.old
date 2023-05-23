const express = require('express');
const app = express();
const port = 3000;
const path = require('path');

app.use(express.static(__dirname));

app.get('/style2.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'style2.css'));
});

const { MongoClient } = require('mongodb');
const url = 'mongodb+srv://ianAtlas:fabiola356@cluster0.risdfp2.mongodb.net/';
const dbName = 'cluster0';
const client = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

client.connect((err) => {
  if (err) {
    console.error('Erro ao conectar-se ao MongoDB:', err);
    return;
  }

  console.log('Conexão bem-sucedida ao MongoDB');
  const db = client.db(dbName);

  db.createCollection('users', (err, result) => {
    if (err) {
      console.error('Erro ao criar a coleção:', err);
    } else {
      console.log('Coleção "users" criada com sucesso');
    }
  });
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

app.post('/register', (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  const user = {
    username,
    email,
    password
  };

  const db = client.db(dbName);
  const usersCollection = db.collection('users');

  usersCollection.insertOne(user, (err, result) => {
    if (err) {
      console.error('Erro ao salvar usuário:', err);
      res.status(500).send('Erro ao salvar usuário');
    } else {
      console.log('Usuário salvo com sucesso:', result.ops[0]);
      res.redirect('/home.html');
    }
  });
});

app.listen(port, () => {
  console.log('API funcionando!');
});
