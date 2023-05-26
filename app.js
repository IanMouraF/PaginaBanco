const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const {
  MongoClient,
  ObjectId
} = require('mongodb');
const jwt = require('jsonwebtoken');
const url = 'mongodb+srv://ianAtlas:fabiola356@cluster0.risdfp2.mongodb.net/';
const dbName = 'cluster0';
const { LocalStorage } = require('node-localstorage');
const localStorage = new LocalStorage('./scratch');

let usersCollection;

// Função para conectar ao MongoDB
async function connectToDatabase() {
  const client = await MongoClient.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const db = client.db(dbName);
  usersCollection = db.collection('users');

  return client;
}

// Conectar ao banco de dados
connectToDatabase()
  .then(client => {
    console.log('Conexão com o MongoDB estabelecida');
    // Inicie o servidor apenas após a conexão com o banco de dados ser estabelecida
    app.listen(port, () => {
      console.log(`Servidor rodando em http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err);
  });

function checkDatabaseConnection(req, res, next) {
  if (!usersCollection) {
    return res.status(500).send('Conexão com o banco de dados não estabelecida.');
  }
  next();
}

// Função para obter a conexão com o banco de dados
async function getDatabaseConnection() {
  if (!usersCollection) {
    const client = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const db = client.db(dbName);
    usersCollection = db.collection('users');
  }

  return usersCollection;
}

app.use(express.static(__dirname));

app.get('/style2.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'style2.css'));
});

app.use(express.urlencoded({
  extended: true
}));
app.use(express.json());

app.get('/home', async function (req, res) {
  res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/sobre', (req, res) => {
  res.sendFile(path.join(__dirname, 'sobre.html'));
});

app.get('/gestao', (req, res) => {
  res.sendFile(path.join(__dirname, 'gestao.html'));
});

// Função para gerar o token de autenticação
function generateToken(user) {
  // Define as informações que você deseja incluir no token (por exemplo, o ID do usuário)
  const payload = {
    userId: user._id.toString() // Converte o ObjectId para string
  };

  // Gera o token com uma chave secreta e um tempo de expiração (opcional)
  const token = jwt.sign(payload, '1237689', {
    expiresIn: '1h'
  });

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

app.get('/users', checkDatabaseConnection, async (req, res) => {
  try {
    const users = await usersCollection.find().toArray();

    if (users.length > 0) {
      console.log('Usuários encontrados:', users);
      res.json(users);
    } else {
      console.log('Nenhum usuário encontrado');
      res.status(404).send('Nenhum usuário encontrado');
    }
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    res.status(500).send('Erro ao buscar usuários');
  }
});

app.post('/login', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const user = await usersCollection.findOne({
      email,
      password
    });

    if (user) {
      console.log('Login bem-sucedido:', user);
      const token = generateToken(user); // Gera o token de autenticação
      await usersCollection.updateOne({
        _id: user._id
      }, {
        $set: {
          token
        }
      }); // Armazena o token no banco de dados
      const redirectUrl = '/home';

      res.send(`
        <script>
          localStorage.setItem('token', '${token}');
          window.location.href = '${redirectUrl}';
        </script>
      `); // Redireciona para home.html com o token e o nome de usuário

    } else {
      console.log('Credenciais inválidas');
      res.status(401).send('Credenciais inválidas');
    }
  } catch (err) {
    console.error('Erro ao realizar login:', err);
    res.status(500).send('Erro ao realizar login');
  }
});

app.post('/getUserInfo', checkDatabaseConnection, async (req, res) => {
  const {
    token
  } = req.body;

  try {
    const decoded = jwt.verify(token, '1237689');

    const user = await usersCollection.findOne({
      _id: ObjectId(decoded.userId)
    });

    if (user) {
      console.log('Usuário autenticado:', user);
      res.json({
        username: user.username
      });
    } else {
      console.log('Usuário não encontrado');
      res.status(404).send('Usuário não encontrado');
    }
  } catch (err) {
    console.error('Erro ao verificar token:', err);
    res.status(401).send('Token inválido');
  }
});

// Rota protegida que requer autenticação
app.get('/protected', checkDatabaseConnection, authenticateToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({
      _id: ObjectId(req.user.userId)
    });

    if (user) {
      console.log('Usuário autenticado:', user);
      // Atualizar os elementos relevantes na página com as informações do usuário
      res.send(`<script>document.getElementById("username").textContent = "${user.username}";</script>`);

    } else {
      console.log('Usuário não encontrado');
      res.status(404).send('Usuário não encontrado');
    }
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).send('Erro ao buscar usuário');
  }
});

app.post('/logout', checkDatabaseConnection, async (req, res) => {
  const {
    token
  } = req.body;

  try {
    const decoded = jwt.verify(token, '1237689');

    // Atualize o documento do usuário no MongoDB removendo o token
    await usersCollection.updateOne({
      _id: ObjectId(decoded.userId)
    }, {
      $unset: {
        token: ''
      }
    });

    // Limpar as informações de sessão no lado do cliente
    localStorage.removeItem('token');

    res.sendStatus(200);
  } catch (err) {
    console.error('Erro ao efetuar logout:', err);
    res.sendStatus(500);
  }
});

app.get('/users/:id', checkDatabaseConnection, async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await usersCollection.findOne({ _id: ObjectId(userId) });

    if (user) {
      console.log('Usuário encontrado:', user);
      res.json(user);
    } else {
      console.log('Usuário não encontrado');
      res.status(404).send('Usuário não encontrado');
    }
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).send('Erro ao buscar usuário');
  }
});



app.post('/register', async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  try {
    const user = await usersCollection.findOne({
      email
    });

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
        res.redirect('/login');

      } else {
        console.log('Erro ao registrar usuário');
        res.status(500).send('Erro ao registrar usuário');
      }
    }
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
    res.status(500).send('Erro ao registrar usuário');
  }
});

app.delete('/users/:id', checkDatabaseConnection, async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await usersCollection.deleteOne({ _id: ObjectId(userId) });

    if (result.deletedCount > 0) {
      console.log('Usuário excluído com sucesso');
      res.sendStatus(200);
    } else {
      console.log('Usuário não encontrado');
      res.status(404).send('Usuário não encontrado');
    }
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).send('Erro ao excluir usuário');
  }
});

app.put('/users/:id', checkDatabaseConnection, async (req, res) => {
  const userId = req.params.id;
  const { username, email, password } = req.body;

  try {
    const result = await usersCollection.updateOne(
      { _id: ObjectId(userId) },
      { $set: { username, email, password } }
    );

    if (result.modifiedCount > 0) {
      console.log('Usuário atualizado com sucesso');
      res.sendStatus(200);
    } else {
      console.log('Usuário não encontrado');
      res.status(404).send('Usuário não encontrado');
    }
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).send('Erro ao atualizar usuário');
  }
});

function showEditUserModal(userId) {
  if (typeof userId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(userId)) {
    console.error('Invalid userId:', userId);
    alert('Invalid userId');
    return;
  }

  const modal = document.getElementById('editUserModal');
  const form = document.getElementById('editUserForm');

  // Reset the form
  form.reset();

  // Set the form action URL
  form.action = `/users/${userId}`;

  // Get the user information
  fetch(`/users/${userId}`)
    .then(response => response.json())
    .then(user => {
      // Set the input values with the user information
      form.username.value = user.username;
      form.email.value = user.email;
      form.password.value = user.password;

      // Show the modal
      modal.style.display = 'block';
    })
    .catch(error => {
      console.error('Error fetching user information:', error);
      alert('Error fetching user information');
    });
}
