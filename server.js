const express = require("express");
const cors = require("cors");
const db = require("./database");

db.execute("SELECT 1")
    .then(() => console.log("Banco conectado com sucesso!"))
    .catch(err => console.error("Erro ao conectar no banco:", err));

const app = express();
app.use(cors());
app.use(express.json());

/*
=================================
CREATE
=================================
*/
app.post("/api/usuarios", async (req, res) => {
    try {
        const { nome, email } = req.body;

        const now = new Date();

        const [result] = await db.execute(
            `INSERT INTO users (nome, email, created_at, updated_at)
             VALUES (?, ?, ?, ?)`,
            [nome, email, now, now]
        );

        const usuarioId = result.insertId;

        const [rows] = await db.execute(
            `SELECT id, nome, email, created_at, updated_at
             FROM users WHERE id = ?`,
            [usuarioId]
        );

        return res.status(201).json({
            mensagem: "Usuário cadastrado com sucesso",
            user: rows[0]
        });

    } catch (error) {
        return res.status(500).json({ erro: error.message });
    }
});

/*
=================================
READ - LISTAR
=================================
*/
app.get("/api/usuarios", async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, nome, email, created_at, updated_at FROM users`
        );

        return res.json({
            mensagem: "Usuários encontrados com sucesso",
            users: rows
        });

    } catch (error) {
        return res.status(500).json({ erro: error.message });
    }
});

/*
=================================
UPDATE
=================================
*/
app.put("/api/usuarios/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email } = req.body;
        const now = new Date();

        const [result] = await db.execute(
            `UPDATE users
             SET nome = ?, email = ?, updated_at = ?
             WHERE id = ?`,
            [nome, email, now, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Usuário não encontrado"
            });
        }

        const [rows] = await db.execute(
            `SELECT id, nome, email, created_at, updated_at
             FROM users WHERE id = ?`,
            [id]
        );

        return res.json({
            mensagem: "Usuário atualizado com sucesso",
            user: rows[0]
        });

    } catch (error) {
        return res.status(500).json({ erro: error.message });
    }
});

/*
=================================
DELETE
=================================
*/
app.delete("/api/usuarios/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.execute(
            `DELETE FROM users WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Usuário não encontrado"
            });
        }

        return res.json({
            mensagem: "Usuário removido com sucesso"
        });

    } catch (error) {
        return res.status(500).json({ erro: error.message });
    }
});

app.listen(3001, () => {
    console.log("Servidor rodando na porta 3001");
});