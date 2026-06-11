const express = require('express');
const { pool } = require('./database');

const router = express.Router();

// Listar todos os posts
router.get('/posts', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, title, excerpt, content, image, author, category, views, created_at 
             FROM blog_posts 
             WHERE published = true 
             ORDER BY created_at DESC`
        );
        
        res.json({ success: true, posts: result.rows });
    } catch (error) {
        console.error('Erro ao buscar posts:', error);
        res.status(500).json({ error: 'Erro ao buscar posts' });
    }
});

// Buscar post por ID
router.get('/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Incrementar views
        await pool.query(
            'UPDATE blog_posts SET views = views + 1 WHERE id = $1',
            [id]
        );
        
        const result = await pool.query(
            `SELECT id, title, excerpt, content, image, author, category, views, created_at 
             FROM blog_posts 
             WHERE id = $1 AND published = true`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Post não encontrado' });
        }
        
        res.json({ success: true, post: result.rows[0] });
    } catch (error) {
        console.error('Erro ao buscar post:', error);
        res.status(500).json({ error: 'Erro ao buscar post' });
    }
});

// Buscar posts por categoria
router.get('/categories/:category', async (req, res) => {
    try {
        const { category } = req.params;
        
        const result = await pool.query(
            `SELECT id, title, excerpt, image, author, category, views, created_at 
             FROM blog_posts 
             WHERE category = $1 AND published = true 
             ORDER BY created_at DESC`,
            [category]
        );
        
        res.json({ success: true, posts: result.rows });
    } catch (error) {
        console.error('Erro ao buscar posts por categoria:', error);
        res.status(500).json({ error: 'Erro ao buscar posts' });
    }
});

module.exports = router;