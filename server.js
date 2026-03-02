const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const prisma = require("./database");

const app = express();
app.use(cors());
app.use(express.json());

// ─── Testar conexão ───────────────────────────────────────────────────────────
prisma.$connect()
  .then(() => console.log("Banco conectado com sucesso!"))
  .catch((err) => console.error("Erro ao conectar no banco:", err));

// ─── HELPER: formato de retorno do usuário com perfil ─────────────────────────
const incluirPerfil = {
  include: {
    perfil: true,
  },
};

/*
=================================
CREATE — POST /api/usuarios
Body: { nome, email, senha, perfil_nome }
=================================
*/
app.post("/api/usuarios", async (req, res) => {
  try {
    const { nome, email, senha, perfil_nome } = req.body;

    // Validação básica dos campos obrigatórios
    if (!nome || !email || !senha || !perfil_nome) {
      return res.status(400).json({
        erro: "Os campos nome, email, senha e perfil_nome são obrigatórios.",
      });
    }

    // Verificar email duplicado
    const emailExistente = await prisma.usuario.findUnique({
      where: { email },
    });

    if (emailExistente) {
      return res.status(409).json({
        erro: "Já existe um usuário cadastrado com este e-mail.",
      });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Criar perfil e usuário em uma única operação (nested create)
    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        perfil: {
          create: {
            perfil_nome,
          },
        },
      },
      ...incluirPerfil,
    });

    // Remover senha do retorno
    const { senha: _, ...usuarioSemSenha } = novoUsuario;

    return res.status(201).json({
      mensagem: "Usuário cadastrado com sucesso",
      usuario: usuarioSemSenha,
    });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

/*
=================================
READ — GET /api/usuarios
Retorna todos os usuários com seus perfis
=================================
*/
app.get("/api/usuarios", async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      ...incluirPerfil,
      omit: { senha: true },
    });

    return res.json({
      mensagem: "Usuários encontrados com sucesso",
      total: usuarios.length,
      usuarios,
    });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

/*
=================================
READ — GET /api/usuarios/:id
Retorna um usuário pelo ID com seu perfil
=================================
*/
app.get("/api/usuarios/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      ...incluirPerfil,
    });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    const { senha: _, ...usuarioSemSenha } = usuario;

    return res.json({
      mensagem: "Usuário encontrado com sucesso",
      usuario: usuarioSemSenha,
    });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

/*
=================================
UPDATE — PUT /api/usuarios/:id
Body: { nome?, email?, senha?, perfil_nome? }
=================================
*/
app.put("/api/usuarios/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nome, email, senha, perfil_nome } = req.body;

    // Verificar se o usuário existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioExistente) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    // Verificar se o novo email já está em uso por outro usuário
    if (email && email !== usuarioExistente.email) {
      const emailEmUso = await prisma.usuario.findUnique({
        where: { email },
      });

      if (emailEmUso) {
        return res.status(409).json({
          erro: "Este e-mail já está em uso por outro usuário.",
        });
      }
    }

    // Montar dados de atualização do usuário
    const dadosUsuario = {};
    if (nome)  dadosUsuario.nome  = nome;
    if (email) dadosUsuario.email = email;
    if (senha) dadosUsuario.senha = await bcrypt.hash(senha, 10);

    // Montar dados de atualização do perfil (nested update)
    if (perfil_nome) {
      dadosUsuario.perfil = {
        update: { perfil_nome },
      };
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: dadosUsuario,
      ...incluirPerfil,
    });

    const { senha: _, ...usuarioSemSenha } = usuarioAtualizado;

    return res.json({
      mensagem: "Usuário atualizado com sucesso",
      usuario: usuarioSemSenha,
    });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

/*
=================================
DELETE — DELETE /api/usuarios/:id
=================================
*/
app.delete("/api/usuarios/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Verificar se o usuário existe
    const usuario = await prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    // Deletar usuário (o perfil será deletado em cascata via migração)
    await prisma.usuario.delete({ where: { id } });

    // Deletar perfil órfão
    await prisma.perfil.delete({ where: { id: usuario.id_perfil } });

    return res.json({ mensagem: "Usuário removido com sucesso." });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});