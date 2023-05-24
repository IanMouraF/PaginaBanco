const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

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

// Função para gerar o token de autenticação
function generateToken(user) {
  // Define as informações que você deseja incluir no token (por exemplo, o ID do usuário)
  const payload = {
    userId: user._id.toString() // Converte o ObjectId para string
  };

  // Gera o token com uma chave secreta e um tempo de expiração (opcional)
  const token = jwt.sign(payload, '1237689', { expiresIn: '1h' });

  return token;
}

// Middleware para verificar a autenticação do usuário
function authenticateToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).send('Token de autenticação não fornecido.');
  }

  jwt.verify(token, '1237689', (err, user) => {
    if (err) {
      return res.status(403).send('Token de autenticação inválido.');
    }

    req.user = user;
    next();
  });
}

// ...

app.post('/login', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const client = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email, password });

    if (user) {
      console.log('Login bem-sucedido:', user);
      const token = generateToken(user); // Gera o token de autenticação
      await usersCollection.updateOne({ _id: user._id }, { $set: { token } }); // Armazena o token no banco de dados
      res.redirect('/home');

    } else {
      console.log('Credenciais inválidas');
      res.status(401).send('Credenciais inválidas');
    }

    client.close();
  } catch (err) {
    console.error('Erro ao realizar login:', err);
    res.status(500).send('Erro ao realizar login');
  }
});



// Rota protegida que requer autenticação
app.get('/protected', authenticateToken, (req, res) => {
  res.send('Informações confidenciais acessadas com sucesso!' +
    `<script>document.getElementById("username").textContent = "${req.user.username}";</script>`);
});


app.post('/register', async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  try {
    const client = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });

    if (user) {
      console.log('O usuário já está registrado:', user);
      res.status(409).send('O usuário já está registrado');

    } else {
      const newUser = {
        username,
        email,
        password
      };

      const result = await usersCollection.insertOne(newUser);

      if (result.insertedId) {
        console.log('Registro bem-sucedido:', newUser);
        res.redirect('/login.html');

      } else {
        console.log('Erro ao registrar usuário');
        res.status(500).send('Erro ao registrar usuário');
      }
    }

    client.close();
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
    res.status(500).send('Erro ao registrar usuário');
  }
});

// ...

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
