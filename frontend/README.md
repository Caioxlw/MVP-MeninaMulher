# Frontend — Menina Mulher Lingerie 🌸

Aplicação web _mobile-first_ da **Menina Mulher**, construída com **React 19**, **Vite 8**, **TypeScript**, **Tailwind CSS v4** e **React Router**, seguindo a identidade visual oficial da marca e os requisitos de usabilidade e acessibilidade (`RNF01`, `RNF07`, `RNF08` — PBI #69).

---

## 🎨 Tema Oficial (`src/styles/theme.ts` e `src/index.css`)

Os tokens visuais da marca estão centralizados em [`src/styles/theme.ts`](./src/styles/theme.ts) e [`src/index.css`](./src/index.css):

- **Primária (Magenta)**: `#D1025A` (`bg-brand-primary`, `text-brand-primary`)
- **Títulos / Vinho Profundo**: `#520139` (`text-brand-plum`, `bg-brand-plum`)
- **Rosa Claro / Blush**: `#F5CCD0` (`bg-brand-blush`)
- **Superfície Clara**: `#FFFFFF` (`bg-brand-surface`)
- **Texto Secundário / Malva**: `#6F4F64` (`text-brand-muted`)
- **Tipografia**: _Playfair Display_ (`font-editorial`) para títulos e _Plus Jakarta Sans_ para corpo e controles.
- **Acessibilidade**: Área clicável mínima de `44px` (`min-h-[44px]` / `.touch-target`), contraste `>= 4,5:1` e suporte a telas a partir de `360px` sem rolagem horizontal.

---

## 🧩 Biblioteca de Componentes Base (`src/components/ui/`)

Todos os componentes base estão exportados em [`src/components/ui/index.ts`](./src/components/ui/index.ts):

### 1. Botão (`Button`)

```tsx
import { Button } from "./components/ui";

<Button variant="primary" onClick={handleConfirm}>
  Confirmar Pedido & Baixar Estoque
</Button>
<Button variant="secondary" onClick={handleCancel}>
  Voltar
</Button>
```

### 2. Campo de Texto (`Input`)

```tsx
import { Input } from "./components/ui";

<Input
  label="E-mail Corporativo"
  rightLabel="Proprietária"
  placeholder="contato@meninamulher.com.br"
  error={emailError}
/>;
```

### 3. Etiqueta de Status (`Badge`)

```tsx
import { Badge } from "./components/ui";

<Badge variant="available" dot>Disponível</Badge>
<Badge variant="lowStock">Últimas unidades</Badge>
<Badge variant="outOfStock">Esgotado</Badge>
```

### 4. Cartão de Produto (`ProductCard`)

```tsx
import { ProductCard } from "./components/ui";

<ProductCard
  id="sutia-renda-noir"
  name="Sutiã Renda Noir"
  category="Partes de Cima"
  subtitle="Toque aveludado e suave"
  price={119.9}
  installmentText="3x s/ juros"
  sizes={["P", "M", "G"]}
  colors={["#23101B", "#D1025A"]}
  badgeText="Destaque"
  stockStatus="available"
  onAction={(id) => navigate(`/produto/${id}`)}
/>;
```

### 5. Janela / Modal (`Modal`)

```tsx
import { Modal, Button } from "./components/ui";

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  subtitle="CONFIRMAÇÃO DE RESERVA • PEDIDO #1042"
  title="Confirmar Pedido & Baixa no Estoque"
  footer={
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Voltar
      </Button>
      <Button variant="primary" onClick={handleConfirm}>
        Sim, Confirmar Pedido
      </Button>
    </>
  }
>
  <p>Ao confirmar este pedido, as peças serão debitadas automaticamente do estoque.</p>
</Modal>;
```

### 6. Aviso Rápido (`Alert`)

```tsx
import { Alert } from "./components/ui";

<Alert variant="error" title="Credenciais não reconhecidas">
  E-mail ou senha incorretos. Verifique os dados digitados e tente novamente.
</Alert>;
```

### 7. Estado Vazio (`EmptyState`)

```tsx
import { EmptyState } from "./components/ui";

<EmptyState
  title="Tudo em harmonia"
  description="Apenas 2 pedidos aguardando seu carinho hoje."
  actionLabel="Ver Catálogo"
  onAction={() => navigate("/catalogo")}
/>;
```

## Gestão de Variações e Ajuste de Estoque (`/painel/estoque` — PBI #96)

- **Tela Administrativa**: `src/pages/admin/AdminStockScreen.tsx`
- **Serviço de Integração REST**: `src/services/stockApi.ts` (`/api/products/:productId/variants`)
- **Funcionalidades**:
  - **KPIs Dinâmicos**: Total de peças físicas, variações em alerta de baixo estoque (`<= 2 un.`), variações esgotadas (`0 un.`) e valor estimado em estoque.
  - **Ajuste Rápido (`-` / `+`)**: Botões acessíveis de no mínimo `44x44 px` (`RNF07`) com bloqueio automático de estoque negativo (`stock >= 0`, `RNF09`).
  - **Cadastro, Edição e Exclusão de Variações (`RF04`, `RF13`, `US10`)**: Normalização de tamanho em `UPPERCASE`, prevenção de duplicidade `(produto, tamanho, cor)` _case-insensitive_ e proteção contra exclusão de variações vinculadas a pedidos.
  - **Busca, Filtros por Status e Exportação CSV**: Filtros rápidos (`Todas`, `Estoque Regular`, `Baixo Estoque`, `Esgotadas`) e geração de planilha auditável.
