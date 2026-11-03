# Menina Mulher: Catálogo Online e Pedidos via WhatsApp

## 1. Contexto do projeto

### 1.1 Identificação do projeto

- **Nome do projeto:** Menina Mulher: Catálogo Online e Pedidos via WhatsApp
- **Instituição e curso:** IFPE Campus Belo Jardim, Bacharelado em Engenharia de Software
- **Integrantes:** Caio Vinícius, Maria Letícia e Wellison Danniel
- **Turma:** 5º Período
- **Disciplina:** Gerência de Projetos de Software (Prof. Dr. Rogério Araújo)
- **Data:** 24/10/2026

### 1.2 Problema

O problema central é a experiência de venda: a Menina Mulher não oferece às clientes um canal visual, simples e automatizado para conhecer as peças e fazer o pedido.

| Pergunta                    | Resposta                                                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Qual é o problema?          | A venda depende de conversa e conferência manual por mensagem. Faltam um catálogo com fotos e um pedido já organizado, o que limita a experiência da cliente e a diferenciação da loja.                                        |
| Onde acontece?              | No atendimento de vendas da loja, principalmente pelo WhatsApp e no contato com clientes pelo celular.                                                                                                                         |
| Quem é afetado?             | A empresária, que monta e confere os pedidos manualmente, e as clientes, que têm um caminho de compra pouco interativo.                                                                                                        |
| Como é resolvido hoje?      | Os pedidos são tratados por conversa. O estoque é controlado com métodos básicos, como planilhas separadas: a empresária já testou uma ferramenta específica de gestão, mas a versão gratuita tinha funcionalidades limitadas. |
| Quais são as consequências? | Atendimento mais lento e repetitivo, risco de erro ao anotar tamanho, cor e quantidade, compra menos atrativa para a cliente e falta de um diferencial frente a outras lojas.                                                  |

O foco do projeto é melhorar a experiência de compra. Como a ferramenta gratuita que ela testou era limitada, o sistema também incluirá um controle de estoque simples, que substitui as planilhas separadas e dá baixa automática nas vendas confirmadas.

### 1.3 Usuários e público-alvo

| Perfil              | Quem é                                                    | Necessidades                                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usuário principal   | Clientes da loja, que compram principalmente pelo celular | Ver as peças com fotos, preço, tamanhos e cores. Montar o pedido com poucos toques. Saber o total antes de enviar. Falar com a loja sem repetir informações.                                    |
| Usuário secundário  | A empresária, dona da loja                                | Manter o catálogo atualizado sem conhecimento técnico. Receber pedidos completos e padronizados no WhatsApp. Controlar o estoque no próprio sistema, com baixa automática ao confirmar pedidos. |
| Demais stakeholders | Equipe de desenvolvimento e professor da disciplina       | Entregar um MVP viável dentro do prazo e avaliar o projeto.                                                                                                                                     |

### 1.4 Objetivo do projeto

**Objetivo geral:** desenvolver um site de catálogo (landing page) para a Menina Mulher que torne a compra mais fácil e interativa, com fotos, catálogo e carrinho, enviando o pedido pronto para o WhatsApp da loja e criando um diferencial para o negócio, com o controle de estoque da loja no mesmo sistema.

**Objetivos específicos:**

- Apresentar o catálogo com fotos, preços, tamanhos e cores, de forma confortável no celular.
- Permitir que a cliente monte o pedido em um carrinho com o total já calculado.
- Gerar automaticamente a mensagem do pedido, organizada, e abrir o WhatsApp da loja com ela preenchida.
- Oferecer à empresária um painel simples para manter produtos, fotos, preços e estoque.
- Dar à empresária o controle do estoque no próprio sistema, com baixa automática quando ela confirma um pedido, sem mudar sua rotina de vendas pelo WhatsApp.

### 1.5 Proposta da solução

A solução é um site da Menina Mulher, pensado primeiro para o celular, que funciona como vitrine e ponto de partida da venda. A cliente navega pelo catálogo, escolhe tamanho e cor, monta o carrinho e, com um toque, abre o WhatsApp da loja com o pedido já escrito: peças, tamanhos, cores, quantidades e total. A empresária deixa de montar e conferir cada pedido manualmente, e a loja ganha um diferencial: uma compra mais fácil, visual e interativa.

Por trás do site, um painel simples permite cadastrar produtos, fotos e preços e controlar o estoque de cada tamanho e cor. Quando a empresária confirma um pedido recebido no WhatsApp, o sistema debita as peças do estoque automaticamente e o site passa a mostrar a disponibilidade atualizada. Não há pagamento online: o fechamento da venda continua na conversa com a empresária.

