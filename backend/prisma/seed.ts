import crypto from "crypto";
import { OrderStatus, PrismaClient, Role } from "@prisma/client";

const defaultPrisma = new PrismaClient();

function createDeterministicPasswordHash(plainPassword: string): string {
  const salt = "menina_mulher_seed_salt";
  const derived = crypto.scryptSync(plainPassword, salt, 32).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export async function seedDatabase(client: PrismaClient = defaultPrisma): Promise<void> {
  // 1. Usuária Administradora (Empresária - RF11, RNF05)
  await client.user.upsert({
    where: { email: "joana@meninamulher.com" },
    update: {
      name: "Joana Santos",
      role: Role.ADMIN,
      active: true,
    },
    create: {
      name: "Joana Santos",
      email: "joana@meninamulher.com",
      passwordHash: createDeterministicPasswordHash("MeninaMulher@2026"),
      role: Role.ADMIN,
      active: true,
    },
  });

  // 2. Categorias iniciais (RF03, US02)
  const categoriesData = [
    { name: "Conjuntos", slug: "conjuntos" },
    { name: "Sutiãs", slug: "sutias" },
    { name: "Calcinhas", slug: "calcinhas" },
    { name: "Pijamas & Baby Doll", slug: "pijamas-baby-doll" },
  ];

  const categoriesBySlug: Record<string, { id: string }> = {};
  for (const cat of categoriesData) {
    const saved = await client.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
    categoriesBySlug[cat.slug] = saved;
  }

  // 3. Produtos, Imagens e Variações com cenários de estoque: disponível, últimas unidades e esgotado
  const productsSeed = [
    {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Conjunto Renda Aurora",
      description: "Conjunto em renda floral macia com bojo estruturado e calcinha fio duplo.",
      price: "89.90",
      active: true,
      featured: true,
      categoryId: categoriesBySlug["conjuntos"].id,
      images: [
        {
          url: "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?auto=format&fit=crop&w=800&q=80",
          altText: "Conjunto Renda Aurora Vermelho Rubi - Frente",
          position: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&w=800&q=80",
          altText: "Conjunto Renda Aurora Vermelho Rubi - Detalhe Renda",
          position: 1,
        },
      ],
      variants: [
        { size: "P", color: "Vermelho Rubi", stock: 8 }, // Disponível
        { size: "M", color: "Vermelho Rubi", stock: 2 }, // Últimas unidades
        { size: "G", color: "Preto", stock: 0 }, // Esgotado
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      name: "Sutiã Push-Up Pérola",
      description: "Sutiã em microfibra com alças ajustáveis e acabamento acetinado.",
      price: "59.90",
      active: true,
      featured: true,
      categoryId: categoriesBySlug["sutias"].id,
      images: [
        {
          url: "https://images.unsplash.com/photo-1616150638538-ffb0679a3fc4?auto=format&fit=crop&w=800&q=80",
          altText: "Sutiã Push-Up Pérola Branco",
          position: 0,
        },
      ],
      variants: [
        { size: "M", color: "Branco", stock: 6 }, // Disponível
        { size: "G", color: "Nude", stock: 1 }, // Últimas unidades
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      name: "Baby Doll Cetim Noite",
      description: "Conjunto curto de cetim com toque sedoso e detalhes em renda no decote.",
      price: "74.90",
      active: true,
      featured: false,
      categoryId: categoriesBySlug["pijamas-baby-doll"].id,
      images: [
        {
          url: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80",
          altText: "Baby Doll Cetim Noite Rosa Chá",
          position: 0,
        },
      ],
      variants: [
        { size: "P", color: "Rosa Chá", stock: 5 }, // Disponível
        { size: "M", color: "Rosa Chá", stock: 0 }, // Esgotado
      ],
    },
    {
      id: "00000000-0000-4000-8000-000000000004",
      name: "Calcinha Fio Conforto (Coleção Anterior)",
      description: "Modelo em algodão egípcio atualmente oculto do catálogo público.",
      price: "29.90",
      active: false, // Oculto (RF12, US11)
      featured: false,
      categoryId: categoriesBySlug["calcinhas"].id,
      images: [
        {
          url: "https://images.unsplash.com/photo-1583846783214-7229a91b20ed?auto=format&fit=crop&w=800&q=80",
          altText: "Calcinha Fio Conforto Preta",
          position: 0,
        },
      ],
      variants: [{ size: "M", color: "Preto", stock: 4 }],
    },
  ];

  for (const prod of productsSeed) {
    await client.product.upsert({
      where: { id: prod.id },
      update: {
        name: prod.name,
        description: prod.description,
        price: prod.price,
        active: prod.active,
        featured: prod.featured,
        categoryId: prod.categoryId,
      },
      create: {
        id: prod.id,
        name: prod.name,
        description: prod.description,
        price: prod.price,
        active: prod.active,
        featured: prod.featured,
        categoryId: prod.categoryId,
      },
    });

    await client.productImage.deleteMany({ where: { productId: prod.id } });
    await client.productImage.createMany({
      data: prod.images.map((img) => ({
        productId: prod.id,
        url: img.url,
        altText: img.altText,
        position: img.position,
      })),
    });

    for (const v of prod.variants) {
      await client.productVariant.upsert({
        where: {
          productId_size_color: {
            productId: prod.id,
            size: v.size,
            color: v.color,
          },
        },
        update: { stock: v.stock },
        create: {
          productId: prod.id,
          size: v.size,
          color: v.color,
          stock: v.stock,
        },
      });
    }
  }

  // 4. Pedidos iniciais de exemplo (PENDING, CONFIRMED, CANCELLED) - idempotente por ID fixo
  const variantAuroraP = await client.productVariant.findUniqueOrThrow({
    where: {
      productId_size_color: {
        productId: "00000000-0000-4000-8000-000000000001",
        size: "P",
        color: "Vermelho Rubi",
      },
    },
  });

  const variantPerolaM = await client.productVariant.findUniqueOrThrow({
    where: {
      productId_size_color: {
        productId: "00000000-0000-4000-8000-000000000002",
        size: "M",
        color: "Branco",
      },
    },
  });

  const ordersSeed = [
    {
      id: "00000000-0000-4000-9000-000000000001",
      status: OrderStatus.PENDING,
      totalAmount: "149.80",
      items: [
        { variantId: variantAuroraP.id, quantity: 1, unitPrice: "89.90" },
        { variantId: variantPerolaM.id, quantity: 1, unitPrice: "59.90" },
      ],
    },
    {
      id: "00000000-0000-4000-9000-000000000002",
      status: OrderStatus.CONFIRMED,
      totalAmount: "89.90",
      items: [{ variantId: variantAuroraP.id, quantity: 1, unitPrice: "89.90" }],
    },
    {
      id: "00000000-0000-4000-9000-000000000003",
      status: OrderStatus.CANCELLED,
      totalAmount: "59.90",
      items: [{ variantId: variantPerolaM.id, quantity: 1, unitPrice: "59.90" }],
    },
  ];

  for (const ord of ordersSeed) {
    await client.order.upsert({
      where: { id: ord.id },
      update: {
        status: ord.status,
        totalAmount: ord.totalAmount,
      },
      create: {
        id: ord.id,
        status: ord.status,
        totalAmount: ord.totalAmount,
      },
    });

    await client.orderItem.deleteMany({ where: { orderId: ord.id } });
    await client.orderItem.createMany({
      data: ord.items.map((item) => ({
        orderId: ord.id,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
  }
}

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      console.log("🌱 Seed do banco de dados Menina Mulher concluído com sucesso!");
      await defaultPrisma.$disconnect();
    })
    .catch(async (error) => {
      console.error("❌ Erro ao executar seed do banco de dados:", error);
      await defaultPrisma.$disconnect();
      process.exit(1);
    });
}
