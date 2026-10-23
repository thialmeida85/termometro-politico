# TruthMeter AI — Protótipo local

Primeira versão visual do TruthMeter AI. Não usa API, backend, banco remoto, captura de áudio ou reconhecimento biométrico. Os dados são simulados para validar a experiência da extensão.

## Instalação no Chrome

1. Abra `chrome://extensions`.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta deste projeto: `truthmeter-ai`.
5. Abra ou recarregue um vídeo em `youtube.com`.
6. O painel aparece no canto superior direito do player/página.

## O que já funciona

- Overlay com Shadow DOM para não misturar estilos com o YouTube.
- Painéis de Pessoa 1 e Pessoa 2.
- Velocímetro com índice de evidência.
- Classificações: corroborada, contradita, parcial e indeterminada.
- Histórico de afirmações com timestamps.
- Clique numa afirmação para navegar no vídeo.
- Sincronização automática com o tempo do vídeo quando ele está entre os timestamps simulados.
- Pausar/retomar a análise visual.
- Minimizar, fechar e reabrir o painel.
- Marcar uma afirmação como revisada.
- Layout responsivo e `prefers-reduced-motion`.

## Limitações intencionais

- O conteúdo é demonstrativo e está definido no início de `content.js`.
- Nenhuma afirmação é extraída automaticamente.
- Nenhum áudio é capturado ou enviado.
- As fontes são URLs exemplificativas e devem ser substituídas por evidências reais numa próxima versão.
- O número central é um índice demonstrativo, não uma probabilidade de verdade.

## Próximo passo técnico

Substituir o array `claims` por um importador de JSON/SRT e adicionar revisão manual das afirmações. Depois disso, pode ser criado um backend FastAPI local, mantendo esta extensão como cliente.