**Tecnologias previstas:**

- **Front-end:** React.
- **Back-end:** Node.js com TypeScript.
- **Banco relacional (ex.: PostgreSQL):** produtos, variações de tamanho e cor, estoque e pedidos.
- **Armazenamento de mídia (ex.: S3 ou Cloudinary):** fotos e, se necessário, vídeos. O banco guarda apenas os links.
- **WhatsApp:** link de conversa com a mensagem do pedido já preenchida, sem usar a API paga do WhatsApp Business.

## 2. Escopo inicial

O escopo prioriza a experiência de compra da cliente e inclui um controle de estoque simples, ligado aos pedidos confirmados.

### Dentro do escopo

- Página inicial (landing page) com apresentação da loja e destaques.
- Catálogo online com fotos, descrição, preço, tamanhos e cores.
- Controle de estoque por tamanho e cor, com indicação de disponibilidade no site (disponível, últimas unidades ou esgotado).
- Carrinho de compras com total calculado.
- Mensagem do pedido gerada automaticamente e enviada ao WhatsApp da loja, com registro do pedido (número e status).
- Painel da empresária para cadastrar e editar produtos, fotos, preços e estoque, e para confirmar ou cancelar pedidos, com baixa automática no estoque.
- Guia de medidas e tamanhos (conteúdo estático).
- Versão responsiva, com foco no celular.

### Fora do escopo

- Pagamento online.
- Recursos avançados de estoque, como relatórios, alertas de reposição, fornecedores e custo das peças.
- Importação automática das planilhas de estoque (possível evolução futura).
- Login e cadastro de clientes.
- Cupons de desconto e avaliações de produtos.
- Provador virtual ou recomendador de tamanho, que depende das medidas de todas as peças.
- Vídeos nos produtos. A primeira versão usa apenas fotos.

## 3. Requisitos iniciais

Levantamento inicial com 15 requisitos funcionais e 9 não funcionais. Eles poderão ser refinados durante o desenvolvimento.

### 3.1 Requisitos funcionais

| ID   | O sistema deve                                                                                                                                                                                                     | Prioridade |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| RF01 | Exibir uma página inicial com apresentação da loja, contato e produtos em destaque.                                                                                                                                | Média      |
| RF02 | Exibir um catálogo com foto, nome, descrição e preço de cada produto.                                                                                                                                              | Alta       |
| RF03 | Permitir navegar pelos produtos por categoria.                                                                                                                                                                     | Média      |
| RF04 | Exibir o detalhe do produto, com várias fotos e as opções de tamanho e cor.                                                                                                                                        | Alta       |
| RF05 | Indicar a disponibilidade de cada tamanho e cor (disponível, últimas unidades ou esgotado), calculada a partir do estoque, e impedir que uma opção esgotada seja adicionada ao carrinho.                           | Alta       |
| RF06 | Possuir um carrinho em que a cliente adiciona, remove e altera a quantidade dos itens.                                                                                                                             | Alta       |
| RF07 | Calcular e exibir o valor total do pedido no carrinho.                                                                                                                                                             | Alta       |
| RF08 | Gerar uma mensagem organizada com número do pedido, itens, tamanhos, cores, quantidades e total.                                                                                                                   | Alta       |
| RF09 | Abrir o WhatsApp da loja com a mensagem do pedido já preenchida.                                                                                                                                                   | Alta       |
| RF10 | Exibir um guia de medidas e tamanhos.                                                                                                                                                                              | Média      |
| RF11 | Autenticar a empresária para acessar o painel administrativo.                                                                                                                                                      | Alta       |
| RF12 | Permitir à empresária cadastrar, editar e ocultar produtos, com fotos e preço.                                                                                                                                     | Alta       |
| RF13 | Permitir à empresária cadastrar os tamanhos e as cores de cada produto, informar a quantidade em estoque de cada um e ajustá-la manualmente, por exemplo após uma venda na loja física ou a chegada de mercadoria. | Alta       |
| RF14 | Registrar cada pedido enviado, com número único e status pendente, e listá-lo no painel da empresária.                                                                                                             | Alta       |
| RF15 | Permitir à empresária confirmar ou cancelar um pedido. Ao confirmar, debitar automaticamente do estoque as peças do pedido e avisá-la se a quantidade for insuficiente.                                            | Alta       |

### 3.2 Requisitos não funcionais

