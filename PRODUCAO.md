# Instalação e publicação

## Instalação persistente no computador de desenvolvimento

A extensão carregada em `chrome://extensions` no modo do desenvolvedor permanece instalada entre reinicializações do Chrome. Não é necessário carregá-la novamente a cada uso. É necessário usar **Recarregar** somente quando os arquivos do código forem alterados.

Para instalar:

1. abra `chrome://extensions`;
2. ative **Modo do desenvolvedor**;
3. clique em **Carregar sem compactação**;
4. selecione a pasta `truthmeter-ai`.

O ícone da extensão agora abre ou alterna o overlay na aba do YouTube.

## Distribuição para outras pessoas

Para uma instalação normal, com atualização automática e sem modo do desenvolvedor, o pacote precisa ser enviado ao Chrome Web Store pelo painel oficial de desenvolvedores. Um ZIP hospedado em um site não pode instalar uma extensão automaticamente em um Chrome comum.

O arquivo a enviar é `truthmeter-ai-production.zip`. Antes da publicação, é necessário revisar a descrição, screenshots, política de privacidade e declaração de permissões. A extensão atual não captura áudio, não envia dados e usa apenas `storage` para a próxima etapa; isso deve ser declarado com precisão.

## Importante sobre o escopo atual

Este é o primeiro release instalável do overlay. Ele ainda usa afirmações demonstrativas locais e não executa transcrição, captura de áudio, identificação vocal ou verificação automática. O pacote está pronto para instalação persistente e validação com usuários, mas não deve ser apresentado como o produto completo descrito no PRD original.
