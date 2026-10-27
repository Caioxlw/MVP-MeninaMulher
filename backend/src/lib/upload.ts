import multer from "multer";
import path from "path";
import crypto from "crypto";

// 1. Configuração de Armazenamento em Disco
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(__dirname, "../../uploads"));
  },
  filename: (_req, file, cb) => {
    const hash = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname);
    const fileName = `${Date.now()}-${hash}${ext}`;
    cb(null, fileName);
  },
});

// 2. Filtro de Segurança: Apenas imagens permitidas
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/pjpeg",
    "image/png",
    "image/webp",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Formato de arquivo inválido. Apenas JPG, PNG e WEBP são permitidos."));
  }
};

// 3. Instância do Multer com as regras configuradas
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5 Megabytes
  },
});
