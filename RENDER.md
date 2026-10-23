# Deploy do TruthMeter Voice API no Render

O serviço recebe um trecho de áudio em `POST /v1/identify` e retorna `flavio`, `lula` ou `unknown`. O endpoint `GET /health` informa se os perfis foram carregados.

## Importante sobre os perfis

Os MP3s e o arquivo real de embeddings ficam fora do repositório. Nunca faça commit desses arquivos. No Render, o valor completo de `VOICEPRINTS_JSON` deve ser inserido como segredo no painel do serviço.

## Deploy via Blueprint

1. Crie um repositório privado com este projeto.
2. No Render, escolha **New → Blueprint**.
3. Selecione o repositório e confirme o `render.yaml`.
4. No serviço criado, preencha `VOICEPRINTS_JSON` com o conteúdo do arquivo privado `voiceprints.json`.
5. Faça um redeploy e abra `/health`.

O Free Web Service pode dormir após inatividade e não deve ser tratado como SLA. O primeiro pedido depois de o serviço dormir pode demorar por causa do cold start.

## Teste local

```bash
uvicorn services.voice-api.app.main:app --reload --port 8000
curl http://localhost:8000/health
curl -F 'audio=@sample.mp3' http://localhost:8000/v1/identify
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
