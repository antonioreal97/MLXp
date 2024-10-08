import express from 'express';
import ollama from 'ollama'; // Certifique-se que o Ollama está instalado e importado corretamente

const app = express();
const router = express.Router();

app.use(express.json());

router.post('/ask-query', async (req, res) => {
  const { query } = req.body;

  try {
    const response = await ollama.chat({
      model: 'llama3', // Use o modelo que você deseja, como 'llama3'
      messages: [{ role: 'user', content: query }],
    });

    res.json({ reply: response.message.content });
  } catch (error) {
    console.error('Erro ao interagir com o modelo:', error);
    res.status(500).send({ error: 'Erro ao interagir com o modelo' });
  }
});

app.use('/api', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
