/**
 * Mapa central de rotas da Loja Pública e do Painel da Empresária (PBI #69).
 * Garante que o Painel fique em endereço separado (/painel/*) do site público.
 */
export const ROUTES = {
  store: {
    home: "/",
    catalog: "/catalogo",
    category: "/categoria/:slug",
    productDetail: "/produto/:id",
    bag: "/sacola",
    favorites: "/favoritos",
    profile: "/perfil",
    sizeGuide: "/guia-medidas",
  },
  admin: {
    root: "/painel",
    login: "/painel/login",
    orders: "/painel/pedidos",
    products: "/painel/produtos",
    newProduct: "/painel/produtos/novo",
    editProduct: "/painel/produtos/:id/editar",
    stock: "/painel/estoque",
  },
} as const;

export interface RouteDescriptor {
  path: string;
  title: string;
  subtitle: string;
  section: "store" | "admin";
}

export const STORE_ROUTE_DESCRIPTORS: RouteDescriptor[] = [
  {
    path: ROUTES.store.home,
    title: "Início — Boutique Menina Mulher",
    subtitle: "Feito para abraçar a sua essência com delicadeza e conforto.",
    section: "store",
  },
  {
    path: ROUTES.store.catalog,
    title: "Catálogo Exclusivo",
    subtitle: "Explore nossas peças em renda, microfibra e algodão do P ao GG.",
    section: "store",
  },
  {
    path: ROUTES.store.category,
    title: "Coleção por Categoria",
    subtitle: "Navegue pelas peças selecionadas desta categoria.",
    section: "store",
  },
  {
    path: ROUTES.store.productDetail,
    title: "Detalhes da Peça",
    subtitle: "Escolha o tamanho e a cor disponíveis no estoque em tempo real.",
    section: "store",
  },
  {
    path: ROUTES.store.bag,
    title: "Sacola de Compras",
    subtitle: "Confira suas peças selecionadas e envie seu pedido pelo WhatsApp.",
    section: "store",
  },
  {
    path: ROUTES.store.favorites,
    title: "Meus Favoritos",
    subtitle: "Peças que você salvou para escolher com calma.",
    section: "store",
  },
  {
    path: ROUTES.store.profile,
    title: "Perfil da Cliente",
    subtitle: "Suas medidas favoritas e histórico de pedidos no dispositivo.",
    section: "store",
  },
  {
    path: ROUTES.store.sizeGuide,
    title: "Guia de Medidas e Tamanhos",
    subtitle: "Acerte o tamanho ideal de busto, tórax, cintura e quadril.",
    section: "store",
  },
];

export const ADMIN_ROUTE_DESCRIPTORS: RouteDescriptor[] = [
  {
    path: ROUTES.admin.login,
    title: "Boas-vindas ao Painel de Gestão",
    subtitle: "Área administrativa exclusiva da boutique Menina Mulher.",
    section: "admin",
  },
  {
    path: ROUTES.admin.orders,
    title: "Gestão de Pedidos",
    subtitle: "Acompanhe pedidos recebidos via WhatsApp e confirme reservas com baixa automática.",
    section: "admin",
  },
  {
    path: ROUTES.admin.products,
    title: "Catálogo e Cadastro de Produtos",
    subtitle: "Gerencie peças, fotos, preços e visibilidade na vitrine virtual.",
    section: "admin",
  },
  {
    path: ROUTES.admin.newProduct,
    title: "Novo Produto",
    subtitle: "Cadastre fotos, nome, categoria, preço e grade inicial da peça.",
    section: "admin",
  },
  {
    path: ROUTES.admin.editProduct,
    title: "Editar Produto",
    subtitle: "Atualize informações, fotos, variações ou visibilidade do produto.",
    section: "admin",
  },
  {
    path: ROUTES.admin.stock,
    title: "Controle de Estoque",
    subtitle: "Ajuste quantidades por tamanho e cor de forma simples e rápida.",
    section: "admin",
  },
];
