import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";

export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024; // Limite de 10 Megabytes (PBI #17)

export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/pjpeg", "image/png", "image/webp"];

export const INVALID_FILE_FORMAT_MESSAGE =
  "Formato de arquivo inválido. Apenas JPG, PNG e WEBP são permitidos.";
export const FILE_TOO_LARGE_MESSAGE = "O arquivo excede o tamanho máximo permitido de 10 MB.";

// 1. Configuração de Armazenamento em Disco
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.resolve(__dirname, "../../uploads");
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
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
  if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(INVALID_FILE_FORMAT_MESSAGE));
  }
};

// 3. Instância do Multer com as regras configuradas (até 10 MB)
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
  },
});

/**
 * Middleware que processa upload opcional/único no campo `image` e converte
 * erros de limite (10 MB) ou formato inválido em resposta HTTP 400 amigável.
 */
export function handleUploadSingleImage(req: Request, res: Response, next: NextFunction): void {
  const middleware = upload.single("image");
  middleware(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: FILE_TOO_LARGE_MESSAGE });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }

    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }

    res.status(400).json({ error: "Não foi possível processar o arquivo enviado." });
  });
}