| ID    | Categoria             | O sistema deve                                                                                                                   |
| ----- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| RNF01 | Responsividade        | Ser projetado primeiro para o celular e funcionar em telas a partir de 360 px de largura.                                        |
| RNF02 | Desempenho            | Carregar a página do catálogo em até 3 segundos em conexão 4G, com imagens otimizadas.                                           |
| RNF03 | Usabilidade (cliente) | Permitir enviar o pedido ao WhatsApp com no máximo 2 toques a partir do carrinho.                                                |
| RNF04 | Usabilidade (painel)  | Permitir que a empresária cadastre um produto em até 3 minutos e confirme um pedido em até 2 cliques, sem conhecimento técnico.  |
| RNF05 | Segurança             | Proteger o painel da empresária com login e senha, guardar as senhas com hash e usar conexão HTTPS.                              |
| RNF06 | Privacidade           | Não armazenar dados pessoais das clientes: o pedido registra apenas os itens e o número, já que não há cadastro de clientes.     |
| RNF07 | Acessibilidade        | Ter contraste adequado, texto alternativo nas imagens e fontes legíveis.                                                         |
| RNF08 | Custo                 | Usar tecnologias de baixo custo ou planos gratuitos de hospedagem e armazenamento no MVP.                                        |
| RNF09 | Integridade dos dados | Garantir que a baixa de estoque seja correta, mesmo com pedidos confirmados quase ao mesmo tempo, sem permitir estoque negativo. |

## 4. Persona

Com o foco na experiência de compra, a persona principal é a cliente. A empresária é a persona secundária, porque é ela quem mantém o catálogo e recebe os pedidos.

### Persona principal: a cliente

| Campo                  | Descrição                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nome fictício          | Camila Ferreira                                                                                                                                                                                         |
| Idade                  | 27 anos                                                                                                                                                                                                 |
| Ocupação e contexto    | Assistente administrativa. Usa o celular para quase tudo e conversa muito pelo WhatsApp. Prefere escolher peças íntimas com calma e privacidade, fora do horário de atendimento da loja.                |
| Objetivos              | Escolher peças bonitas e confortáveis, comprar sem sair de casa e fechar o pedido de forma rápida.                                                                                                      |
| Necessidades           | Ver fotos de cada peça. Saber quais tamanhos e cores existem. Consultar um guia de medidas. Ver o total antes de enviar. Enviar o pedido sem digitar tudo.                                              |
| Dificuldades e dores   | Precisa pedir fotos e informações por mensagem e esperar a resposta. Tem dúvida sobre o tamanho certo. Não sabe se a peça existe na cor e no tamanho que quer. Desiste quando o processo fica demorado. |
| Relação com o problema | É quem usa o site. Se a compra não for simples e atrativa, ela não conclui o pedido. A facilidade para ela é o diferencial que o projeto busca.                                                         |

### Persona secundária: a empresária

| Campo                  | Descrição                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nome fictício          | Joana Santos                                                                                                                                                                                                 |
| Idade                  | 38 anos                                                                                                                                                                                                      |
| Ocupação e contexto    | Dona de uma pequena loja de moda íntima. Trabalha no balcão e no atendimento digital ao mesmo tempo. Controla o estoque em planilhas separadas.                                                              |
| Objetivos              | Aumentar as vendas online, oferecer uma experiência diferente das outras lojas e organizar o atendimento e o estoque sem sistemas difíceis.                                                                  |
| Necessidades           | Atualizar o catálogo com facilidade. Receber pedidos completos e padronizados no WhatsApp. Controlar o estoque no próprio sistema, com baixa automática ao confirmar pedidos. Usar o painel sem treinamento. |
| Dificuldades e dores   | Já testou uma ferramenta de gestão de estoque, mas a versão gratuita tinha funcionalidades limitadas e ela voltou às planilhas. Monta e confere cada pedido manualmente enquanto atende no balcão.           |
| Relação com o problema | Se o painel for trabalhoso, ela deixa de atualizar o catálogo e o estoque, e o site perde valor. Por isso o painel precisa ser simples.                                                                      |

## 5. User Stories

Doze histórias iniciais, ligadas aos requisitos funcionais da seção 3.1, para montar e priorizar o Product Backlog.

