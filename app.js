const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const { MongoClient } = require('mongodb');

app.use(express.static(__dirname));

app.get('/style2.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'style2.css'));
});

const url = 'mongodb+srv://ianAtlas:fabiola356@cluster0.risdfp2.mongodb.net/';
const dbName = 'cluster0';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/home', async function (req, res) {
  res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.post('/register', async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  const user = {
    username,
    email,
    password
  };

  try {
    const client = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    await usersCollection.insertOne(user);
    console.log('Usuário salvo com sucesso:', user);
    res.redirect('/home');

    client.close();
  } catch (err) {
    console.error('Erro ao salvar usuário:', err);
    res.status(500).send('Erro ao salvar usuário');
  }
});

app.listen(port, () => {
  console.log('API funcionando!');
});
