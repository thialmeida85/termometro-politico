# Deploy do TruthMeter Voice API no Render

O serviço recebe um trecho de áudio em `POST /v1/identify` e retorna `flavio`, `lula` ou `unknown`. Também recebe cada nova legenda em `POST /v1/analyze-caption`, envia o texto à Groq e devolve classificação, justificativa e URLs de evidência. O endpoint `GET /health` informa se os perfis e a Groq estão configurados.

## Fluxo em tempo real

```text
legenda visível no YouTube
  → extensão envia POST /v1/analyze-caption
  → Render chama a Groq com GROQ_API_KEY
  → Groq extrai a afirmação e pesquisa evidências na web
  → API valida o formato e força INDETERMINADA quando não há evidência
  → extensão atualiza o status e o índice do HUD
```

O modelo padrão é `openai/gpt-oss-20b`, com a ferramenta `browser_search` habilitada por padrão. É possível alterar `GROQ_MODEL` e `GROQ_WEB_SEARCH` nas variáveis do Render. A chave nunca é enviada à extensão.

## Importante sobre os perfis

Os MP3s e o arquivo real de embeddings ficam fora do repositório. Nunca faça commit desses arquivos. No Render, o valor completo de `VOICEPRINTS_JSON` deve ser inserido como segredo no painel do serviço.

## Deploy via Blueprint

1. Crie um repositório privado com este projeto.
2. No Render, escolha **New → Blueprint**.
3. Selecione o repositório e confirme o `render.yaml`.
4. No serviço criado, preencha `VOICEPRINTS_JSON` com o conteúdo do arquivo privado `voiceprints.json`.
5. Preencha `GROQ_API_KEY` com a chave da Groq e faça um redeploy.
6. Abra `/health` e confirme `groq_configured: true`.

O Free Web Service pode dormir após inatividade e não deve ser tratado como SLA. O primeiro pedido depois de o serviço dormir pode demorar por causa do cold start.

## Teste local

```bash
uvicorn services.voice_api.app.main:app --reload --port 8000
curl http://localhost:8000/health
curl -F 'audio=@sample.mp3' http://localhost:8000/v1/identify
curl -X POST http://localhost:8000/v1/analyze-caption \
  -H 'Content-Type: application/json' \
  -d '{"caption":"A inflação caiu neste ano."}'
```

## Exemplo de resposta

```json
{
  "classification": "unknown",
  "scores": {"flavio": 0.61, "lula": 0.63},
  "winner_score": 0.63,
  "margin": 0.02,
  "threshold": 0.7,
  "required_margin": 0.08,
  "indeterminate": true
}
```

O serviço não deve atribuir uma voz por obrigação. Se a pontuação ou a margem forem insuficientes, a saída correta é `unknown`.