| ID   | User Story                                                                                                                                              | Requisitos |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| US01 | Como cliente, quero ver o catálogo com fotos, para escolher as peças que mais me agradam sem precisar pedir imagens por mensagem.                       | RF02, RF04 |
| US02 | Como cliente, quero navegar por categorias, para encontrar rápido o tipo de peça que procuro.                                                           | RF03       |
| US03 | Como cliente, quero ver os tamanhos e as cores disponíveis de cada peça, para não escolher uma opção que não existe.                                    | RF04, RF05 |
| US04 | Como cliente, quero consultar um guia de medidas, para escolher o tamanho certo com mais segurança.                                                     | RF10       |
| US05 | Como cliente, quero adicionar peças a um carrinho e ver o total, para saber quanto vou gastar antes de enviar o pedido.                                 | RF06, RF07 |
| US06 | Como cliente, quero enviar o pedido ao WhatsApp da loja com um toque, com a mensagem já pronta, para não precisar digitar tudo de novo.                 | RF08, RF09 |
| US07 | Como cliente, quero ver uma página inicial que apresente a loja, para sentir confiança antes de comprar.                                                | RF01       |
| US08 | Como empresária, quero receber os pedidos de forma padronizada no WhatsApp, para atender mais rápido e sem erro de anotação.                            | RF08       |
| US09 | Como empresária, quero cadastrar produtos com fotos e preço em um painel simples, para manter o catálogo sem ajuda técnica.                             | RF11, RF12 |
| US10 | Como empresária, quero informar a quantidade em estoque de cada tamanho e cor, para que as clientes só escolham o que posso entregar.                   | RF13       |
| US11 | Como empresária, quero editar ou ocultar um produto a qualquer momento, para manter o catálogo sempre atualizado.                                       | RF12       |
| US12 | Como empresária, quero confirmar um pedido recebido e ter o estoque debitado automaticamente, para manter o controle sem refazer a conta nas planilhas. | RF14, RF15 |

## 6. MVP — Produto Mínimo Viável

O MVP é o menor conjunto de funcionalidades que permite testar a proposta: a cliente conhece as peças no site e envia o pedido pronto ao WhatsApp da loja. Sem pagamento online e com um controle de estoque simples, o desenvolvimento deve caber no tempo da disciplina.

### Funcionalidades indispensáveis

1. Catálogo com fotos, preço, tamanhos e cores (RF02, RF04).
2. Controle de estoque por tamanho e cor, com indicação de disponibilidade no site que bloqueia opções esgotadas (RF05, RF13).
3. Carrinho com o total calculado (RF06, RF07).
4. Mensagem do pedido gerada automaticamente e enviada ao WhatsApp da loja (RF08, RF09).
5. Registro dos pedidos e confirmação pela empresária, com baixa automática no estoque (RF14, RF15).
6. Painel simples, protegido por login, para cadastrar e editar produtos, fotos e estoque (RF11, RF12, RF13).
7. Guia de medidas e tamanhos (RF10).

A página inicial (RF01) e a navegação por categorias (RF03) entram em versão simples, e só crescem se sobrar tempo.

### Como saberemos que o MVP funcionou

- A cliente envia um pedido ao WhatsApp com no máximo 2 toques a partir do carrinho.
- A empresária recebe o pedido completo, sem precisar pedir tamanho, cor ou quantidade de novo.
- Ao confirmar um pedido, a empresária vê o estoque das peças debitado automaticamente e o site mostra a disponibilidade atualizada.
- A empresária cadastra um produto em até 3 minutos, sem ajuda da equipe.

## 7. Método de trabalho

**Abordagem escolhida:** Scrum adaptado, com sprints quinzenais e um quadro Kanban (A fazer, Em andamento, Concluído) para acompanhar as tarefas.

**Justificativa:** o Scrum permite entregar o MVP em partes e mostrar cada parte à empresária ao fim da sprint, para ajustar o que não ficou claro antes de seguir. Isso reduz o risco de construir algo que ela não usaria. O quadro Kanban deixa o andamento visível para uma equipe pequena, de três pessoas.

### Como vamos aplicar

- O Product Backlog nasce das user stories da seção 5, ordenadas por prioridade.
- Cada sprint começa com um planejamento curto, em que a equipe escolhe as histórias que cabem em duas semanas.
- Ao fim da sprint, há uma revisão com a empresária, que valida as entregas e indica prioridades.
- A retrospectiva fecha a sprint, com ajustes no jeito de trabalhar.
- O acompanhamento semanal em sala serve como ponto de orientação com o professor.

Se a equipe perceber que outra abordagem funciona melhor, a escolha poderá mudar.

## 8. Equipe e responsabilidades

| Nome             | Responsabilidades iniciais       | Principais atividades                                                                                                                                                                     |
| ---------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caio Vinícius    | Desenvolvedor back-end           | Criar a API em Node.js com TypeScript, modelar o banco relacional, proteger o painel com login e controlar o estoque por tamanho e cor e a baixa automática na confirmação dos pedidos.   |
| Maria Letícia    | UI/UX e desenvolvedora front-end | Prototipar as telas pensando primeiro no celular, construir em React o catálogo, o carrinho e o painel, e cuidar do guia de medidas e da acessibilidade.                                  |
| Wellison Danniel | Integrações e testes             | Gerar a mensagem e o link do WhatsApp, ligar o armazenamento das fotos, montar o fluxo do carrinho e do registro do pedido e executar os testes funcionais, incluindo a baixa de estoque. |

As responsabilidades podem ser compartilhadas e mudar durante o projeto. Backlog, documentação e revisões com a empresária são tarefas dos três.

## 9. Riscos iniciais

Sete riscos iniciais, com probabilidade e impacto classificados como Baixa, Média ou Alta.

| Risco                                                                                                                                                                                                                                            | Probabilidade | Impacto | Ação                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Falta de tempo para concluir o MVP                                                                                                                                                                                                               | Alta          | Alto    | Priorizar as funcionalidades indispensáveis da seção 6 e manter a página inicial e as categorias simples.                                                                    |
| Baixa adesão da empresária ao painel, deixando o catálogo parado                                                                                                                                                                                 | Média         | Alto    | Manter o cadastro rápido, validar o painel com ela a cada sprint e agendar as revisões com antecedência.                                                                     |
| Estoque do sistema diferente do estoque físico, por exemplo quando uma venda na loja física não é registrada ou a empresária esquece de confirmar um pedido                                                                                      | Alta          | Alto    | Facilitar o ajuste manual do estoque em poucos toques, mostrar no painel os pedidos pendentes e orientar uma rotina curta de conferência entre o sistema e o estoque físico. |
| Dificuldades técnicas de implementação: configurar Node.js com TypeScript, modelar tamanhos e cores no banco, garantir a baixa de estoque correta quando há pedidos simultâneos, carregar muitas fotos sem lentidão e controlar o custo da mídia | Média         | Alto    | Pesquisar e testar cada tecnologia no início com um protótipo pequeno, otimizar as imagens e começar só com fotos, deixando os vídeos para depois.                           |
| Dependência do WhatsApp, por exemplo se o número ficar sobrecarregado ou bloqueado                                                                                                                                                               | Baixa         | Alto    | Padronizar a mensagem do pedido e exibir na página inicial um contato alternativo.                                                                                           |
| Fotos de baixa qualidade, que reduzem o valor do catálogo                                                                                                                                                                                        | Média         | Médio   | Entregar à empresária um guia rápido de fotografia (luz, fundo e ângulos) e redimensionar as imagens automaticamente.                                                        |
| Esforço inicial para cadastrar produtos e estoque que hoje estão nas planilhas                                                                                                                                                                   | Média         | Médio   | Fazer o cadastro inicial junto com a empresária nas primeiras sprints e avaliar a importação das planilhas depois.                                                           |

## 10. Visão geral do projeto

| Elemento                   | Definição                                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projeto                    | Menina Mulher: Catálogo Online e Pedidos via WhatsApp                                                                                                                                                                         |
| Problema                   | A venda depende de conversa e conferência manual, sem catálogo visual nem pedido organizado. A empresária controla o estoque em planilhas separadas, porque a versão gratuita da ferramenta que testou era limitada.          |
| Público-alvo               | Clientes da loja (usuário principal) e a empresária (usuário secundário).                                                                                                                                                     |
| Solução                    | Site de catálogo (landing page) pensado para o celular, com carrinho que envia o pedido pronto ao WhatsApp e um painel simples para a empresária manter o catálogo, controlar o estoque e confirmar pedidos.                  |
| Objetivo                   | Tornar a compra mais fácil e interativa e dar à loja um diferencial, com pedidos automatizados e organizados no WhatsApp, e dar à empresária o controle do estoque com baixa automática.                                      |
| MVP                        | Catálogo com fotos, estoque por tamanho e cor com baixa automática na confirmação do pedido, carrinho, envio ao WhatsApp, painel simples e guia de medidas, sem pagamento online.                                             |
| Principais funcionalidades | Catálogo com fotos. Escolha de tamanho e cor. Carrinho com total. Mensagem automática para o WhatsApp. Painel de cadastro de produtos e de confirmação de pedidos. Controle de estoque com baixa automática. Guia de medidas. |
| Método de trabalho         | Scrum adaptado, com sprints quinzenais e quadro Kanban.                                                                                                                                                                       |
| Principais riscos          | Falta de tempo, baixa adesão ao painel, estoque do sistema diferente do físico, dificuldades técnicas e dependência do WhatsApp.                                                                                              |
